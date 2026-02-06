import sys
import os
import numpy as np
from fastapi import FastAPI, UploadFile, File, HTTPException
from pydantic import BaseModel
from PIL import Image
import io

# ---------------------------------------------------------------------------
# Path bootstrap – make sure sibling packages (utils) are importable whether
# the process is launched from the repo root or from python-ml-service/.
# ---------------------------------------------------------------------------
_SERVICE_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if _SERVICE_ROOT not in sys.path:
    sys.path.insert(0, _SERVICE_ROOT)

from utils.config import BOARD_MODEL_PATH, PIECE_MODEL_PATH   # noqa: E402
from utils.image_utils import fetch_frame_from_url             # noqa: E402
from app.detector import ChessDetector                         # noqa: E402

# ---------------------------------------------------------------------------
# FastAPI app & singleton detector
# ---------------------------------------------------------------------------
app = FastAPI(title="Chess ML Microservice", version="1.0.0")

# Global singleton – loaded exactly once when the worker starts.
_detector: ChessDetector | None = None


def _get_detector() -> ChessDetector:
    """Return the singleton ChessDetector, creating it on first access."""
    global _detector
    if _detector is None:
        _detector = ChessDetector(
            board_model_path=BOARD_MODEL_PATH,
            piece_model_path=PIECE_MODEL_PATH,
        )
    return _detector


# ---------------------------------------------------------------------------
# Helper – turn an UploadFile into an OpenCV-compatible numpy array (BGR)
# ---------------------------------------------------------------------------
async def _upload_to_bgr(file: UploadFile) -> np.ndarray:
    data = await file.read()
    pil_img = Image.open(io.BytesIO(data)).convert("RGB")
    rgb_array = np.array(pil_img)
    # PIL gives RGB; OpenCV convention is BGR.
    bgr_array = rgb_array[..., ::-1].copy()
    return bgr_array


# ---------------------------------------------------------------------------
# Pydantic schemas
# ---------------------------------------------------------------------------
class UrlPayload(BaseModel):
    url: str


class BoardDetectionResponse(BaseModel):
    detected: bool
    bbox: list[int] | None = None
    confidence: float | None = None


class PieceDetection(BaseModel):
    class_name: str
    bbox: list[float]
    confidence: float


class MappedPiece(BaseModel):
    piece: str
    square: str
    confidence: float


class FullPipelineResponse(BaseModel):
    fen: str | None
    board_detected: bool
    pieces: list[MappedPiece]
    errors: list[str]


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------
@app.get("/health")
async def health():
    """Liveness / readiness probe."""
    # Attempt to access the detector to check if models are loaded.
    det = _get_detector()
    models_loaded = det.board_model is not None and det.piece_model is not None
    return {"status": "ok", "models_loaded": models_loaded}


@app.post("/detect/board", response_model=BoardDetectionResponse)
async def detect_board(file: UploadFile = File(...)):
    """Upload an image; returns the bounding box of the chessboard."""
    image = await _upload_to_bgr(file)
    detector = _get_detector()
    result = detector.detect_board(image)
    return result


@app.post("/detect/pieces", response_model=list[PieceDetection])
async def detect_pieces(file: UploadFile = File(...)):
    """Upload an image; returns detected pieces with bboxes and confidences."""
    image = await _upload_to_bgr(file)
    detector = _get_detector()
    pieces = detector.detect_pieces(image)
    return pieces


@app.post("/detect/full", response_model=FullPipelineResponse)
async def detect_full(file: UploadFile = File(...)):
    """
    Upload an image and run the complete pipeline:
    board detection -> perspective warp -> piece detection ->
    square mapping -> FEN generation.
    """
    image = await _upload_to_bgr(file)
    detector = _get_detector()
    return detector.full_pipeline(image)


@app.post("/detect/from_url", response_model=FullPipelineResponse)
async def detect_from_url(payload: UrlPayload):
    """
    Fetch a frame from an IPWebcam (or any image URL) and run the full
    pipeline on it.  Body: { "url": "<image-url>" }
    """
    try:
        image = fetch_frame_from_url(payload.url)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Failed to fetch frame: {exc}")

    detector = _get_detector()
    return detector.full_pipeline(image)

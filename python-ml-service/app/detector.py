"""
ChessDetector – wraps the two YOLOv8 models (board & piece) and exposes the
full end-to-end detection pipeline.
"""

import numpy as np
from ultralytics import YOLO

from app.board_geometry import perspective_correction, map_pieces_to_squares
from app.fen_generator import generate_fen, validate_fen


class ChessDetector:
    """Singleton-friendly detector.  Instantiate once; reuse forever."""

    # ---------------------------------------------------------------
    # Canonical piece class names expected from the piece model.
    # Used for documentation / sanity checks; the actual labels come
    # from the model's trained dataset.
    # ---------------------------------------------------------------
    PIECE_CLASSES = [
        "black_bishop", "black_king", "black_knight",
        "black_pawn", "black_queen", "black_rook",
        "white_bishop", "white_king", "white_knight",
        "white_pawn", "white_queen", "white_rook",
    ]

    def __init__(self, board_model_path: str, piece_model_path: str) -> None:
        """
        Load both YOLOv8 models from disk.

        Parameters
        ----------
        board_model_path : str
            Path to the trained board-detection .pt weights file.
        piece_model_path : str
            Path to the trained piece-detection .pt weights file.
        """
        self.board_model: YOLO = YOLO(board_model_path)
        self.piece_model: YOLO = YOLO(piece_model_path)

    # -----------------------------------------------------------
    # Board detection
    # -----------------------------------------------------------
    def detect_board(self, image: np.ndarray) -> dict:
        """
        Run the board-detection model on *image*.

        Returns
        -------
        dict
            {
                "detected":   bool,
                "bbox":       [x1, y1, x2, y2] | None,   # pixel coords
                "confidence": float | None
            }
        """
        results = self.board_model.predict(image, conf=0.5)

        # `results` is a list with one Results object per image.
        # We only ever pass a single image.
        if len(results) == 0 or len(results[0].boxes) == 0:
            return {"detected": False, "bbox": None, "confidence": None}

        # Take the box with the highest confidence.
        boxes = results[0].boxes
        best_idx = int(boxes.conf.argmax())
        bbox = boxes.xyxy[best_idx].cpu().numpy().tolist()          # [x1,y1,x2,y2]
        confidence = float(boxes.conf[best_idx].cpu().numpy())

        return {
            "detected": True,
            "bbox": [int(round(v)) for v in bbox],
            "confidence": round(confidence, 4),
        }

    # -----------------------------------------------------------
    # Piece detection
    # -----------------------------------------------------------
    def detect_pieces(self, image: np.ndarray) -> list[dict]:
        """
        Run the piece-detection model on *image*.

        Returns
        -------
        list[dict]
            Each element:
            {
                "class_name": str,          # e.g. "white_king"
                "bbox":       [x1,y1,x2,y2],
                "confidence": float
            }
        """
        results = self.piece_model.predict(image, conf=0.5)

        detections: list[dict] = []
        if len(results) == 0:
            return detections

        boxes = results[0].boxes
        names = results[0].names          # {int_label: str_name}

        for i in range(len(boxes)):
            cls_id = int(boxes.cls[i].cpu().numpy())
            class_name = names.get(cls_id, f"unknown_{cls_id}")
            bbox = boxes.xyxy[i].cpu().numpy().tolist()
            confidence = float(boxes.conf[i].cpu().numpy())

            detections.append({
                "class_name": class_name,
                "bbox": [round(v, 2) for v in bbox],
                "confidence": round(confidence, 4),
            })

        return detections

    # -----------------------------------------------------------
    # Full pipeline
    # -----------------------------------------------------------
    def full_pipeline(self, image: np.ndarray) -> dict:
        """
        End-to-end pipeline on a single frame.

        Steps
        -----
        1. Detect the chessboard bounding box.
        2. Crop the original image to that box.
        3. Run perspective correction on the crop → 640 x 640 warped image
           and obtain the warp matrix *M*.
        4. Detect pieces on the **original** (un-warped) image so that their
           bounding-box coordinates are in the original pixel space.
        5. Map each detected piece centre through *M* into the 8 x 8 grid
           and assign chess-square labels (a1 … h8).
        6. Generate a FEN string from the square map.
        7. Validate the FEN.

        Returns
        -------
        dict
            {
                "fen":            str | None,
                "board_detected": bool,
                "pieces":         [ {"piece": str, "square": str, "confidence": float}, … ],
                "errors":         [ str, … ]
            }
        """
        errors: list[str] = []

        # ----------------------------------------------------------
        # 1. Board detection
        # ----------------------------------------------------------
        board_info = self.detect_board(image)
        if not board_info["detected"]:
            return {
                "fen": None,
                "board_detected": False,
                "pieces": [],
                "errors": ["No board found"],
            }

        board_bbox: list[int] = board_info["bbox"]   # [x1, y1, x2, y2]

        # ----------------------------------------------------------
        # 2. Crop to board
        # ----------------------------------------------------------
        x1, y1, x2, y2 = board_bbox
        board_crop = image[y1:y2, x1:x2].copy()

        # ----------------------------------------------------------
        # 3. Perspective correction
        # ----------------------------------------------------------
        warped_image, warp_matrix = perspective_correction(board_crop)
        # warped_image is 640 x 640 (kept for potential downstream use)
        _ = warped_image  # not used further in this pipeline

        # ----------------------------------------------------------
        # 4. Piece detection (on the original full image)
        # ----------------------------------------------------------
        piece_detections = self.detect_pieces(image)

        # ----------------------------------------------------------
        # 5. Map pieces → squares
        # ----------------------------------------------------------
        square_map: dict[str, str] = map_pieces_to_squares(
            piece_detections, board_bbox, warp_matrix
        )

        # Build the list of {piece, square, confidence} for the response.
        # We need per-square confidence; rebuild from detections after mapping.
        # map_pieces_to_squares keeps the highest-confidence detection per square,
        # so we reconstruct confidence by scanning detections again.
        square_confidence: dict[str, float] = {}
        for det in piece_detections:
            cx = (det["bbox"][0] + det["bbox"][2]) / 2.0
            cy = (det["bbox"][1] + det["bbox"][3]) / 2.0
            # Replicate the mapping logic to find which square this centre lands on.
            import cv2   # local import to avoid circular / top-level cv2 pull
            cx_rel = cx - board_bbox[0]
            cy_rel = cy - board_bbox[1]
            pts = np.array([[[cx_rel, cy_rel]]], dtype=np.float32)
            warped_pt = cv2.perspectiveTransform(pts, warp_matrix)
            wx, wy = warped_pt[0][0]
            col = min(max(int(wx / 80), 0), 7)
            row = min(max(int(wy / 80), 0), 7)
            file_char = "abcdefgh"[col]
            rank_char = str(8 - row)
            sq = file_char + rank_char
            # Keep highest confidence per square (mirrors map_pieces_to_squares)
            if sq not in square_confidence or det["confidence"] > square_confidence[sq]:
                square_confidence[sq] = det["confidence"]

        pieces_list: list[dict] = [
            {
                "piece": piece_name,
                "square": sq_name,
                "confidence": round(square_confidence.get(sq_name, 0.0), 4),
            }
            for sq_name, piece_name in square_map.items()
        ]

        # ----------------------------------------------------------
        # 6. FEN generation
        # ----------------------------------------------------------
        fen = generate_fen(square_map)

        # ----------------------------------------------------------
        # 7. FEN validation
        # ----------------------------------------------------------
        validation = validate_fen(fen)
        if not validation["valid"]:
            errors.extend(validation["errors"])

        return {
            "fen": fen,
            "board_detected": True,
            "pieces": pieces_list,
            "errors": errors,
        }

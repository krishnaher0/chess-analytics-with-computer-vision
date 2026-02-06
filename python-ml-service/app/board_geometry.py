"""
board_geometry.py
-----------------
Perspective-correction utilities and piece-to-square mapping for the chess
board detection pipeline.
"""

import cv2
import numpy as np


# ---------------------------------------------------------------------------
# Corner ordering
# ---------------------------------------------------------------------------
def order_corners(corners: np.ndarray) -> np.ndarray:
    """
    Given 4 (x, y) points, return them in the order:
        [top-left, top-right, bottom-right, bottom-left]

    Algorithm (classic):
        * top-left     – smallest  (x + y)
        * bottom-right – largest   (x + y)
        * top-right    – of the remaining two, the one with the largest  (x - y)
        * bottom-left  – of the remaining two, the one with the smallest (x - y)

    Parameters
    ----------
    corners : np.ndarray, shape (4, 2)

    Returns
    -------
    np.ndarray, shape (4, 2)
        Ordered as [TL, TR, BR, BL].
    """
    corners = corners.reshape(4, 2)
    sums = corners[:, 0] + corners[:, 1]       # x + y

    tl_idx = int(np.argmin(sums))
    br_idx = int(np.argmax(sums))

    # Remaining two indices
    remaining = [i for i in range(4) if i not in (tl_idx, br_idx)]
    diffs = corners[remaining, 0] - corners[remaining, 1]   # x - y

    # Among the remaining two, larger diff → top-right, smaller → bottom-left
    if diffs[0] > diffs[1]:
        tr_idx, bl_idx = remaining[0], remaining[1]
    else:
        tr_idx, bl_idx = remaining[1], remaining[0]

    return corners[[tl_idx, tr_idx, br_idx, bl_idx]]


# ---------------------------------------------------------------------------
# Perspective correction
# ---------------------------------------------------------------------------
def perspective_correction(board_crop: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    """
    Straighten a (possibly skewed) chessboard crop into a 640 x 640 square.

    Steps
    -----
    1. Grayscale + adaptive threshold (binary inverse).
    2. Find the largest external contour.
    3. Approximate it; if 4 vertices are found use them as the board corners.
       Otherwise fall back to the rectangular corners of the crop.
    4. Order the 4 corners with :func:`order_corners`.
    5. Compute the perspective-transform matrix *M* that maps those corners
       onto a 640 x 640 destination square.
    6. Warp the crop with *M*.

    Parameters
    ----------
    board_crop : np.ndarray
        The region of the original image that contains the chessboard
        (output of a simple rectangular crop to the board bounding box).

    Returns
    -------
    warped : np.ndarray
        The perspective-corrected board image (640 x 640, BGR).
    M : np.ndarray
        The 3 x 3 perspective-transform matrix (needed later by
        :func:`map_pieces_to_squares`).
    """
    h, w = board_crop.shape[:2]

    # --- 1. Grayscale & threshold ---
    gray = cv2.cvtColor(board_crop, cv2.COLOR_BGR2GRAY)
    thresh = cv2.adaptiveThreshold(
        gray,
        255,
        cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY_INV,
        blockSize=11,
        C=2,
    )

    # --- 2. Contours ---
    contours, _ = cv2.findContours(
        thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE
    )

    # --- 3. Largest contour → approximate polygon ---
    src_corners: np.ndarray | None = None
    if contours:
        largest = max(contours, key=cv2.contourArea)
        perimeter = cv2.arcLength(largest, closed=True)
        approx = cv2.approxPolyDP(largest, epsilon=0.02 * perimeter, closed=True)

        if len(approx) == 4:
            src_corners = approx.reshape(4, 2)

    # Fallback: use the four corners of the crop itself
    if src_corners is None:
        src_corners = np.array(
            [[0, 0], [w - 1, 0], [w - 1, h - 1], [0, h - 1]],
            dtype=np.float32,
        )
    else:
        src_corners = src_corners.astype(np.float32)

    # --- 4. Order corners ---
    src_corners = order_corners(src_corners).astype(np.float32)

    # --- 5. Destination corners (640 x 640 square) ---
    dst_corners = np.array(
        [[0, 0], [639, 0], [639, 639], [0, 639]],
        dtype=np.float32,
    )

    M = cv2.getPerspectiveTransform(src_corners, dst_corners)

    # --- 6. Warp ---
    warped = cv2.warpPerspective(board_crop, M, (640, 640))

    return warped, M


# ---------------------------------------------------------------------------
# Piece → square mapping
# ---------------------------------------------------------------------------
def map_pieces_to_squares(
    piece_detections: list[dict],
    board_bbox: list[int],
    warp_matrix: np.ndarray,
) -> dict[str, str]:
    """
    Map each detected piece into one of the 64 chess squares (a1 … h8).

    Each piece's bounding-box centre is:
        1. Translated into the board-crop coordinate system.
        2. Warped through *warp_matrix* into the 640 x 640 normalised board.
        3. Divided into an 8 x 8 grid (each cell is 80 x 80 px).

    If two pieces land on the same square the one with the higher confidence
    is kept.

    Parameters
    ----------
    piece_detections : list[dict]
        Output of ``ChessDetector.detect_pieces``.  Each element has keys
        ``class_name``, ``bbox`` ([x1, y1, x2, y2]), and ``confidence``.
    board_bbox : list[int]
        [x1, y1, x2, y2] of the board in the original image.
    warp_matrix : np.ndarray
        The 3 x 3 perspective-transform matrix returned by
        :func:`perspective_correction`.

    Returns
    -------
    dict[str, str]
        Mapping from square name (e.g. ``"e1"``) to piece class name
        (e.g. ``"white_king"``).
    """
    square_map: dict[str, str] = {}
    square_conf: dict[str, float] = {}

    for det in piece_detections:
        x1, y1, x2, y2 = det["bbox"]
        cx = (x1 + x2) / 2.0
        cy = (y1 + y2) / 2.0

        # --- translate to board-crop coords ---
        cx_rel = cx - board_bbox[0]
        cy_rel = cy - board_bbox[1]

        # --- perspective-warp the single point ---
        # cv2.perspectiveTransform expects shape (1, 1, 2) float32
        pts = np.array([[[cx_rel, cy_rel]]], dtype=np.float32)
        warped_pt = cv2.perspectiveTransform(pts, warp_matrix)
        wx, wy = float(warped_pt[0][0][0]), float(warped_pt[0][0][1])

        # --- grid mapping ---
        col = min(max(int(wx / 80), 0), 7)   # file  a … h  → 0 … 7
        row = min(max(int(wy / 80), 0), 7)   # rank  8 … 1  → 0 … 7

        file_char = "abcdefgh"[col]
        rank_char = str(8 - row)
        square = file_char + rank_char

        # --- conflict resolution: keep higher confidence ---
        conf = det["confidence"]
        if square not in square_map or conf > square_conf[square]:
            square_map[square] = det["class_name"]
            square_conf[square] = conf

    return square_map

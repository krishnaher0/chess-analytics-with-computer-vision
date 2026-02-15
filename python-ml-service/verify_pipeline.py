import os
import sys
import numpy as np
from PIL import Image
import cv2

# Add the service root to sys.path
_SERVICE_ROOT = os.path.abspath(os.path.dirname(__file__))
if _SERVICE_ROOT not in sys.path:
    sys.path.insert(0, _SERVICE_ROOT)

from app.detector import ChessDetector
from utils.config import BOARD_MODEL_PATH, PIECE_MODEL_PATH

def main():
    print(f"Using Board Model: {BOARD_MODEL_PATH}")
    print(f"Using Piece Model: {PIECE_MODEL_PATH}")

    if not os.path.exists(BOARD_MODEL_PATH):
        print(f"Error: Board model not found at {BOARD_MODEL_PATH}")
        return
    if not os.path.exists(PIECE_MODEL_PATH):
        print(f"Error: Piece model not found at {PIECE_MODEL_PATH}")
        return

    detector = ChessDetector(
        board_model_path=BOARD_MODEL_PATH,
        piece_model_path=PIECE_MODEL_PATH,
    )

    # Use a sample image from the test set
    sample_img_path = "/Users/krishna613460gmail.com/ThesisBookProject/chess_boards/test/images/IMG_20251205_094712_jpg.rf.651be77d52290371c46ad1dcafc03250.jpg"
    
    if not os.path.exists(sample_img_path):
        print(f"Error: Sample image not found at {sample_img_path}")
        return

    print(f"Processing image: {sample_img_path}")
    pil_img = Image.open(sample_img_path).convert("RGB")
    rgb_array = np.array(pil_img)
    bgr_array = rgb_array[..., ::-1].copy()

    result = detector.full_pipeline(bgr_array)

    print("\n--- Detection Results ---")
    print(f"Board Detected: {result['board_detected']}")
    print(f"FEN: {result['fen']}")
    print(f"Pieces Count: {len(result['pieces'])}")
    
    if result['errors']:
        print("Errors:")
        for err in result['errors']:
            print(f"  - {err}")
    
    if result['fen']:
        print("\nValidating FEN with python-chess...")
        import chess
        try:
            board = chess.Board(result['fen'])
            print("FEN is valid according to python-chess.")
            print(board)
        except ValueError as e:
            print(f"FEN validation failed: {e}")

if __name__ == "__main__":
    main()

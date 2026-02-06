"""
train_piece_model.py
--------------------
Standalone training script for the **piece-detection** YOLOv8 model.

Run from the ``python-ml-service/`` directory:

    python train_piece_model.py

Pre-requisites
--------------
* A dataset directory ``../chess_pieces/`` (relative to this file) that
  contains a ``data.yaml`` YOLO-format manifest with labels for all 12 piece
  classes (white/black × king/queen/rook/bishop/knight/pawn).
* The ``ultralytics`` package installed in the active environment.

After training the best weights are copied to ``./models/piece_detector.pt``
so that the FastAPI service can load them without further manual steps.
"""

import os
import shutil

from ultralytics import YOLO

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
# Path to the YOLO dataset descriptor.  Relative to *this* file's location.
_THIS_DIR = os.path.abspath(os.path.dirname(__file__))
DATASET_PATH: str = os.path.join(_THIS_DIR, "..", "chess_pieces", "data.yaml")

# Starting weights (YOLOv8 small – good balance of speed and accuracy).
MODEL: str = "yolov8s.pt"

# ---------------------------------------------------------------------------
# Training
# ---------------------------------------------------------------------------
def main() -> None:
    # Resolve dataset path to an absolute path so YOLO does not get confused
    # regardless of the current working directory.
    dataset_path = os.path.abspath(DATASET_PATH)
    if not os.path.isfile(dataset_path):
        raise FileNotFoundError(
            f"Dataset file not found at {dataset_path}. "
            "Make sure ../chess_pieces/data.yaml exists."
        )

    model = YOLO(MODEL)

    results = model.train(
        data=dataset_path,
        epochs=150,
        imgsz=640,
        project="runs",
        name="piece_detection",
    )

    # ---------------------------------------------------------------------------
    # Copy best weights to the expected service location
    # ---------------------------------------------------------------------------
    best_pt = os.path.join(_THIS_DIR, "runs", "piece_detection", "weights", "best.pt")
    dest_dir = os.path.join(_THIS_DIR, "models")
    os.makedirs(dest_dir, exist_ok=True)
    dest_path = os.path.join(dest_dir, "piece_detector.pt")

    if os.path.isfile(best_pt):
        shutil.copy2(best_pt, dest_path)
        print(f"[train_piece_model] Copied best weights → {dest_path}")
    else:
        print(
            f"[train_piece_model] WARNING: best.pt not found at {best_pt}. "
            "Check the 'runs/' directory manually."
        )

    # ---------------------------------------------------------------------------
    # Print validation metrics (ultralytics stores them in results)
    # ---------------------------------------------------------------------------
    print("\n===== Validation Metrics =====")
    print(results)


if __name__ == "__main__":
    main()

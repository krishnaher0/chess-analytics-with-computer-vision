"""
image_utils.py
--------------
Shared helpers for image I/O and pre-processing used across the ML service.
"""

import base64
import io

import cv2
import numpy as np
import requests
from PIL import Image


# ---------------------------------------------------------------------------
# Base-64 ↔ image conversions
# ---------------------------------------------------------------------------
def base64_to_image(base64_str: str) -> np.ndarray:
    """
    Decode a base64-encoded image string into an OpenCV-compatible array.

    Parameters
    ----------
    base64_str : str
        The raw base64 payload (without a ``data:image/…;base64,`` prefix).
        If the prefix is present it is stripped automatically.

    Returns
    -------
    np.ndarray
        BGR image array (OpenCV convention).
    """
    # Strip the optional data-URI prefix that browsers / clients may prepend.
    if "," in base64_str and base64_str.startswith("data:"):
        base64_str = base64_str.split(",", 1)[1]

    raw_bytes = base64.b64decode(base64_str)
    pil_img = Image.open(io.BytesIO(raw_bytes)).convert("RGB")
    rgb_array = np.array(pil_img)
    # PIL → RGB; OpenCV expects BGR.
    bgr_array = rgb_array[..., ::-1].copy()
    return bgr_array


def image_to_base64(image: np.ndarray) -> str:
    """
    Encode an OpenCV BGR image array as a base64 string (JPEG).

    Parameters
    ----------
    image : np.ndarray
        BGR image (standard OpenCV layout).

    Returns
    -------
    str
        Base64-encoded JPEG string.
    """
    success, buffer = cv2.imencode(".jpg", image)
    if not success:
        raise RuntimeError("cv2.imencode failed – image may be malformed.")
    return base64.b64encode(buffer).decode("utf-8")


# ---------------------------------------------------------------------------
# Network frame fetch (IPWebcam / any JPEG URL)
# ---------------------------------------------------------------------------
def fetch_frame_from_url(url: str) -> np.ndarray:
    """
    Fetch a single JPEG frame from a URL (e.g. an IPWebcam snapshot endpoint)
    and return it as an OpenCV BGR array.

    Parameters
    ----------
    url : str
        Full URL that responds with a JPEG image when GET-ed.

    Returns
    -------
    np.ndarray
        BGR image array.

    Raises
    ------
    requests.exceptions.RequestException
        When the HTTP request itself fails.
    ValueError
        When the response body cannot be decoded as an image.
    """
    response = requests.get(url, stream=True, timeout=10)
    response.raise_for_status()

    pil_img = Image.open(io.BytesIO(response.content)).convert("RGB")
    rgb_array = np.array(pil_img)
    # Convert RGB → BGR for OpenCV compatibility.
    bgr_array = rgb_array[..., ::-1].copy()
    return bgr_array


# ---------------------------------------------------------------------------
# Pre-processing
# ---------------------------------------------------------------------------
def preprocess_frame(image: np.ndarray, target_size: tuple[int, int] = (640, 640)) -> np.ndarray:
    """
    Resize an image to *target_size*.

    Parameters
    ----------
    image : np.ndarray
        Input image (any number of channels).
    target_size : tuple[int, int]
        Desired (width, height).  Defaults to 640 x 640, which matches the
        YOLOv8 input resolution used during training.

    Returns
    -------
    np.ndarray
        Resized image.
    """
    return cv2.resize(image, target_size)

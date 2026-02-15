const express = require('express');
const router  = express.Router();
const axios   = require('axios');
const multer  = require('multer');
const FormData = require('form-data');
const fs      = require('fs');
const path    = require('path');

const { ML_SERVICE_URL } = require('../config/env');
const { verifyToken }    = require('../middleware/auth');

// ── Multer configuration ───────────────────────────────────────
// Store uploads in memory (Buffer) so we can pipe them straight to
// the ML service without writing to disk.

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024  // 50MB limit for videos
  }
});

// ── POST /detect ───────────────────────────────────────────────

router.post('/detect', verifyToken, upload.single('image'), async (req, res) => {
  try {
    // --- path A: image file uploaded as multipart ----------------
    if (req.file) {
      const form = new FormData();
      form.append('file', req.file.buffer, {
        filename: req.file.originalname,
        contentType: req.file.mimetype
      });

      const response = await axios.post(
        `${ML_SERVICE_URL}/detect/full`,
        form,
        {
          headers: form.getHeaders(),
          timeout: 30000   // 30 s — ML inference can be slow
        }
      );

      return res.status(response.status).json(response.data);
    }

    // --- path B: webcam URL provided as JSON ----------------------
    if (req.body && req.body.url) {
      const response = await axios.post(
        `${ML_SERVICE_URL}/detect/from_url`,
        { url: req.body.url },
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 30000
        }
      );

      return res.status(response.status).json(response.data);
    }

    // --- neither path matched -------------------------------------
    return res.status(400).json({
      message: 'Either upload an image file (multipart field "image") or provide a JSON body with { url }.'
    });
  } catch (error) {
    console.error('[Detection] /detect error:', error.message);

    // If the ML service itself returned an error status, forward it
    if (error.response) {
      return res.status(error.response.status).json({
        message: 'ML service error.',
        details: error.response.data
      });
    }

    return res.status(500).json({
      message: 'Failed to communicate with ML service.',
      error:   error.message
    });
  }
});

// ── POST /upload-image ─────────────────────────────────────────
// Upload a static chess board image and get FEN + piece positions

router.post('/upload-image', verifyToken, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No image file uploaded.' });
    }

    const form = new FormData();
    form.append('file', req.file.buffer, {
      filename: req.file.originalname,
      contentType: req.file.mimetype
    });

    const response = await axios.post(
      `${ML_SERVICE_URL}/detect/full`,
      form,
      {
        headers: form.getHeaders(),
        timeout: 30000
      }
    );

    const result = {
      ...response.data,
      uploadedBy: req.userId,
      uploadedAt: new Date().toISOString(),
      filename: req.file.originalname
    };

    return res.status(200).json(result);
  } catch (error) {
    console.error('[Detection] /upload-image error:', error.message);

    if (error.response) {
      return res.status(error.response.status).json({
        message: 'ML service error.',
        details: error.response.data
      });
    }

    return res.status(500).json({
      message: 'Failed to process image.',
      error: error.message
    });
  }
});

// ── POST /upload-video ─────────────────────────────────────────
// Upload a video file, extract frames, and analyze each frame
// Note: This is a simplified version. For production, consider using
// a job queue (Bull/Redis) for background processing

router.post('/upload-video', verifyToken, upload.single('video'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No video file uploaded.' });
    }

    // Get frame rate from request (default 1 frame per second)
    const framesPerSecond = parseInt(req.body.fps) || 1;

    // Save video temporarily to disk for FFmpeg processing
    const tempVideoPath = path.join('/tmp', `video_${Date.now()}_${req.file.originalname}`);
    const tempFramesDir = path.join('/tmp', `frames_${Date.now()}`);

    fs.writeFileSync(tempVideoPath, req.file.buffer);
    fs.mkdirSync(tempFramesDir, { recursive: true });

    // Note: FFmpeg processing will be added in next step
    // For now, return a placeholder response

    return res.status(200).json({
      message: 'Video upload successful. Frame extraction will be implemented next.',
      videoFile: req.file.originalname,
      uploadedBy: req.userId,
      uploadedAt: new Date().toISOString(),
      requestedFps: framesPerSecond,
      status: 'pending_implementation'
    });

    // TODO: Implement FFmpeg frame extraction
    // TODO: Process each frame through ML service
    // TODO: Detect position changes and generate move sequence
    // TODO: Generate PGN if valid game detected
    // TODO: Clean up temporary files

  } catch (error) {
    console.error('[Detection] /upload-video error:', error.message);
    return res.status(500).json({
      message: 'Failed to process video.',
      error: error.message
    });
  }
});

// ── POST /live-stream ──────────────────────────────────────────
// Fetch frame from IP Webcam or similar streaming source

router.post('/live-stream', verifyToken, async (req, res) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ message: 'URL is required.' });
    }

    const response = await axios.post(
      `${ML_SERVICE_URL}/detect/from_url`,
      { url },
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 30000
      }
    );

    const result = {
      ...response.data,
      requestedBy: req.userId,
      requestedAt: new Date().toISOString(),
      sourceUrl: url
    };

    return res.status(200).json(result);
  } catch (error) {
    console.error('[Detection] /live-stream error:', error.message);

    if (error.response) {
      return res.status(error.response.status).json({
        message: 'ML service error.',
        details: error.response.data
      });
    }

    return res.status(500).json({
      message: 'Failed to fetch and analyze stream frame.',
      error: error.message
    });
  }
});

// ── GET /health ────────────────────────────────────────────────

router.get('/health', async (req, res) => {
  try {
    const response = await axios.get(`${ML_SERVICE_URL}/health`, { timeout: 5000 });
    return res.status(response.status).json(response.data);
  } catch (error) {
    console.error('[Detection] /health check failed:', error.message);

    if (error.response) {
      return res.status(error.response.status).json(error.response.data);
    }

    return res.status(503).json({
      message: 'ML service is unreachable.',
      error:   error.message
    });
  }
});

module.exports = router;

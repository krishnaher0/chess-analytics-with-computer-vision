import React, { useState } from 'react';
import { Chessboard } from 'react-chessboard';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const VideoUploadAnalyzer = () => {
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [framesPerSecond, setFramesPerSecond] = useState(1);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [selectedFrameIndex, setSelectedFrameIndex] = useState(0);

  // Handle file selection
  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      if (!file.type.startsWith('video/')) {
        setError('Please select a valid video file.');
        return;
      }

      setSelectedVideo(file);
      setPreviewUrl(URL.createObjectURL(file));
      setResult(null);
      setError(null);
    }
  };

  // Analyze the uploaded video
  const analyzeVideo = async () => {
    if (!selectedVideo) {
      setError('Please select a video first.');
      return;
    }

    setAnalyzing(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('video', selectedVideo);
      formData.append('fps', framesPerSecond);

      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_URL}/detection/upload-video`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            Authorization: `Bearer ${token}`
          },
          onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            console.log('Upload progress:', percentCompleted);
          }
        }
      );

      setResult(response.data);

      // Note: This is placeholder until video processing is fully implemented
      if (response.data.status === 'pending_implementation') {
        setError('Video frame extraction is coming soon. The video has been uploaded successfully.');
      }
    } catch (err) {
      console.error('Analysis error:', err);
      setError(
        err.response?.data?.message ||
        'Failed to analyze video. Please try again.'
      );
    } finally {
      setAnalyzing(false);
    }
  };

  // Get current frame data
  const getCurrentFrame = () => {
    if (!result || !result.frames || result.frames.length === 0) {
      return null;
    }
    return result.frames[selectedFrameIndex];
  };

  const currentFrame = getCurrentFrame();

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h2 className="text-3xl font-bold mb-6">Chess Game Video Analyzer</h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Upload & Settings */}
        <div>
          <div className="border-4 border-dashed border-gray-300 rounded-lg p-8 text-center">
            {previewUrl ? (
              <div>
                <video
                  src={previewUrl}
                  controls
                  className="max-w-full max-h-96 mx-auto rounded"
                />
                <p className="mt-2 text-sm text-gray-600">
                  {selectedVideo?.name}
                </p>
                <p className="text-xs text-gray-500">
                  Size: {(selectedVideo?.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            ) : (
              <div className="py-12">
                <svg
                  className="mx-auto h-12 w-12 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
                <p className="mt-4 text-lg text-gray-600">
                  Upload a chess game video
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  MP4, MOV, AVI supported (max 50MB)
                </p>
              </div>
            )}
          </div>

          <input
            id="videoInput"
            type="file"
            accept="video/*"
            onChange={handleFileSelect}
            className="hidden"
          />

          <button
            onClick={() => document.getElementById('videoInput').click()}
            className="w-full mt-4 py-3 px-6 bg-gray-200 hover:bg-gray-300 rounded-lg font-semibold"
          >
            {selectedVideo ? 'Choose Different Video' : 'Choose Video File'}
          </button>

          {/* Frame Rate Setting */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <label className="block font-medium mb-2">
              Frame Extraction Rate
            </label>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min="1"
                max="5"
                value={framesPerSecond}
                onChange={(e) => setFramesPerSecond(parseInt(e.target.value))}
                className="flex-1"
              />
              <span className="font-semibold text-lg">{framesPerSecond} FPS</span>
            </div>
            <p className="text-sm text-gray-600 mt-2">
              Extract {framesPerSecond} frame(s) per second from the video
            </p>
          </div>

          <button
            onClick={analyzeVideo}
            disabled={!selectedVideo || analyzing}
            className={`w-full mt-4 py-3 px-6 rounded-lg font-semibold text-white ${
              !selectedVideo || analyzing
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {analyzing ? 'Processing Video...' : 'Analyze Video'}
          </button>

          {error && (
            <div className="mt-4 p-4 bg-red-100 border border-red-400 rounded-lg">
              <p className="text-red-700">{error}</p>
            </div>
          )}

          {result && result.status === 'pending_implementation' && (
            <div className="mt-4 p-4 bg-yellow-100 border border-yellow-400 rounded-lg">
              <p className="text-yellow-800 font-medium">Note:</p>
              <p className="text-yellow-700 text-sm mt-1">
                Video processing is currently under development. The backend has received your video
                and will process it once FFmpeg integration is complete.
              </p>
            </div>
          )}
        </div>

        {/* Right Column: Results */}
        <div>
          {result && result.frames && result.frames.length > 0 ? (
            <div className="space-y-4">
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <h3 className="text-xl font-semibold mb-3">Extracted Positions</h3>

                {/* Timeline Slider */}
                <div className="mb-4">
                  <div className="flex justify-between text-sm text-gray-600 mb-2">
                    <span>Frame {selectedFrameIndex + 1} of {result.frames.length}</span>
                    <span>Time: {currentFrame?.timestamp}s</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max={result.frames.length - 1}
                    value={selectedFrameIndex}
                    onChange={(e) => setSelectedFrameIndex(parseInt(e.target.value))}
                    className="w-full"
                  />
                </div>

                {/* Chessboard */}
                {currentFrame && (
                  <>
                    <div className="mb-4">
                      <Chessboard
                        position={currentFrame.fen || 'start'}
                        boardWidth={400}
                        arePiecesDraggable={false}
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">Position:</span>
                        <span className="text-gray-700">
                          {currentFrame.moveNumber ? `Move ${currentFrame.moveNumber}` : 'Unknown'}
                        </span>
                      </div>

                      {currentFrame.fen && (
                        <div className="mt-3">
                          <span className="font-medium">FEN:</span>
                          <code className="block mt-1 p-2 bg-gray-100 rounded text-xs break-all">
                            {currentFrame.fen}
                          </code>
                        </div>
                      )}
                    </div>
                  </>
                )}

                {/* Move List */}
                {result.moves && result.moves.length > 0 && (
                  <div className="mt-4">
                    <h4 className="font-medium mb-2">Detected Moves:</h4>
                    <div className="max-h-48 overflow-y-auto bg-gray-50 p-3 rounded">
                      <div className="text-sm font-mono">
                        {result.moves.map((move, idx) => (
                          <span key={idx} className="mr-2">
                            {idx % 2 === 0 && `${Math.floor(idx / 2) + 1}. `}
                            {move}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* PGN Export */}
                {result.pgn && (
                  <div className="mt-4">
                    <button className="w-full py-2 px-4 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold">
                      Export PGN
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400">
              <div className="text-center">
                <svg
                  className="mx-auto h-16 w-16"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z"
                  />
                </svg>
                <p className="mt-4">Upload a video to see analyzed positions</p>
              </div>
            </div>
          )}

          {analyzing && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Processing video frames...</p>
                <p className="text-sm text-gray-500 mt-2">This may take a few minutes</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VideoUploadAnalyzer;

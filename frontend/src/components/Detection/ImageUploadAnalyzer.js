import React, { useState, useCallback } from 'react';
import { Chessboard } from 'react-chessboard';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const ImageUploadAnalyzer = () => {
  const [selectedImage, setSelectedImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  // Handle file selection
  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedImage(file);
      setPreviewUrl(URL.createObjectURL(file));
      setResult(null);
      setError(null);
    }
  };

  // Handle drag and drop
  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();

    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      setSelectedImage(file);
      setPreviewUrl(URL.createObjectURL(file));
      setResult(null);
      setError(null);
    } else {
      setError('Please drop a valid image file.');
    }
  }, []);

  // Analyze the uploaded image
  const analyzeImage = async () => {
    if (!selectedImage) {
      setError('Please select an image first.');
      return;
    }

    setAnalyzing(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('image', selectedImage);

      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_URL}/detection/upload-image`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            Authorization: `Bearer ${token}`
          }
        }
      );

      setResult(response.data);
    } catch (err) {
      console.error('Analysis error:', err);
      setError(
        err.response?.data?.message ||
        'Failed to analyze image. Please try again.'
      );
    } finally {
      setAnalyzing(false);
    }
  };

  // Save analysis to history
  const saveToHistory = async () => {
    if (!result || !result.fen) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_URL}/analysis/save`,
        {
          fen: result.fen,
          source: 'image_upload',
          filename: result.filename,
          detectedPieces: result.pieces,
          timestamp: result.uploadedAt
        },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      alert('Position saved to analysis history!');
    } catch (err) {
      console.error('Save error:', err);
      alert('Failed to save to history.');
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h2 className="text-3xl font-bold mb-6">Chess Board Image Analyzer</h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Upload & Preview */}
        <div>
          <div
            className="border-4 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-500 transition-colors"
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={() => document.getElementById('imageInput').click()}
          >
            {previewUrl ? (
              <img
                src={previewUrl}
                alt="Chess board preview"
                className="max-w-full max-h-96 mx-auto rounded"
              />
            ) : (
              <div className="py-12">
                <svg
                  className="mx-auto h-12 w-12 text-gray-400"
                  stroke="currentColor"
                  fill="none"
                  viewBox="0 0 48 48"
                >
                  <path
                    d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <p className="mt-4 text-lg text-gray-600">
                  Drag and drop a chess board image
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  or click to browse
                </p>
              </div>
            )}
          </div>

          <input
            id="imageInput"
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />

          <div className="mt-4 flex gap-3">
            <button
              onClick={analyzeImage}
              disabled={!selectedImage || analyzing}
              className={`flex-1 py-3 px-6 rounded-lg font-semibold text-white ${
                !selectedImage || analyzing
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {analyzing ? 'Analyzing...' : 'Analyze Board'}
            </button>

            {selectedImage && (
              <button
                onClick={() => {
                  setSelectedImage(null);
                  setPreviewUrl(null);
                  setResult(null);
                  setError(null);
                }}
                className="px-6 py-3 bg-gray-200 hover:bg-gray-300 rounded-lg font-semibold"
              >
                Clear
              </button>
            )}
          </div>

          {error && (
            <div className="mt-4 p-4 bg-red-100 border border-red-400 rounded-lg">
              <p className="text-red-700">{error}</p>
            </div>
          )}
        </div>

        {/* Right Column: Results */}
        <div>
          {result && (
            <div className="space-y-4">
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <h3 className="text-xl font-semibold mb-3">Detected Position</h3>

                {result.board_detected ? (
                  <>
                    <div className="mb-4">
                      <Chessboard
                        position={result.fen || 'start'}
                        boardWidth={400}
                        arePiecesDraggable={false}
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">Status:</span>
                        <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                          Board Detected
                        </span>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="font-medium">Pieces Found:</span>
                        <span className="text-gray-700">{result.pieces?.length || 0}</span>
                      </div>

                      {result.fen && (
                        <div className="mt-3">
                          <span className="font-medium">FEN:</span>
                          <code className="block mt-1 p-2 bg-gray-100 rounded text-sm break-all">
                            {result.fen}
                          </code>
                        </div>
                      )}
                    </div>

                    {result.pieces && result.pieces.length > 0 && (
                      <div className="mt-4">
                        <h4 className="font-medium mb-2">Detected Pieces:</h4>
                        <div className="max-h-48 overflow-y-auto">
                          <table className="w-full text-sm">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-2 py-1 text-left">Square</th>
                                <th className="px-2 py-1 text-left">Piece</th>
                                <th className="px-2 py-1 text-right">Confidence</th>
                              </tr>
                            </thead>
                            <tbody>
                              {result.pieces.map((piece, idx) => (
                                <tr key={idx} className="border-t">
                                  <td className="px-2 py-1">{piece.square}</td>
                                  <td className="px-2 py-1">{piece.piece}</td>
                                  <td className="px-2 py-1 text-right">
                                    {(piece.confidence * 100).toFixed(1)}%
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    <button
                      onClick={saveToHistory}
                      className="w-full mt-4 py-2 px-4 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold"
                    >
                      Save to Analysis History
                    </button>
                  </>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-red-600 font-medium">
                      No chess board detected in the image
                    </p>
                    <p className="text-sm text-gray-500 mt-2">
                      Please try another image with a clearer view of the chess board
                    </p>
                  </div>
                )}

                {result.errors && result.errors.length > 0 && (
                  <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
                    <p className="font-medium text-yellow-800">Warnings:</p>
                    <ul className="list-disc list-inside text-sm text-yellow-700 mt-1">
                      {result.errors.map((err, idx) => (
                        <li key={idx}>{err}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          {!result && !analyzing && (
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
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                  />
                </svg>
                <p className="mt-4">Upload an image to see results</p>
              </div>
            </div>
          )}

          {analyzing && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Analyzing board position...</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImageUploadAnalyzer;

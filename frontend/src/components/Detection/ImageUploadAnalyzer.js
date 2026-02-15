import React, { useState, useCallback, useEffect } from 'react';
import { Chessboard } from 'react-chessboard';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const ImageUploadAnalyzer = () => {
  const [selectedImage, setSelectedImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [turn, setTurn] = useState('w'); // 'w' or 'b'
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);

  // Handle file selection
  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedImage(file);
      setPreviewUrl(URL.createObjectURL(file));
      setResult(null);
      setError(null);
      setAnalysisResult(null);
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
      setAnalysisResult(null);
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
    setAnalysisResult(null);

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

  // Run Stockfish analysis on the current FEN
  const runAnalysis = async () => {
    if (!result || !result.fen) return;

    setAnalysisLoading(true);
    setAnalysisResult(null);

    try {
      // Adjust FEN based on selected turn
      const currentFen = result.fen.replace(/ [wb] /, ` ${turn} `);

      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_URL}/analysis/position`,
        {
          fen: currentFen,
          depth: 15,
          multipv: 3
        },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      setAnalysisResult(response.data);
    } catch (err) {
      console.error('Stockfish error:', err);
      setError('Failed to run Stockfish analysis.');
    } finally {
      setAnalysisLoading(false);
    }
  };

  // Save analysis to history
  const saveToHistory = async () => {
    if (!result || !result.fen) {
      return;
    }

    try {
      const currentFen = result.fen.replace(/ [wb] /, ` ${turn} `);
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_URL}/analysis/save`,
        {
          fen: currentFen,
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

  // Helper to get FEN with current turn
  const getCurrentFen = () => {
    if (!result || !result.fen) return 'start';
    return result.fen.replace(/ [wb] /, ` ${turn} `);
  };

  // Helper to format evaluation
  const formatEval = (evaluation) => {
    if (!evaluation) return '';
    if (evaluation.type === 'mate') {
      return `Mate in ${Math.abs(evaluation.value)}`;
    }
    const score = (evaluation.value / 100).toFixed(2);
    return score > 0 ? `+${score}` : score;
  };

  // Helper to determine who is leading
  const getLeadingText = (evaluation) => {
    if (!evaluation) return '';
    if (evaluation.type === 'mate') {
      return evaluation.value > 0 ? 'White has forced mate' : 'Black has forced mate';
    }
    if (evaluation.value > 50) return 'White is leading';
    if (evaluation.value < -50) return 'Black is leading';
    return 'The position is equal';
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      <h2 className="text-3xl font-bold mb-6">Chess Board Image Analyzer</h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column: Upload & Preview */}
        <div className="space-y-6">
          <div
            className="border-4 border-dashed border-gray-700 bg-gray-900 rounded-xl p-8 text-center cursor-pointer hover:border-blue-500 transition-colors"
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={() => document.getElementById('imageInput').click()}
          >
            {previewUrl ? (
              <img
                src={previewUrl}
                alt="Chess board preview"
                className="max-w-full max-h-[500px] mx-auto rounded shadow-xl"
              />
            ) : (
              <div className="py-20">
                <svg
                  className="mx-auto h-16 w-16 text-gray-500"
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
                <p className="mt-4 text-xl font-medium text-gray-400">
                  Drag and drop a chess board image
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  or click to browse from your device
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

          <div className="flex gap-4">
            <button
              onClick={analyzeImage}
              disabled={!selectedImage || analyzing}
              className={`flex-1 py-4 px-6 rounded-xl font-bold text-white shadow-lg transition-all ${!selectedImage || analyzing
                  ? 'bg-gray-700 cursor-not-allowed text-gray-500'
                  : 'bg-blue-600 hover:bg-blue-700 active:scale-95'
                }`}
            >
              {analyzing ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Analyzing Board...
                </span>
              ) : 'Analyze Photo'}
            </button>

            {selectedImage && (
              <button
                onClick={() => {
                  setSelectedImage(null);
                  setPreviewUrl(null);
                  setResult(null);
                  setError(null);
                  setAnalysisResult(null);
                }}
                className="px-6 py-4 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl font-bold transition-colors"
              >
                Clear
              </button>
            )}
          </div>

          {error && (
            <div className="p-4 bg-red-900/20 border border-red-900/50 rounded-xl">
              <p className="text-red-400 text-sm flex items-center gap-2">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {error}
              </p>
            </div>
          )}
        </div>

        {/* Right Column: Results */}
        <div className="space-y-6">
          {result ? (
            <div className="bg-gray-800 border border-gray-700 rounded-2xl overflow-hidden shadow-2xl">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-2xl font-bold text-white">Detection Results</h3>
                  <span className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider ${result.board_detected ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
                    }`}>
                    {result.board_detected ? 'Board Found' : 'No Board Detected'}
                  </span>
                </div>

                {result.board_detected ? (
                  <div className="space-y-8">
                    {/* Chessboard Preview */}
                    <div className="flex justify-center bg-gray-900 p-4 rounded-xl">
                      <div className="w-full max-w-[450px]">
                        <Chessboard
                          position={getCurrentFen()}
                          boardWidth={undefined} // responsive
                          arePiecesDraggable={false}
                        />
                      </div>
                    </div>

                    {/* FEN & Turn Control */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-500 uppercase">Who's Turn?</label>
                        <div className="flex gap-2 p-1 bg-gray-900 rounded-lg border border-gray-700">
                          <button
                            onClick={() => setTurn('w')}
                            className={`flex-1 py-2 rounded-md font-bold text-sm transition-all ${turn === 'w' ? 'bg-white text-black shadow-md' : 'text-gray-400 hover:text-white'
                              }`}
                          >
                            White to Move
                          </button>
                          <button
                            onClick={() => setTurn('b')}
                            className={`flex-1 py-2 rounded-md font-bold text-sm transition-all ${turn === 'b' ? 'bg-gray-600 text-white shadow-md' : 'text-gray-400 hover:text-white'
                              }`}
                          >
                            Black to Move
                          </button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-500 uppercase">Current FEN</label>
                        <div className="bg-gray-900 p-3 rounded-lg border border-gray-700 font-mono text-xs text-blue-400 break-all h-full min-h-[46px] flex items-center">
                          {getCurrentFen()}
                        </div>
                      </div>
                    </div>

                    {/* Analysis Section */}
                    <div className="border-t border-gray-700 pt-6">
                      <div className="flex flex-col sm:flex-row gap-4 mb-6">
                        <button
                          onClick={runAnalysis}
                          disabled={analysisLoading}
                          className={`flex-1 py-3 px-6 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${analysisLoading
                              ? 'bg-blue-900/50 text-blue-300 cursor-not-allowed'
                              : 'bg-blue-600/10 text-blue-400 border border-blue-600/30 hover:bg-blue-600/20'
                            }`}
                        >
                          {analysisLoading ? (
                            <div className="w-5 h-5 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin"></div>
                          ) : (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                          )}
                          {analysisLoading ? 'Calculating...' : 'Run Stockfish Analysis'}
                        </button>

                        <button
                          onClick={saveToHistory}
                          className="px-6 py-3 bg-green-600/10 text-green-400 border border-green-600/30 hover:bg-green-600/20 rounded-xl font-bold transition-all flex items-center justify-center gap-2"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                          </svg>
                          Save Position
                        </button>
                      </div>

                      {analysisResult && (
                        <div className="bg-gray-900 rounded-xl p-5 border border-gray-700 space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
                          <div className="flex justify-between items-end">
                            <div className="space-y-1">
                              <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Evaluation</h4>
                              <p className="text-3xl font-black text-white">{getLeadingText(analysisResult.evaluation)}</p>
                            </div>
                            <div className={`text-4xl font-black ${analysisResult.evaluation.value > 100 ? 'text-green-500' :
                                analysisResult.evaluation.value < -100 ? 'text-red-500' : 'text-blue-500'
                              }`}>
                              {formatEval(analysisResult.evaluation)}
                            </div>
                          </div>

                          {analysisResult.topMoves && analysisResult.topMoves.length > 0 && (
                            <div className="space-y-3 pt-4 border-t border-gray-800">
                              <h5 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Recommended Moves</h5>
                              <div className="space-y-2">
                                {analysisResult.topMoves.map((m, idx) => (
                                  <div key={idx} className="flex justify-between items-center bg-gray-800/50 p-3 rounded-lg border border-gray-800 transition-hover hover:border-blue-500/50">
                                    <div className="flex items-center gap-3">
                                      <span className="w-6 h-6 flex items-center justify-center bg-gray-700 rounded text-[10px] font-bold text-gray-400">{idx + 1}</span>
                                      <span className="font-mono font-bold text-white text-lg">{m.move}</span>
                                    </div>
                                    <span className={`text-sm font-bold ${m.evaluation.value > 0 ? 'text-green-400' : 'text-red-400'
                                      }`}>
                                      {formatEval(m.evaluation)}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Warning Messages */}
                    {result.errors && result.errors.length > 0 && (
                      <div className="p-4 bg-yellow-900/10 border border-yellow-900/30 rounded-xl">
                        <p className="text-yellow-500 text-sm font-bold flex items-center gap-2 mb-2">
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                          Detection Warnings
                        </p>
                        <ul className="list-disc list-inside text-xs text-yellow-500/80 space-y-1">
                          {result.errors.map((err, idx) => (
                            <li key={idx}>{err}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-20 px-6">
                    <div className="w-20 h-20 bg-red-900/10 rounded-full flex items-center justify-center mx-auto mb-6">
                      <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    </div>
                    <h4 className="text-xl font-bold text-white mb-2">Analysis Failed</h4>
                    <p className="text-gray-400">
                      We couldn't detect a chessboard in this photo. Please ensure the board is clearly visible and try again.
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-gray-800 border border-gray-700 border-dashed rounded-2xl h-full min-h-[500px] flex items-center justify-center">
              <div className="text-center p-12 space-y-4">
                <div className="w-24 h-24 bg-gray-900 rounded-full flex items-center justify-center mx-auto shadow-xl">
                  <svg className="w-12 h-12 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-gray-500">Awaiting Image</h3>
                <p className="max-w-xs text-gray-600 font-medium">
                  Upload or drop an image of a real-world chessboard to get instant computer analysis.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImageUploadAnalyzer;

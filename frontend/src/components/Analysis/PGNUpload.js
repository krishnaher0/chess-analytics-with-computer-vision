import React, { useState } from 'react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

/**
 * PGNUpload Component
 *
 * Upload and analyze PGN files
 *
 * Props:
 * - onAnalysisComplete: Callback with analysisId when complete
 */
const PGNUpload = ({ onAnalysisComplete }) => {
  const [pgn, setPgn] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const [depth, setDepth] = useState(15);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setPgn(event.target.result);
      setError(null);
    };
    reader.onerror = () => {
      setError('Failed to read file');
    };
    reader.readAsText(file);
  };

  const analyzePGN = async () => {
    if (!pgn.trim()) {
      setError('Please enter or upload a PGN');
      return;
    }

    setAnalyzing(true);
    setProgress(0);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_URL}/analysis/pgn/full`,
        {
          pgn: pgn.trim(),
          depth,
          saveAnalysis: true
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          onUploadProgress: (progressEvent) => {
            const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setProgress(percent);
          }
        }
      );

      if (response.data.analysisId && onAnalysisComplete) {
        onAnalysisComplete(response.data.analysisId);
      }
    } catch (err) {
      console.error('Analysis error:', err);
      setError(
        err.response?.data?.message ||
        'Failed to analyze game. Please check your PGN format.'
      );
    } finally {
      setAnalyzing(false);
    }
  };

  const samplePGN = `[Event "Casual Game"]
[Site "Local Club"]
[Date "2026.02.06"]
[Round "?"]
[White "Player 1"]
[Black "Player 2"]
[Result "1-0"]

1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 5. O-O Be7 1-0`;

  const loadSample = () => {
    setPgn(samplePGN);
    setError(null);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
        <h2 className="text-2xl font-bold text-white mb-4">Analyze Your Game</h2>
        <p className="text-gray-400 mb-6">
          Upload a PGN file or paste your game notation to get detailed analysis with Stockfish.
        </p>

        {/* File Upload */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Upload PGN File
          </label>
          <input
            type="file"
            accept=".pgn"
            onChange={handleFileUpload}
            className="block w-full text-sm text-gray-400
                     file:mr-4 file:py-2 file:px-4
                     file:rounded file:border-0
                     file:text-sm file:font-semibold
                     file:bg-blue-600 file:text-white
                     hover:file:bg-blue-700 cursor-pointer"
          />
        </div>

        {/* PGN Text Area */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-300">
              Or Paste PGN
            </label>
            <button
              onClick={loadSample}
              className="text-xs text-blue-400 hover:text-blue-300"
            >
              Load Sample
            </button>
          </div>
          <textarea
            value={pgn}
            onChange={(e) => setPgn(e.target.value)}
            placeholder="Paste your PGN here..."
            rows={12}
            className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-gray-300 font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Analysis Settings */}
        <div className="mb-6 p-4 bg-gray-900 rounded-lg">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Analysis Depth: {depth}
          </label>
          <input
            type="range"
            min="5"
            max="25"
            value={depth}
            onChange={(e) => setDepth(parseInt(e.target.value))}
            className="w-full"
            disabled={analyzing}
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>Fast (5)</span>
            <span>Balanced (15)</span>
            <span>Deep (25)</span>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Higher depth = more accurate but slower analysis
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-4 bg-red-900/30 border border-red-700 rounded-lg">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* Progress */}
        {analyzing && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-400">Analyzing game...</span>
              <span className="text-sm text-blue-400">{progress}%</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-2 text-center">
              This may take a few minutes depending on game length...
            </p>
          </div>
        )}

        {/* Analyze Button */}
        <button
          onClick={analyzePGN}
          disabled={!pgn.trim() || analyzing}
          className={`w-full py-3 px-6 rounded-lg font-semibold text-white transition-colors ${
            !pgn.trim() || analyzing
              ? 'bg-gray-600 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          {analyzing ? 'Analyzing...' : 'Analyze Game'}
        </button>
      </div>

      {/* Instructions */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-white mb-3">How to Use</h3>
        <ol className="list-decimal list-inside space-y-2 text-gray-400 text-sm">
          <li>Upload a PGN file or paste your game notation above</li>
          <li>Adjust the analysis depth (recommended: 15 for most games)</li>
          <li>Click "Analyze Game" and wait for Stockfish to process</li>
          <li>Review move-by-move analysis, tactics, and statistics</li>
          <li>Use the interactive board to explore variations</li>
        </ol>

        <div className="mt-4 p-4 bg-blue-900/20 border border-blue-700 rounded">
          <p className="text-blue-300 text-sm">
            <strong>💡 Tip:</strong> Games with 40-60 moves typically take 2-3 minutes to analyze at depth 15.
            Shorter games or lower depth will be faster.
          </p>
        </div>
      </div>
    </div>
  );
};

export default PGNUpload;

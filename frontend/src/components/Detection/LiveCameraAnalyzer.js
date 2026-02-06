import React, { useState, useEffect, useRef } from 'react';
import { Chessboard } from 'react-chessboard';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const LiveCameraAnalyzer = () => {
  const [cameraUrl, setCameraUrl] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentPosition, setCurrentPosition] = useState(null);
  const [error, setError] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(3);
  const intervalRef = useRef(null);

  // Test camera connection
  const testConnection = async () => {
    if (!cameraUrl) {
      setError('Please enter a camera URL');
      return;
    }

    setError(null);
    setAnalyzing(true);

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_URL}/detection/live-stream`,
        { url: cameraUrl },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      setIsConnected(true);
      setCurrentPosition(response.data);
      setError(null);
    } catch (err) {
      console.error('Connection error:', err);
      setError(
        err.response?.data?.message ||
        'Failed to connect to camera. Please check the URL and try again.'
      );
      setIsConnected(false);
    } finally {
      setAnalyzing(false);
    }
  };

  // Capture current position
  const capturePosition = async () => {
    if (!cameraUrl || !isConnected) {
      return;
    }

    setAnalyzing(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_URL}/detection/live-stream`,
        { url: cameraUrl },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      setCurrentPosition(response.data);
    } catch (err) {
      console.error('Capture error:', err);
      setError('Failed to capture position from camera.');
    } finally {
      setAnalyzing(false);
    }
  };

  // Start/stop auto-refresh
  useEffect(() => {
    if (autoRefresh && isConnected) {
      intervalRef.current = setInterval(() => {
        capturePosition();
      }, refreshInterval * 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [autoRefresh, isConnected, refreshInterval]);

  // Start game from current position
  const startGameFromPosition = () => {
    if (!currentPosition || !currentPosition.fen) {
      return;
    }

    // TODO: Navigate to game setup with this FEN
    alert(`Starting game from position: ${currentPosition.fen}`);
  };

  // Common IP Webcam URLs
  const commonUrls = [
    { label: 'IP Webcam (default)', url: 'http://192.168.1.x:8080/shot.jpg' },
    { label: 'DroidCam', url: 'http://192.168.1.x:4747/video' },
    { label: 'EpocCam', url: 'http://192.168.1.x:8080/video' }
  ];

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h2 className="text-3xl font-bold mb-6">Live Camera Analyzer</h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Camera Setup */}
        <div>
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-xl font-semibold mb-4">Camera Setup</h3>

            {/* Camera URL Input */}
            <div className="mb-4">
              <label className="block font-medium mb-2">
                Camera Feed URL
              </label>
              <input
                type="text"
                value={cameraUrl}
                onChange={(e) => setCameraUrl(e.target.value)}
                placeholder="http://192.168.1.100:8080/shot.jpg"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">
                Enter the URL of your IP Webcam or mobile camera app
              </p>
            </div>

            {/* Common URLs */}
            <div className="mb-4">
              <p className="text-sm font-medium mb-2">Common camera apps:</p>
              <div className="space-y-1">
                {commonUrls.map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCameraUrl(item.url)}
                    className="block w-full text-left px-3 py-2 text-sm bg-gray-50 hover:bg-gray-100 rounded"
                  >
                    <span className="font-medium">{item.label}:</span>
                    <code className="text-xs ml-2 text-gray-600">{item.url}</code>
                  </button>
                ))}
              </div>
            </div>

            {/* Connection Status */}
            <div className="mb-4 flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-gray-300'}`} />
              <span className="text-sm font-medium">
                {isConnected ? 'Connected' : 'Not Connected'}
              </span>
            </div>

            {/* Test Connection Button */}
            <button
              onClick={testConnection}
              disabled={!cameraUrl || analyzing}
              className={`w-full py-3 px-6 rounded-lg font-semibold text-white mb-3 ${
                !cameraUrl || analyzing
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {analyzing ? 'Testing...' : 'Test Connection'}
            </button>

            {/* Capture Button */}
            {isConnected && (
              <button
                onClick={capturePosition}
                disabled={analyzing}
                className="w-full py-3 px-6 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold mb-3"
              >
                {analyzing ? 'Capturing...' : 'Capture Position'}
              </button>
            )}

            {/* Auto-Refresh Settings */}
            {isConnected && (
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <label className="font-medium">Auto-Refresh</label>
                  <button
                    onClick={() => setAutoRefresh(!autoRefresh)}
                    className={`px-4 py-2 rounded-lg font-semibold ${
                      autoRefresh
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-200 text-gray-700'
                    }`}
                  >
                    {autoRefresh ? 'ON' : 'OFF'}
                  </button>
                </div>

                {autoRefresh && (
                  <div>
                    <label className="block text-sm mb-2">
                      Refresh every {refreshInterval} seconds
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={refreshInterval}
                      onChange={(e) => setRefreshInterval(parseInt(e.target.value))}
                      className="w-full"
                    />
                  </div>
                )}
              </div>
            )}

            {error && (
              <div className="mt-4 p-4 bg-red-100 border border-red-400 rounded-lg">
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}
          </div>

          {/* Setup Instructions */}
          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-semibold text-blue-900 mb-2">Setup Guide:</h4>
            <ol className="list-decimal list-inside text-sm text-blue-800 space-y-1">
              <li>Install IP Webcam app on your mobile device</li>
              <li>Connect your mobile and computer to the same WiFi</li>
              <li>Start the server in the app</li>
              <li>Copy the URL shown in the app (usually ends with /shot.jpg)</li>
              <li>Paste the URL above and click "Test Connection"</li>
              <li>Position your camera to capture the chess board</li>
            </ol>
          </div>
        </div>

        {/* Right Column: Live Feed & Results */}
        <div>
          {currentPosition ? (
            <div className="space-y-4">
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <h3 className="text-xl font-semibold mb-3">Current Position</h3>

                {currentPosition.board_detected ? (
                  <>
                    {/* Live Camera Feed */}
                    <div className="mb-4 border border-gray-300 rounded-lg overflow-hidden">
                      <img
                        src={cameraUrl}
                        alt="Live camera feed"
                        className="w-full"
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                    </div>

                    {/* Chessboard */}
                    <div className="mb-4">
                      <Chessboard
                        position={currentPosition.fen || 'start'}
                        boardWidth={400}
                        arePiecesDraggable={false}
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">Status:</span>
                        <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                          {autoRefresh ? 'Live Monitoring' : 'Snapshot Captured'}
                        </span>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="font-medium">Pieces Detected:</span>
                        <span className="text-gray-700">
                          {currentPosition.pieces?.length || 0}
                        </span>
                      </div>

                      {currentPosition.fen && (
                        <div className="mt-3">
                          <span className="font-medium">FEN:</span>
                          <code className="block mt-1 p-2 bg-gray-100 rounded text-xs break-all">
                            {currentPosition.fen}
                          </code>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="mt-4 space-y-2">
                      <button
                        onClick={startGameFromPosition}
                        className="w-full py-2 px-4 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold"
                      >
                        Start Game from This Position
                      </button>
                    </div>

                    {/* Piece Details */}
                    {currentPosition.pieces && currentPosition.pieces.length > 0 && (
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
                              {currentPosition.pieces.map((piece, idx) => (
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
                  </>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-red-600 font-medium">
                      No chess board detected in current view
                    </p>
                    <p className="text-sm text-gray-500 mt-2">
                      Adjust camera angle or lighting for better detection
                    </p>
                  </div>
                )}

                {currentPosition.errors && currentPosition.errors.length > 0 && (
                  <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
                    <p className="font-medium text-yellow-800">Warnings:</p>
                    <ul className="list-disc list-inside text-sm text-yellow-700 mt-1">
                      {currentPosition.errors.map((err, idx) => (
                        <li key={idx}>{err}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400 border-2 border-dashed border-gray-300 rounded-lg">
              <div className="text-center p-8">
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
                    d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
                <p className="mt-4 text-lg">Connect to a camera to begin</p>
                <p className="text-sm mt-2">Enter your camera URL and test the connection</p>
              </div>
            </div>
          )}

          {analyzing && !currentPosition && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Analyzing camera feed...</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LiveCameraAnalyzer;

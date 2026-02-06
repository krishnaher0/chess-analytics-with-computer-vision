import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { AnalysisViewer } from '../components/Analysis';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const AnalysisViewPage = () => {
  const { id } = useParams();
  const { token } = useAuth();
  const navigate = useNavigate();

  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchAnalysis();
  }, [id]);

  const fetchAnalysis = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await axios.get(`${API_URL}/analysis/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setAnalysis(response.data.analysis);
    } catch (err) {
      console.error('Failed to fetch analysis:', err);
      setError(
        err.response?.data?.message ||
        'Failed to load analysis. It may have been deleted or you may not have access.'
      );
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-400 mt-4">Loading analysis...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-center">
        <svg
          className="mx-auto h-16 w-16 text-red-500 mb-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
        <h2 className="text-2xl font-bold text-white mb-2">Analysis Not Found</h2>
        <p className="text-gray-400 mb-6">{error}</p>
        <button
          onClick={() => navigate('/analysis/history')}
          className="py-2 px-6 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold"
        >
          Back to History
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Back Button */}
      <button
        onClick={() => navigate('/analysis/history')}
        className="mb-4 flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to History
      </button>

      {/* Analysis Viewer */}
      <AnalysisViewer analysis={analysis} />
    </div>
  );
};

export default AnalysisViewPage;

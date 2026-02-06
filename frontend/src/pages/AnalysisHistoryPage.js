import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const AnalysisHistoryPage = () => {
  const { token } = useAuth();
  const navigate = useNavigate();

  const [analyses, setAnalyses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const [filter, setFilter] = useState('all'); // all, completed, pending

  useEffect(() => {
    fetchAnalyses();
  }, [page, filter]);

  const fetchAnalyses = async () => {
    setLoading(true);
    try {
      const params = { page, limit: 10 };
      if (filter !== 'all') {
        params.status = filter;
      }

      const response = await axios.get(`${API_URL}/analysis/history`, {
        params,
        headers: { Authorization: `Bearer ${token}` }
      });

      setAnalyses(response.data.analyses);
      setPagination(response.data.pagination);
    } catch (error) {
      console.error('Failed to fetch analyses:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteAnalysis = async (id) => {
    if (!window.confirm('Are you sure you want to delete this analysis?')) {
      return;
    }

    try {
      await axios.delete(`${API_URL}/analysis/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Refresh list
      fetchAnalyses();
    } catch (error) {
      console.error('Failed to delete analysis:', error);
      alert('Failed to delete analysis');
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-white">Analysis History</h1>
        <button
          onClick={() => navigate('/analysis/upload')}
          className="py-2 px-6 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors"
        >
          + New Analysis
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
            filter === 'all'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          All
        </button>
        <button
          onClick={() => setFilter('completed')}
          className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
            filter === 'completed'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          Completed
        </button>
        <button
          onClick={() => setFilter('analyzing')}
          className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
            filter === 'analyzing'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          In Progress
        </button>
        <button
          onClick={() => setFilter('failed')}
          className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
            filter === 'failed'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          Failed
        </button>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-400 mt-4">Loading analyses...</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && analyses.length === 0 && (
        <div className="text-center py-12 bg-gray-800 rounded-lg border border-gray-700">
          <svg
            className="mx-auto h-16 w-16 text-gray-600 mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <p className="text-gray-400 text-lg">No analyses found</p>
          <button
            onClick={() => navigate('/analysis/upload')}
            className="mt-4 py-2 px-6 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold"
          >
            Analyze Your First Game
          </button>
        </div>
      )}

      {/* Analysis List */}
      {!loading && analyses.length > 0 && (
        <div className="space-y-4">
          {analyses.map((analysis) => (
            <div
              key={analysis._id}
              className="bg-gray-800 rounded-lg border border-gray-700 p-6 hover:border-gray-600 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  {/* Game Info */}
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-semibold text-white">
                      {analysis.players?.white || 'White'} vs {analysis.players?.black || 'Black'}
                    </h3>
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${
                      analysis.status === 'completed' ? 'bg-green-900 text-green-300' :
                      analysis.status === 'analyzing' ? 'bg-blue-900 text-blue-300' :
                      analysis.status === 'pending' ? 'bg-yellow-900 text-yellow-300' :
                      'bg-red-900 text-red-300'
                    }`}>
                      {analysis.status}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-gray-400 mb-3">
                    {analysis.event && <span>{analysis.event}</span>}
                    {analysis.date && <span>{new Date(analysis.date).toLocaleDateString()}</span>}
                    <span>Depth: {analysis.depth}</span>
                  </div>

                  {/* Statistics (if completed) */}
                  {analysis.status === 'completed' && analysis.statistics && (
                    <div className="flex items-center gap-6 text-sm">
                      <div>
                        <span className="text-gray-500">White Accuracy: </span>
                        <span className="text-white font-semibold">
                          {analysis.statistics.white?.accuracy?.toFixed(1)}%
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">Black Accuracy: </span>
                        <span className="text-white font-semibold">
                          {analysis.statistics.black?.accuracy?.toFixed(1)}%
                        </span>
                      </div>
                      {analysis.tacticalOpportunities && (
                        <div>
                          <span className="text-gray-500">Tactics Missed: </span>
                          <span className="text-red-400 font-semibold">
                            {analysis.tacticalOpportunities.length}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="mt-2 text-xs text-gray-500">
                    Created: {formatDate(analysis.createdAt)}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  {analysis.status === 'completed' && (
                    <button
                      onClick={() => navigate(`/analysis/${analysis._id}`)}
                      className="py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors"
                    >
                      View Analysis
                    </button>
                  )}
                  <button
                    onClick={() => deleteAnalysis(analysis._id)}
                    className="py-2 px-4 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination && pagination.pages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-8">
          <button
            onClick={() => setPage(page - 1)}
            disabled={page === 1}
            className="py-2 px-4 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-600 text-white rounded font-semibold transition-colors"
          >
            Previous
          </button>
          <span className="text-gray-400">
            Page {page} of {pagination.pages}
          </span>
          <button
            onClick={() => setPage(page + 1)}
            disabled={page === pagination.pages}
            className="py-2 px-4 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-600 text-white rounded font-semibold transition-colors"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default AnalysisHistoryPage;

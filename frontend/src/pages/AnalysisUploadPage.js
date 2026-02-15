import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PGNUpload from '../components/Analysis/PGNUpload';
import ImageUploadAnalyzer from '../components/Detection/ImageUploadAnalyzer';

const AnalysisUploadPage = () => {
  const navigate = useNavigate();
  const [method, setMethod] = useState('pgn'); // 'pgn' or 'image'

  const handleAnalysisComplete = (analysisId) => {
    // Navigate to the analysis view
    navigate(`/analysis/${analysisId}`);
  };

  return (
    <div className="max-w-6xl mx-auto p-4">
      <div className="flex justify-center gap-4 mb-8">
        <button
          onClick={() => setMethod('pgn')}
          className={`px-6 py-2 rounded-lg font-semibold transition-colors ${method === 'pgn'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
        >
          Analyze PGN
        </button>
        <button
          onClick={() => setMethod('image')}
          className={`px-6 py-2 rounded-lg font-semibold transition-colors ${method === 'image'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
        >
          Analyze Image
        </button>
      </div>

      <div className="bg-gray-900 rounded-xl overflow-hidden shadow-2xl border border-gray-800">
        {method === 'pgn' ? (
          <div className="p-6">
            <PGNUpload onAnalysisComplete={handleAnalysisComplete} />
          </div>
        ) : (
          <div className="p-6">
            <ImageUploadAnalyzer />
          </div>
        )}
      </div>
    </div>
  );
};

export default AnalysisUploadPage;

import React from 'react';
import { useNavigate } from 'react-router-dom';
import PGNUpload from '../components/Analysis/PGNUpload';

const AnalysisUploadPage = () => {
  const navigate = useNavigate();

  const handleAnalysisComplete = (analysisId) => {
    // Navigate to the analysis view
    navigate(`/analysis/${analysisId}`);
  };

  return (
    <div>
      <PGNUpload onAnalysisComplete={handleAnalysisComplete} />
    </div>
  );
};

export default AnalysisUploadPage;

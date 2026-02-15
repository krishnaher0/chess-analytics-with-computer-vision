import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { GameProvider } from './context/GameContext';

import Layout from './components/Layout/Layout';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import HomePage from './pages/HomePage';
import GameSetupPage from './pages/GameSetupPage';
import GamePlayPage from './pages/GamePlayPage';
import CameraGamePage from './pages/CameraGamePage';
import AnalysisPage from './pages/AnalysisPage';
import TournamentListPage from './pages/TournamentListPage';
import TournamentCreatePage from './pages/TournamentCreatePage';
import TournamentDetailPage from './pages/TournamentDetailPage';
import LeaderboardsPage from './pages/LeaderboardsPage';
import ProfilePage from './pages/ProfilePage';

// Analysis pages
import AnalysisHistoryPage from './pages/AnalysisHistoryPage';
import AnalysisUploadPage from './pages/AnalysisUploadPage';
import AnalysisViewPage from './pages/AnalysisViewPage';

// Vision/Detection components
import {
  ImageUploadAnalyzer,
  VideoUploadAnalyzer,
  LiveCameraAnalyzer
} from './components/Detection';

/* ── guard: redirects to /login when not authenticated ── */
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-500">Loading…</div>;
  return user ? children : <Navigate to="/login" replace />;
};

/* ── guard: redirects to / when already logged in ──── */
const AuthRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  return user ? <Navigate to="/" replace /> : children;
};

import { ChallengeNotification } from './components/Game';

function App() {
  return (
    <AuthProvider>
      <GameProvider>
        <ChallengeNotification />
        <BrowserRouter>
          <Routes>
            {/* public */}
            <Route path="/login" element={<AuthRoute><LoginPage /></AuthRoute>} />
            <Route path="/register" element={<AuthRoute><RegisterPage /></AuthRoute>} />

            {/* protected — wrapped in Layout */}
            <Route path="/" element={<ProtectedRoute><Layout><HomePage /></Layout></ProtectedRoute>} />

            {/* game routes */}
            <Route path="/game/setup" element={<ProtectedRoute><Layout><GameSetupPage /></Layout></ProtectedRoute>} />
            <Route path="/game/camera" element={<ProtectedRoute><Layout><CameraGamePage /></Layout></ProtectedRoute>} />
            <Route path="/game/:gameId" element={<ProtectedRoute><Layout><GamePlayPage /></Layout></ProtectedRoute>} />
            <Route path="/game/analysis/:gameId" element={<ProtectedRoute><Layout><AnalysisPage /></Layout></ProtectedRoute>} />

            {/* detection/vision routes */}
            <Route path="/detect/image" element={<ProtectedRoute><Layout><ImageUploadAnalyzer /></Layout></ProtectedRoute>} />
            <Route path="/detect/video" element={<ProtectedRoute><Layout><VideoUploadAnalyzer /></Layout></ProtectedRoute>} />
            <Route path="/detect/live" element={<ProtectedRoute><Layout><LiveCameraAnalyzer /></Layout></ProtectedRoute>} />

            {/* analysis routes */}
            <Route path="/analysis/history" element={<ProtectedRoute><Layout><AnalysisHistoryPage /></Layout></ProtectedRoute>} />
            <Route path="/analysis/upload" element={<ProtectedRoute><Layout><AnalysisUploadPage /></Layout></ProtectedRoute>} />
            <Route path="/analysis/:id" element={<ProtectedRoute><Layout><AnalysisViewPage /></Layout></ProtectedRoute>} />

            {/* tournament routes */}
            <Route path="/tournaments" element={<ProtectedRoute><Layout><TournamentListPage /></Layout></ProtectedRoute>} />
            <Route path="/tournaments/create" element={<ProtectedRoute><Layout><TournamentCreatePage /></Layout></ProtectedRoute>} />
            <Route path="/tournaments/:tournamentId" element={<ProtectedRoute><Layout><TournamentDetailPage /></Layout></ProtectedRoute>} />

            {/* leaderboards */}
            <Route path="/leaderboards" element={<ProtectedRoute><Layout><LeaderboardsPage /></Layout></ProtectedRoute>} />

            {/* profile */}
            <Route path="/profile" element={<ProtectedRoute><Layout><ProfilePage /></Layout></ProtectedRoute>} />

            {/* fallback */}
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </BrowserRouter>
      </GameProvider>
    </AuthProvider>
  );
}

export default App;

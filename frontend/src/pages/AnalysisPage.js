import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Chessboard } from 'react-chessboard';
import { useAuth } from '../context/AuthContext';
import { qualityBadgeClass, pieceToSymbol } from '../utils/chessHelpers';
import api from '../utils/api';

export default function AnalysisPage() {
  const { gameId }  = useParams();
  const { token }   = useAuth();
  const [game, setGame]             = useState(null);
  const [analysis, setAnalysis]     = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [selectedMoveIdx, setSelectedMoveIdx] = useState(null);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');

  /* ── fetch game + analysis ──── */
  useEffect(() => {
    const load = async () => {
      try {
        const [gameRes, analysisRes] = await Promise.all([
          api.get(`/games/${gameId}`,            { headers: { Authorization: `Bearer ${token}` } }),
          api.post(`/games/analysis/${gameId}`,  {}, { headers: { Authorization: `Bearer ${token}` } }),
        ]);
        setGame(gameRes.data);
        setAnalysis(analysisRes.data.analysis);
        setRecommendations(analysisRes.data.recommendations || []);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [gameId, token]);

  /* ── download PGN ──── */
  const downloadPgn = () => {
    if (!game?.pgn) return;
    const blob = new Blob([game.pgn], { type: 'text/plain' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url;
    a.download = `game_${gameId}.pgn`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return <div className="text-center text-gray-500 mt-20">Loading analysis…</div>;
  if (error)   return <div className="text-center text-red-400 mt-20">{error}</div>;
  if (!game)   return <div className="text-center text-gray-500 mt-20">Game not found.</div>;

  const moves = game.moves || [];
  const displayFen = selectedMoveIdx !== null
    ? (selectedMoveIdx === 0 ? moves[0]?.fenBefore : moves[selectedMoveIdx]?.fenAfter)
    : game.currentFen;

  /* quality colour for the move highlight */
  const qualityColor = (q) => {
    switch (q) {
      case 'good':       return '#22c55e';
      case 'inaccuracy': return '#eab308';
      case 'mistake':    return '#f97316';
      case 'blunder':    return '#ef4444';
      default:           return '#6b7280';
    }
  };

  /* ── phase summary card helper ──── */
  const PhaseCard = ({ title, data }) => {
    if (!data) return null;
    return (
      <div className="card text-center">
        <h3 className="text-sm font-semibold text-gray-400 uppercase mb-2">{title}</h3>
        <p className="text-2xl font-bold text-primary-400">{data.accuracy?.toFixed(0) ?? '—'}%</p>
        <div className="flex justify-center gap-3 mt-2 text-xs text-gray-500">
          <span>Inaccuracies: {data.inaccuracies ?? 0}</span>
          <span>Mistakes: {data.mistakes ?? 0}</span>
          <span>Blunders: {data.blunders ?? 0}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* left: board replay + phase summary */}
      <div className="flex flex-col gap-4 items-center">
        <Chessboard
          position={displayFen || 'start'}
          boardWidth={Math.min(440, window.innerWidth - 40)}
          areDragPiecesEnabled={false}
        />

        {/* phase summary row */}
        <div className="grid grid-cols-3 gap-3 w-full">
          <PhaseCard title="Opening"    data={analysis?.opening}    />
          <PhaseCard title="Middlegame" data={analysis?.middlegame} />
          <PhaseCard title="Endgame"    data={analysis?.endgame}    />
        </div>
      </div>

      {/* right: move list + recommendations + PGN download */}
      <div className="flex flex-col gap-4 w-full lg:w-80">
        {/* overall accuracy */}
        <div className="card text-center">
          <p className="text-gray-400 text-sm">Overall Accuracy</p>
          <p className="text-3xl font-bold text-primary-400">{analysis?.overall?.accuracy?.toFixed(1) ?? '—'}%</p>
          <p className="text-xs text-gray-500 mt-1">
            {analysis?.overall?.totalBlunders ?? 0} blunders · {analysis?.overall?.totalMistakes ?? 0} mistakes
          </p>
        </div>

        {/* recommendations */}
        {recommendations.length > 0 && (
          <div className="card">
            <h3 className="font-semibold text-sm text-gray-400 mb-2">Recommendations</h3>
            <ul className="flex flex-col gap-2">
              {recommendations.map((r, i) => (
                <li key={i} className="text-sm text-gray-300 flex gap-2">
                  <span className="text-primary-500">●</span>
                  {r}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* move-by-move list */}
        <div className="card max-h-80 overflow-y-auto">
          <h3 className="font-semibold text-sm text-gray-400 mb-2">Move-by-Move</h3>
          <div className="flex flex-col gap-1">
            {moves.map((m, i) => {
              const isSelected = selectedMoveIdx === i;
              const quality    = m.quality || 'good';
              return (
                <button
                  key={i}
                  onClick={() => setSelectedMoveIdx(i)}
                  className={`flex items-center gap-2 px-2 py-1 rounded-lg text-sm text-left transition-colors
                    ${isSelected ? 'bg-gray-700' : 'hover:bg-gray-800'}`}
                >
                  <span className="text-gray-600 w-8 text-right font-mono">
                    {m.movedBy === 'white' ? `${Math.ceil((i+1)/2)}.` : ''}
                  </span>
                  <span className={`font-mono font-semibold ${m.movedBy === 'white' ? 'text-gray-100' : 'text-gray-400'}`}>
                    {m.san}
                  </span>
                  <span className={qualityBadgeClass(quality)}>{quality}</span>
                  {m.stockfishEval != null && (
                    <span className="ml-auto text-gray-500 font-mono text-xs">
                      {(m.stockfishEval / 100).toFixed(2)}
                    </span>
                  )}
                  {m.bestMove && m.bestMove !== m.san && (
                    <span className="text-accent-500 text-xs ml-1">Best: {m.bestMove}</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* PGN download */}
        <button onClick={downloadPgn} disabled={!game.pgn} className="btn-secondary">
          Download PGN
        </button>
      </div>
    </div>
  );
}

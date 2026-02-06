/**
 * Shared chess-related helpers used across the frontend.
 */

/* ── map backend piece identifiers to Unicode glyphs ── */
const PIECE_SYMBOLS = {
  white_king:   '♔', white_queen:  '♕', white_rook:   '♖',
  white_bishop: '♗', white_knight: '♘', white_pawn:   '♙',
  black_king:   '♚', black_queen:  '♛', black_rook:   '♜',
  black_bishop: '♝', black_knight: '♞', black_pawn:   '♟',
  K: '♔', Q: '♕', R: '♖', B: '♗', N: '♘', P: '♙',
  k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟',
};
export const pieceToSymbol = (piece) => PIECE_SYMBOLS[piece] || '?';

/* ── time-control presets ──────────────────────────────── */
export const TIME_CONTROLS = [
  { label: 'Bullet  1+0',  totalSeconds: 60,  incrementSeconds: 0,  type: 'bullet' },
  { label: 'Bullet  2+1',  totalSeconds: 120, incrementSeconds: 1,  type: 'bullet' },
  { label: 'Blitz   3+0',  totalSeconds: 180, incrementSeconds: 0,  type: 'blitz'  },
  { label: 'Blitz   3+2',  totalSeconds: 180, incrementSeconds: 2,  type: 'blitz'  },
  { label: 'Blitz   5+0',  totalSeconds: 300, incrementSeconds: 0,  type: 'blitz'  },
  { label: 'Rapid  10+0',  totalSeconds: 600, incrementSeconds: 0,  type: 'rapid'  },
  { label: 'Rapid  15+10', totalSeconds: 900, incrementSeconds: 10, type: 'rapid'  },
];

export const BOT_DIFFICULTIES = [
  { label: 'Beginner',     value: 'beginner',     elo: 800  },
  { label: 'Intermediate', value: 'intermediate', elo: 1400 },
  { label: 'Advanced',     value: 'advanced',     elo: 2000 },
  { label: 'Expert',       value: 'expert',       elo: null  },
];

/* ── format seconds → "M:SS" ─────────────────────────── */
export const formatTime = (ms) => {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
};

/* ── move-quality badge class ─────────────────────────── */
export const qualityBadgeClass = (quality) => {
  switch (quality) {
    case 'good':        return 'badge badge-good';
    case 'inaccuracy':  return 'badge badge-inaccuracy';
    case 'mistake':     return 'badge badge-mistake';
    case 'blunder':     return 'badge badge-blunder';
    default:            return 'badge badge-good';
  }
};

/* ── eval bar: convert centipawn number to display string ─ */
export const formatEval = (evalObj) => {
  if (!evalObj) return '0.00';
  if (evalObj.type === 'mate') return evalObj.value > 0 ? `M${evalObj.value}` : `-M${Math.abs(evalObj.value)}`;
  return (evalObj.value / 100).toFixed(2);
};

/* ── starting FEN constant ──────────────────────────────── */
export const STARTING_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

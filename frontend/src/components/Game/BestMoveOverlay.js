import React from 'react';

/**
 * BestMoveOverlay Component
 *
 * Displays an arrow overlay on the chessboard showing the best move
 * Uses SVG to draw an arrow from source square to target square
 *
 * Props:
 * - bestMove: string in UCI format (e.g., 'e2e4', 'e7e8q')
 * - boardWidth: width of the chessboard in pixels
 * - boardOrientation: 'white' or 'black'
 * - show: boolean to control visibility
 */
const BestMoveOverlay = ({ bestMove, boardWidth = 400, boardOrientation = 'white', show = true }) => {
  if (!show || !bestMove || bestMove.length < 4) {
    return null;
  }

  // Parse UCI move
  const fromSquare = bestMove.substring(0, 2); // e.g., 'e2'
  const toSquare = bestMove.substring(2, 4);   // e.g., 'e4'
  // Note: Promotion piece (if any) is at position 4

  // Convert square notation to coordinates
  const squareToCoords = (square) => {
    const file = square.charCodeAt(0) - 'a'.charCodeAt(0); // 0-7
    const rank = parseInt(square[1]) - 1; // 0-7

    // If board is flipped (black's perspective), adjust coordinates
    const adjustedFile = boardOrientation === 'white' ? file : 7 - file;
    const adjustedRank = boardOrientation === 'white' ? 7 - rank : rank;

    const squareSize = boardWidth / 8;
    const x = adjustedFile * squareSize + squareSize / 2;
    const y = adjustedRank * squareSize + squareSize / 2;

    return { x, y };
  };

  const from = squareToCoords(fromSquare);
  const to = squareToCoords(toSquare);

  // Calculate arrow angle and length
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const angle = Math.atan2(dy, dx);
  const length = Math.sqrt(dx * dx + dy * dy);

  // Arrowhead size
  const arrowheadLength = 20;
  const arrowheadWidth = 15;

  // Shorten the arrow slightly so it doesn't overlap piece completely
  const shortenFactor = 0.85;
  const adjustedToX = from.x + dx * shortenFactor;
  const adjustedToY = from.y + dy * shortenFactor;

  return (
    <div
      className="absolute inset-0 pointer-events-none z-10"
      style={{ width: `${boardWidth}px`, height: `${boardWidth}px` }}
    >
      <svg
        width={boardWidth}
        height={boardWidth}
        className="absolute inset-0"
      >
        {/* Arrow line */}
        <line
          x1={from.x}
          y1={from.y}
          x2={adjustedToX}
          y2={adjustedToY}
          stroke="rgba(255, 170, 0, 0.9)"
          strokeWidth="6"
          strokeLinecap="round"
        />

        {/* Arrowhead */}
        <polygon
          points={`
            ${adjustedToX + arrowheadLength * Math.cos(angle)},${adjustedToY + arrowheadLength * Math.sin(angle)}
            ${adjustedToX + arrowheadWidth * Math.cos(angle + Math.PI / 2)},${adjustedToY + arrowheadWidth * Math.sin(angle + Math.PI / 2)}
            ${adjustedToX + arrowheadWidth * Math.cos(angle - Math.PI / 2)},${adjustedToY + arrowheadWidth * Math.sin(angle - Math.PI / 2)}
          `}
          fill="rgba(255, 170, 0, 0.9)"
        />

        {/* Glow effect */}
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
      </svg>
    </div>
  );
};

export default BestMoveOverlay;

import React from 'react';

/**
 * EvaluationBar Component
 *
 * Displays a vertical bar showing the chess position evaluation
 * White advantage = top portion (white/light gray)
 * Black advantage = bottom portion (black/dark gray)
 *
 * Props:
 * - evaluation: { type: 'cp'|'mate', value: number }
 * - height: height in pixels (default 400)
 */
const EvaluationBar = ({ evaluation, height = 400 }) => {
  if (!evaluation) {
    return (
      <div
        className="w-8 bg-gray-300 rounded"
        style={{ height: `${height}px` }}
      >
        <div className="h-full flex items-center justify-center">
          <span className="text-xs text-gray-500 transform -rotate-90 whitespace-nowrap">
            No eval
          </span>
        </div>
      </div>
    );
  }

  // Convert evaluation to percentage (0-100, where 50 = equal)
  const getPercentage = () => {
    if (evaluation.type === 'mate') {
      // Mate in N: show overwhelming advantage
      return evaluation.value > 0 ? 95 : 5;
    }

    // Centipawn evaluation
    // Map roughly -500 to +500 cp to 0-100%
    // Use tanh-like curve for better visualization
    const cp = evaluation.value;
    const normalized = cp / 500; // -1 to +1 range
    const curved = Math.tanh(normalized * 1.5); // Smooth sigmoid
    const percentage = (curved + 1) * 50; // 0 to 100

    return Math.max(5, Math.min(95, percentage));
  };

  // Get display text
  const getDisplayText = () => {
    if (evaluation.type === 'mate') {
      const mateIn = Math.abs(evaluation.value);
      return evaluation.value > 0
        ? `M${mateIn}`
        : `-M${mateIn}`;
    }

    const cp = evaluation.value;
    const pawn = (cp / 100).toFixed(1);

    if (cp > 0) {
      return `+${pawn}`;
    } else if (cp < 0) {
      return pawn;
    } else {
      return '0.0';
    }
  };

  const whitePercentage = getPercentage();
  const blackPercentage = 100 - whitePercentage;
  const displayText = getDisplayText();

  // Determine if evaluation favors white or black
  const favorsWhite = evaluation.type === 'mate'
    ? evaluation.value > 0
    : evaluation.value > 0;

  return (
    <div className="relative flex flex-col">
      {/* Evaluation Bar */}
      <div
        className="relative w-10 bg-gray-800 rounded overflow-hidden border-2 border-gray-700"
        style={{ height: `${height}px` }}
      >
        {/* Black portion (bottom) */}
        <div
          className="absolute bottom-0 left-0 right-0 bg-gray-900 transition-all duration-300"
          style={{ height: `${blackPercentage}%` }}
        />

        {/* White portion (top) */}
        <div
          className="absolute top-0 left-0 right-0 bg-gray-100 transition-all duration-300"
          style={{ height: `${whitePercentage}%` }}
        />

        {/* Center line */}
        <div
          className="absolute left-0 right-0 border-t-2 border-gray-400"
          style={{ top: '50%' }}
        />

        {/* Evaluation text overlay */}
        <div
          className={`absolute left-0 right-0 flex items-center justify-center ${
            favorsWhite ? 'text-gray-900' : 'text-gray-100'
          }`}
          style={{
            top: favorsWhite ? `${whitePercentage / 2}%` : `${50 + blackPercentage / 2}%`,
            transform: 'translateY(-50%)'
          }}
        >
          <span className="text-xs font-bold bg-opacity-50 px-1 rounded">
            {displayText}
          </span>
        </div>
      </div>

      {/* Labels */}
      <div className="mt-2 text-center">
        <div className="text-xs text-gray-500">
          Evaluation
        </div>
      </div>
    </div>
  );
};

export default EvaluationBar;

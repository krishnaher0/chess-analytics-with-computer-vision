/**
 * feedbackEngine.js
 *
 * Pure-function analysis utilities.  No database calls, no HTTP
 * requests — every function is deterministic given its inputs.
 */

// ── Material point values ──────────────────────────────────────

const PIECE_VALUES = {
  p: 1, n: 3, b: 3, r: 5, q: 9,
  // King has no material value in the sum
  k: 0
};

// ── Phase classification ──────────────────────────────────────

/**
 * classifyPhase(moveNumber, totalMaterial)
 *
 * Determines the game phase based on the move number and the
 * total material still on the board (both sides combined).
 *
 * @param {number} moveNumber    – 1-based move number
 * @param {number} totalMaterial – sum of all pieces' point values
 * @returns {'opening'|'middlegame'|'endgame'}
 */
function classifyPhase(moveNumber, totalMaterial) {
  if (totalMaterial >= 28 && moveNumber <= 15) return 'opening';
  if (totalMaterial >= 12) return 'middlegame';
  return 'endgame';
}

// ── Material counting from FEN ─────────────────────────────────

/**
 * calculateMaterialFromFen(fen)
 *
 * Parses the board portion (first field) of a FEN string and
 * sums the point value of every piece on the board.
 *
 * @param {string} fen
 * @returns {number} total material (both sides)
 */
function calculateMaterialFromFen(fen) {
  if (!fen) return 0;

  const boardPart = fen.split(' ')[0]; // e.g. "rnbqkbnr/pppppppp/..."
  let total = 0;

  for (const ch of boardPart) {
    const lower = ch.toLowerCase();
    if (PIECE_VALUES[lower] !== undefined) {
      total += PIECE_VALUES[lower];
    }
    // digits and '/' are skipped automatically
  }

  return total;
}

// ── Move-quality classification ────────────────────────────────

/**
 * classifyMoveQuality(evalBefore, evalAfter, movingColor)
 *
 * Both evals are in centipawns from WHITE's perspective (as
 * Stockfish reports).  We flip the sign for black so that
 * "evalLoss" is always from the moving side's point of view.
 *
 * @param {number} evalBefore  – cp eval BEFORE the move (white POV)
 * @param {number} evalAfter   – cp eval AFTER the move  (white POV)
 * @param {'white'|'black'} movingColor
 * @returns {'good'|'inaccuracy'|'mistake'|'blunder'}
 */
function classifyMoveQuality(evalBefore, evalAfter, movingColor) {
  let before = evalBefore;
  let after  = evalAfter;

  // Flip perspective for black so that a positive evalLoss means
  // the position got worse for the moving player.
  if (movingColor === 'black') {
    before = -before;
    after  = -after;
  }

  const evalLoss = before - after;   // positive = got worse for mover

  if (evalLoss <= 0)   return 'good';
  if (evalLoss <= 30)  return 'inaccuracy';
  if (evalLoss <= 100) return 'mistake';
  return 'blunder';
}

// ── Full-game analysis ─────────────────────────────────────────

/**
 * analyzeGame(game)
 *
 * Accepts a game document (or plain object) whose .moves array
 * contains { fenBefore, fenAfter, stockfishEval, movedBy, san, moveNumber }.
 *
 * Returns a structured accuracy breakdown by phase.
 *
 * @param {Object} game
 * @returns {Object} { opening, middlegame, endgame, overall }
 */
function analyzeGame(game) {
  const phases = {
    opening:    { totalMoves: 0, inaccuracies: 0, mistakes: 0, blunders: 0 },
    middlegame: { totalMoves: 0, inaccuracies: 0, mistakes: 0, blunders: 0 },
    endgame:    { totalMoves: 0, inaccuracies: 0, mistakes: 0, blunders: 0 }
  };

  const moves = game.moves || [];

  for (let i = 0; i < moves.length; i++) {
    const move = moves[i];
    const material = calculateMaterialFromFen(move.fenBefore);
    const phase    = classifyPhase(move.moveNumber || (i + 1), material);

    // evalBefore = the stockfishEval from the PREVIOUS move record
    // (represents the position evaluation before the current move was made).
    // For the very first move we have no previous eval; use 0 (equal).
    const evalBefore = i === 0 ? 0 : (moves[i - 1].stockfishEval || 0);
    const evalAfter  = move.stockfishEval || 0;

    const quality = classifyMoveQuality(evalBefore, evalAfter, move.movedBy);

    phases[phase].totalMoves++;
    if (quality === 'inaccuracy') phases[phase].inaccuracies++;
    if (quality === 'mistake')    phases[phase].mistakes++;
    if (quality === 'blunder')    phases[phase].blunders++;
  }

  // Compute accuracy for each phase
  const result = {};
  for (const [phaseName, data] of Object.entries(phases)) {
    result[phaseName] = computePhaseAccuracy(data);
  }

  // Overall accuracy across all moves combined
  const allMoves = {
    totalMoves:    phases.opening.totalMoves    + phases.middlegame.totalMoves    + phases.endgame.totalMoves,
    inaccuracies:  phases.opening.inaccuracies  + phases.middlegame.inaccuracies  + phases.endgame.inaccuracies,
    mistakes:      phases.opening.mistakes      + phases.middlegame.mistakes      + phases.endgame.mistakes,
    blunders:      phases.opening.blunders      + phases.middlegame.blunders      + phases.endgame.blunders
  };
  const overallAcc = computePhaseAccuracy(allMoves);

  result.overall = {
    accuracy:      overallAcc.accuracy,
    totalBlunders: allMoves.blunders,
    totalMistakes: allMoves.mistakes
  };

  return result;
}

/**
 * Internal helper: computes accuracy percentage for a single phase.
 *
 * accuracy = ((totalMoves - (inaccuracies*0.5 + mistakes*1 + blunders*2)) / totalMoves) * 100
 * Clamped to [0, 100].
 */
function computePhaseAccuracy({ totalMoves, inaccuracies, mistakes, blunders }) {
  if (totalMoves === 0) {
    return { accuracy: 100, inaccuracies: 0, mistakes: 0, blunders: 0 };
  }

  const penalty = inaccuracies * 0.5 + mistakes * 1 + blunders * 2;
  const raw     = ((totalMoves - penalty) / totalMoves) * 100;

  return {
    accuracy:     Math.min(100, Math.max(0, raw)),
    inaccuracies,
    mistakes,
    blunders
  };
}

// ── Recommendation generation ─────────────────────────────────

/**
 * generateRecommendations(analysisResult)
 *
 * @param {Object} analysisResult – the object returned by analyzeGame()
 * @returns {string[]}            – array of recommendation strings
 */
function generateRecommendations(analysisResult) {
  const recs = [];

  const { opening, middlegame, endgame, overall } = analysisResult;

  if (opening && opening.accuracy < 70 && opening.blunders > 1) {
    recs.push(
      'Review your opening repertoire. Study common opening traps and principles (control center, develop pieces, king safety).'
    );
  }

  if (middlegame && middlegame.accuracy < 65) {
    recs.push(
      'Practice tactical puzzles focusing on forks, pins, skewers, and discovered attacks.'
    );
  }

  if (endgame && endgame.accuracy < 60) {
    recs.push(
      'Study basic endgame techniques: King and Pawn vs King, Rook endgames, and opposition concepts.'
    );
  }

  if (overall && overall.totalBlunders > 3) {
    recs.push(
      'You made several blunders this game. Slow down before each move and consider at least 2-3 candidate moves.'
    );
  }

  if (recs.length === 0) {
    recs.push('Good game! Keep practicing to maintain your level.');
  }

  return recs;
}

// ── Exports ────────────────────────────────────────────────────

module.exports = {
  classifyPhase,
  calculateMaterialFromFen,
  classifyMoveQuality,
  analyzeGame,
  generateRecommendations
};

const express = require('express');
const router = express.Router();
const { Chess } = require('chess.js');
const { stockfish, initStockfish } = require('../utils/stockfish');
const { verifyToken } = require('../middleware/auth');
const Analysis = require('../models/Analysis');

// ── POST /analyze/position ─────────────────────────────────────
// Analyze a single position with Stockfish
// Body: { fen, depth?, multipv? }
// Returns: { evaluation, bestMove, topMoves[] }

router.post('/position', verifyToken, async (req, res) => {
  try {
    const { fen, depth = 15, multipv = 3 } = req.body;

    if (!fen) {
      return res.status(400).json({ message: 'FEN position is required.' });
    }

    // Validate FEN using chess.js
    try {
      const chess = new Chess(fen);
      if (!chess.isGameOver()) {
        // Valid position
      }
    } catch (err) {
      return res.status(400).json({ message: 'Invalid FEN string.' });
    }

    // Initialize Stockfish if not already
    await initStockfish();

    // Set position
    await stockfish.setPosition(fen);

    // Get evaluation and best move
    const [evaluation, bestMove, topMoves] = await Promise.all([
      stockfish.getEvaluation(depth),
      stockfish.getBestMove(depth),
      multipv > 1 ? stockfish.getTopMoves(multipv, depth) : Promise.resolve([])
    ]);

    return res.status(200).json({
      fen,
      evaluation,      // { type: 'cp'|'mate', value: number }
      bestMove,        // e.g. 'e2e4'
      topMoves,        // [{ move, eval }, ...]
      depth,
      multipv
    });
  } catch (error) {
    console.error('[Analysis] /position error:', error.message);
    return res.status(500).json({
      message: 'Failed to analyze position.',
      error: error.message
    });
  }
});

// ── POST /analyze/move ─────────────────────────────────────────
// Analyze quality of a move that was played
// Body: { fen, move }
// Returns: { quality, evaluation, bestMove, difference }

router.post('/move', verifyToken, async (req, res) => {
  try {
    const { fen, move, depth = 15 } = req.body;

    if (!fen || !move) {
      return res.status(400).json({ message: 'FEN and move are required.' });
    }

    // Validate FEN and move
    const chess = new Chess(fen);
    const moveObj = chess.move(move);
    if (!moveObj) {
      return res.status(400).json({ message: 'Invalid move for this position.' });
    }

    const fenAfterMove = chess.fen();

    // Initialize Stockfish
    await initStockfish();

    // Analyze position BEFORE the move
    await stockfish.setPosition(fen);
    const evalBefore = await stockfish.getEvaluation(depth);
    const bestMove = await stockfish.getBestMove(depth);

    // Analyze position AFTER the move
    await stockfish.setPosition(fenAfterMove);
    const evalAfter = await stockfish.getEvaluation(depth);

    // Calculate evaluation difference (from player's perspective)
    const difference = calculateEvalDifference(evalBefore, evalAfter, chess.turn());

    // Classify move quality
    const quality = classifyMoveQuality(difference, move === bestMove);

    return res.status(200).json({
      fen,
      move,
      fenAfter: fenAfterMove,
      quality,           // 'brilliant', 'best', 'excellent', 'good', 'inaccuracy', 'mistake', 'blunder'
      evalBefore,
      evalAfter,
      bestMove,
      difference,        // centipawn loss (negative = improvement)
      wasBestMove: move === bestMove
    });
  } catch (error) {
    console.error('[Analysis] /move error:', error.message);
    return res.status(500).json({
      message: 'Failed to analyze move.',
      error: error.message
    });
  }
});

// ── POST /analyze/game ─────────────────────────────────────────
// Analyze a complete game from PGN
// Body: { pgn, depth? }
// Returns: full game analysis with move-by-move evaluation

router.post('/game', verifyToken, async (req, res) => {
  try {
    const { pgn, depth = 15 } = req.body;

    if (!pgn) {
      return res.status(400).json({ message: 'PGN is required.' });
    }

    // Parse PGN
    const chess = new Chess();
    const loaded = chess.loadPgn(pgn);
    if (!loaded) {
      return res.status(400).json({ message: 'Invalid PGN format.' });
    }

    // Initialize Stockfish
    await initStockfish();

    // Reset to start
    chess.reset();
    const moves = [];
    let position = chess.fen();

    // Analyze each position
    while (chess.history().length < chess.history({ verbose: true }).length || !chess.isGameOver()) {
      const history = chess.history();
      const moveObj = chess.history({ verbose: true })[history.length - 1];

      if (!moveObj) break;

      // Get position before this move
      chess.undo();
      const fenBefore = chess.fen();

      // Analyze
      await stockfish.setPosition(fenBefore);
      const evalBefore = await stockfish.getEvaluation(depth);
      const bestMove = await stockfish.getBestMove(depth);

      // Re-apply move
      chess.move(moveObj);
      const fenAfter = chess.fen();

      await stockfish.setPosition(fenAfter);
      const evalAfter = await stockfish.getEvaluation(depth);

      const difference = calculateEvalDifference(evalBefore, evalAfter, chess.turn());
      const quality = classifyMoveQuality(difference, moveObj.san === bestMove);

      moves.push({
        moveNumber: Math.ceil((history.length + 1) / 2),
        side: moveObj.color === 'w' ? 'white' : 'black',
        move: moveObj.san,
        uci: moveObj.from + moveObj.to + (moveObj.promotion || ''),
        fenBefore,
        fenAfter,
        evalBefore,
        evalAfter,
        bestMove,
        quality,
        difference
      });

      if (chess.isGameOver()) break;
    }

    // Calculate statistics
    const whiteAccuracy = calculateAccuracy(moves.filter(m => m.side === 'white'));
    const blackAccuracy = calculateAccuracy(moves.filter(m => m.side === 'black'));

    return res.status(200).json({
      pgn,
      moves,
      statistics: {
        white: whiteAccuracy,
        black: blackAccuracy
      }
    });
  } catch (error) {
    console.error('[Analysis] /game error:', error.message);
    return res.status(500).json({
      message: 'Failed to analyze game.',
      error: error.message
    });
  }
});

// ── Helper Functions ───────────────────────────────────────────

/**
 * Calculate evaluation difference in centipawns
 * Positive = improvement, Negative = decline
 */
function calculateEvalDifference(evalBefore, evalAfter, turn) {
  // Convert both to centipawns from player's perspective
  let cpBefore = evalToCP(evalBefore);
  let cpAfter = evalToCP(evalAfter);

  // If it's black's turn after the move, flip the sign
  if (turn === 'b') {
    cpBefore = -cpBefore;
    cpAfter = -cpAfter;
  }

  // Return centipawn loss (negative = player improved)
  return cpBefore - cpAfter;
}

/**
 * Convert evaluation object to centipawns
 */
function evalToCP(evalObj) {
  if (evalObj.type === 'mate') {
    // Mate in N moves: assign large value
    return evalObj.value > 0 ? 10000 : -10000;
  }
  return evalObj.value;
}

/**
 * Classify move quality based on centipawn loss
 */
function classifyMoveQuality(cpLoss, wasBestMove) {
  if (wasBestMove) return 'best';
  if (cpLoss <= 10) return 'excellent';
  if (cpLoss <= 25) return 'good';
  if (cpLoss <= 50) return 'inaccuracy';
  if (cpLoss <= 100) return 'mistake';
  return 'blunder';
}

/**
 * Calculate accuracy percentage for a set of moves
 */
function calculateAccuracy(moves) {
  if (moves.length === 0) return { accuracy: 0, moveQuality: {} };

  const quality = {
    best: 0,
    excellent: 0,
    good: 0,
    inaccuracy: 0,
    mistake: 0,
    blunder: 0
  };

  let totalLoss = 0;

  moves.forEach(move => {
    quality[move.quality] = (quality[move.quality] || 0) + 1;
    totalLoss += Math.abs(move.difference);
  });

  // Accuracy formula: max(0, 100 - average loss)
  const avgLoss = totalLoss / moves.length;
  const accuracy = Math.max(0, Math.min(100, 100 - (avgLoss / 5)));

  return {
    accuracy: Math.round(accuracy * 10) / 10,
    moveQuality: quality,
    totalMoves: moves.length,
    avgCentipawnLoss: Math.round(avgLoss)
  };
}

// ── POST /analyze/pgn/full ────────────────────────────────────
// Create a full analysis from PGN and save to database
// Body: { pgn, depth?, saveAnalysis? }
// Returns: { analysisId, analysis }

router.post('/pgn/full', verifyToken, async (req, res) => {
  try {
    const { pgn, depth = 15, saveAnalysis = true } = req.body;

    if (!pgn) {
      return res.status(400).json({ message: 'PGN is required.' });
    }

    // Create analysis document
    const analysis = new Analysis({
      userId: req.userId,
      pgn,
      depth,
      status: 'analyzing'
    });

    if (saveAnalysis) {
      await analysis.save();
    }

    // Parse PGN
    const chess = new Chess();
    const loaded = chess.load_pgn(pgn);
    if (!loaded) {
      if (saveAnalysis) {
        analysis.status = 'failed';
        analysis.errorMessage = 'Invalid PGN format';
        await analysis.save();
      }
      return res.status(400).json({ message: 'Invalid PGN format.' });
    }

    // Extract metadata
    const header = chess.header();
    analysis.players = {
      white: header.White || 'Unknown',
      black: header.Black || 'Unknown'
    };
    analysis.event = header.Event;
    if (header.Date) {
      analysis.date = new Date(header.Date);
    }
    analysis.result = header.Result;

    // Initialize Stockfish
    await initStockfish();

    // Reset and analyze move by move
    chess.reset();
    const moves = [];
    const history = chess.history({ verbose: true });

    let moveNumber = 1;
    for (let i = 0; i < history.length; i++) {
      const moveObj = history[i];

      // Get FEN before move
      chess.reset();
      for (let j = 0; j < i; j++) {
        chess.move(history[j]);
      }
      const fenBefore = chess.fen();

      // Analyze position before move
      await stockfish.setPosition(fenBefore);
      const evalBefore = await stockfish.getEvaluation(depth);
      const bestMove = await stockfish.getBestMove(depth);

      // Apply move
      chess.move(moveObj);
      const fenAfter = chess.fen();

      // Analyze position after move
      await stockfish.setPosition(fenAfter);
      const evalAfter = await stockfish.getEvaluation(depth);

      // Calculate quality
      const difference = calculateEvalDifference(evalBefore, evalAfter, chess.turn());
      const quality = classifyMoveQuality(difference, moveObj.san === bestMove);

      moves.push({
        moveNumber: Math.ceil((i + 1) / 2),
        side: moveObj.color === 'w' ? 'white' : 'black',
        move: moveObj.san,
        uci: moveObj.from + moveObj.to + (moveObj.promotion || ''),
        fenBefore,
        fenAfter,
        evalBefore,
        evalAfter,
        bestMove,
        quality,
        cpLoss: Math.abs(difference)
      });

      // Update progress
      if (saveAnalysis) {
        analysis.analysisProgress = Math.floor(((i + 1) / history.length) * 100);
        await analysis.save();
      }
    }

    analysis.moves = moves;

    // Calculate statistics
    const whiteMoves = moves.filter(m => m.side === 'white');
    const blackMoves = moves.filter(m => m.side === 'black');

    analysis.statistics = {
      white: calculateAccuracy(whiteMoves),
      black: calculateAccuracy(blackMoves)
    };

    // Detect critical moments (eval swings > 150 cp)
    analysis.criticalMoments = detectCriticalMoments(moves);

    // Detect tactical opportunities
    analysis.tacticalOpportunities = detectTacticalOpportunities(moves);

    // Detect game phases
    analysis.phases = {
      white: detectPhases(whiteMoves),
      black: detectPhases(blackMoves)
    };

    // Mark as completed
    analysis.status = 'completed';
    analysis.completedAt = new Date();

    if (saveAnalysis) {
      await analysis.save();
    }

    return res.status(200).json({
      analysisId: analysis._id,
      analysis
    });
  } catch (error) {
    console.error('[Analysis] /pgn/full error:', error.message);
    return res.status(500).json({
      message: 'Failed to analyze game.',
      error: error.message
    });
  }
});

// ── GET /analyze/history ───────────────────────────────────────
// Get analysis history for current user
// Query: ?page=1&limit=10&status=completed

router.get('/history', verifyToken, async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const skip = (page - 1) * limit;

    const query = { userId: req.userId };
    if (status) {
      query.status = status;
    }

    const analyses = await Analysis.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .select('-moves -criticalMoments -tacticalOpportunities')
      .lean();

    const total = await Analysis.countDocuments(query);

    return res.status(200).json({
      analyses,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('[Analysis] /history error:', error.message);
    return res.status(500).json({
      message: 'Failed to fetch analysis history.',
      error: error.message
    });
  }
});

// ── GET /analyze/:id ───────────────────────────────────────────
// Get specific analysis by ID

router.get('/:id', verifyToken, async (req, res) => {
  try {
    const analysis = await Analysis.findById(req.params.id);

    if (!analysis) {
      return res.status(404).json({ message: 'Analysis not found.' });
    }

    // Check ownership
    if (analysis.userId.toString() !== req.userId && !analysis.isPublic) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    return res.status(200).json({ analysis });
  } catch (error) {
    console.error('[Analysis] /:id error:', error.message);
    return res.status(500).json({
      message: 'Failed to fetch analysis.',
      error: error.message
    });
  }
});

// ── DELETE /analyze/:id ────────────────────────────────────────
// Delete analysis

router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const analysis = await Analysis.findById(req.params.id);

    if (!analysis) {
      return res.status(404).json({ message: 'Analysis not found.' });
    }

    // Check ownership
    if (analysis.userId.toString() !== req.userId) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    await Analysis.findByIdAndDelete(req.params.id);

    return res.status(200).json({ message: 'Analysis deleted successfully.' });
  } catch (error) {
    console.error('[Analysis] DELETE /:id error:', error.message);
    return res.status(500).json({
      message: 'Failed to delete analysis.',
      error: error.message
    });
  }
});

// ── POST /analyze/:id/share ────────────────────────────────────
// Generate shareable link for analysis

router.post('/:id/share', verifyToken, async (req, res) => {
  try {
    const analysis = await Analysis.findById(req.params.id);

    if (!analysis) {
      return res.status(404).json({ message: 'Analysis not found.' });
    }

    // Check ownership
    if (analysis.userId.toString() !== req.userId) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    // Generate or regenerate share token
    if (!analysis.shareToken) {
      analysis.generateShareToken();
    }

    analysis.isPublic = true;
    await analysis.save();

    return res.status(200).json({
      shareUrl: `/analysis/shared/${analysis.shareToken}`,
      shareToken: analysis.shareToken
    });
  } catch (error) {
    console.error('[Analysis] /share error:', error.message);
    return res.status(500).json({
      message: 'Failed to generate share link.',
      error: error.message
    });
  }
});

// ── Helper: Detect Critical Moments ────────────────────────────

function detectCriticalMoments(moves) {
  const criticalMoments = [];
  const SWING_THRESHOLD = 150; // Centipawns

  for (let i = 1; i < moves.length; i++) {
    const prevMove = moves[i - 1];
    const currentMove = moves[i];

    const prevCP = evalToCP(prevMove.evalAfter);
    const currentCP = evalToCP(currentMove.evalAfter);
    const swing = Math.abs(currentCP - prevCP);

    if (swing >= SWING_THRESHOLD) {
      criticalMoments.push({
        moveNumber: currentMove.moveNumber,
        fen: currentMove.fenBefore,
        move: currentMove.move,
        evaluation: currentMove.evalAfter,
        previousEval: prevMove.evalAfter,
        evalSwing: swing,
        comment: `Evaluation swing of ${swing} centipawns`
      });
    }
  }

  return criticalMoments;
}

// ── Helper: Detect Tactical Opportunities ──────────────────────

function detectTacticalOpportunities(moves) {
  const opportunities = [];
  const TACTICAL_THRESHOLD = 100; // Centipawn loss indicating missed tactic

  for (const move of moves) {
    if (move.quality === 'mistake' || move.quality === 'blunder') {
      if (move.cpLoss >= TACTICAL_THRESHOLD) {
        opportunities.push({
          moveNumber: move.moveNumber,
          fen: move.fenBefore,
          playerMove: move.move,
          bestMove: move.bestMove,
          missed: true,
          evaluation: move.evalAfter,
          cpLoss: move.cpLoss,
          category: 'other', // TODO: Implement tactic categorization
          description: `Missed ${move.bestMove} - lost ${move.cpLoss} centipawns`
        });
      }
    }
  }

  return opportunities;
}

// ── Helper: Detect Game Phases ─────────────────────────────────

function detectPhases(moves) {
  if (moves.length === 0) return [];

  const phases = [];
  const totalMoves = moves.length;

  // Simple phase detection based on move count
  // Opening: moves 1-10, Middlegame: 11-30, Endgame: 31+
  const openingEnd = Math.min(10, totalMoves);
  const middlegameEnd = Math.min(30, totalMoves);

  if (openingEnd > 0) {
    const openingMoves = moves.slice(0, openingEnd);
    phases.push({
      phaseName: 'opening',
      moveRange: { start: 1, end: openingEnd },
      moveCount: openingMoves.length,
      ...calculateAccuracy(openingMoves)
    });
  }

  if (totalMoves > openingEnd) {
    const middlegameMoves = moves.slice(openingEnd, middlegameEnd);
    if (middlegameMoves.length > 0) {
      phases.push({
        phaseName: 'middlegame',
        moveRange: { start: openingEnd + 1, end: middlegameEnd },
        moveCount: middlegameMoves.length,
        ...calculateAccuracy(middlegameMoves)
      });
    }
  }

  if (totalMoves > middlegameEnd) {
    const endgameMoves = moves.slice(middlegameEnd);
    phases.push({
      phaseName: 'endgame',
      moveRange: { start: middlegameEnd + 1, end: totalMoves },
      moveCount: endgameMoves.length,
      ...calculateAccuracy(endgameMoves)
    });
  }

  return phases;
}

module.exports = router;

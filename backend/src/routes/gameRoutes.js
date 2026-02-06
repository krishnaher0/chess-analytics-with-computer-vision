const express = require('express');
const router  = express.Router();
const { Chess } = require('chess.js');

const Game              = require('../models/Game');
const User              = require('../models/User');
const { verifyToken }   = require('../middleware/auth');
const { stockfish, initStockfish } = require('../utils/stockfish');
const { generatePGN, convertUCItoSAN } = require('../utils/pgnGenerator');
const { analyzeGame, generateRecommendations } = require('../utils/feedbackEngine');

// ── helpers ────────────────────────────────────────────────────

/**
 * Derive a search-depth integer from the game's time control.
 * totalSeconds <=  60  → bullet  (depth  8)
 * totalSeconds <= 300  → blitz   (depth 10)
 * everything else      → rapid   (depth 15)
 */
function depthForGame(game) {
  const secs = game.timeControl ? game.timeControl.totalSeconds : 300;
  if (secs <= 60)  return 8;
  if (secs <= 300) return 10;
  return 15;
}

/**
 * Determine the game result from a chess.js instance that has
 * detected game-over.
 */
function resolveResult(chess) {
  if (chess.isDraw())      return 'draw';
  // isCheckmate() → the side whose turn it is has been checkmated
  if (chess.isCheckmate()) return chess.turn() === 'w' ? 'black' : 'white';
  return 'draw';   // stalemate / insufficient material / etc.
}

/**
 * Record a single move into the game document, run Stockfish eval,
 * and toggle activeColor.  Mutates `game` in place.
 *
 * @param {Object}  game       – Mongoose Game document
 * @param {string}  san        – the move in SAN notation
 * @param {string}  movedBy    – 'white' | 'black'
 * @param {number}  depth      – Stockfish search depth
 * @param {number}  timeSpentMs– optional ms spent on this move
 * @returns {Object} chess     – the chess.js instance after the move (for further checks)
 */
async function recordMove(game, san, movedBy, depth, timeSpentMs = 0) {
  const chess = new Chess(game.currentFen);

  const fenBefore = game.currentFen;
  const moveResult = chess.move(san);
  if (!moveResult) {
    throw new Error(`Illegal move "${san}" on position ${game.currentFen}`);
  }
  const fenAfter = chess.fen();

  // Get Stockfish evaluation of the NEW position
  await stockfish.setPosition(fenAfter);
  const evalResult = await stockfish.getEvaluation(depth);
  const evalCp     = evalResult.type === 'cp' ? evalResult.value : (evalResult.value > 0 ? 99999 : -99999);

  // Get Stockfish best-move suggestion for the new position
  await stockfish.setPosition(fenAfter);
  const bestMove = await stockfish.getBestMove(depth);

  const moveNumber = Math.floor(game.moves.length / 2) + 1;

  game.moves.push({
    moveNumber,
    san,
    fenBefore,
    fenAfter,
    stockfishEval: evalCp,
    bestMove,
    timeSpentMs,
    movedBy
  });

  game.currentFen  = fenAfter;
  game.activeColor = movedBy === 'white' ? 'black' : 'white';

  // Deduct time (rough: we do not track sub-second precision here)
  if (movedBy === 'white') {
    game.whiteTimeLeft = Math.max(0, (game.whiteTimeLeft || 0) - timeSpentMs);
    if (game.timeControl && game.timeControl.incrementSeconds) {
      game.whiteTimeLeft += game.timeControl.incrementSeconds * 1000;
    }
  } else {
    game.blackTimeLeft = Math.max(0, (game.blackTimeLeft || 0) - timeSpentMs);
    if (game.timeControl && game.timeControl.incrementSeconds) {
      game.blackTimeLeft += game.timeControl.incrementSeconds * 1000;
    }
  }

  return chess;   // return the chess.js instance so caller can check game-over
}

/**
 * Update the owner's profileStats after a completed game.
 */
async function updatePlayerStats(game, analysisResult) {
  const playerIds = [];
  if (game.whitePlayerId) playerIds.push({ id: game.whitePlayerId, color: 'white' });
  if (game.blackPlayerId) playerIds.push({ id: game.blackPlayerId, color: 'black' });

  for (const { id, color } of playerIds) {
    try {
      const user = await User.findById(id);
      if (!user) continue;

      user.profileStats.gamesPlayed = (user.profileStats.gamesPlayed || 0) + 1;

      if (game.result === color) {
        user.profileStats.gamesWon = (user.profileStats.gamesWon || 0) + 1;
      } else if (game.result === 'draw') {
        user.profileStats.gamesDrawn = (user.profileStats.gamesDrawn || 0) + 1;
      }

      // Update accuracy stats using the analysisResult
      if (analysisResult) {
        const n = user.profileStats.gamesPlayed;   // already incremented
        // Running average: newAvg = oldAvg + (newVal - oldAvg) / n
        if (analysisResult.overall) {
          user.profileStats.totalAccuracy =
            (user.profileStats.totalAccuracy || 0) +
            (analysisResult.overall.accuracy - (user.profileStats.totalAccuracy || 0)) / n;
        }
        if (analysisResult.opening) {
          user.profileStats.openingAccuracy =
            (user.profileStats.openingAccuracy || 0) +
            (analysisResult.opening.accuracy - (user.profileStats.openingAccuracy || 0)) / n;
        }
        if (analysisResult.middlegame) {
          user.profileStats.middlegameAccuracy =
            (user.profileStats.middlegameAccuracy || 0) +
            (analysisResult.middlegame.accuracy - (user.profileStats.middlegameAccuracy || 0)) / n;
        }
        if (analysisResult.endgame) {
          user.profileStats.endgameAccuracy =
            (user.profileStats.endgameAccuracy || 0) +
            (analysisResult.endgame.accuracy - (user.profileStats.endgameAccuracy || 0)) / n;
        }
      }

      await user.save();
    } catch (err) {
      console.error(`[Game] Failed to update stats for user ${id}:`, err.message);
    }
  }
}

// ── POST /start ────────────────────────────────────────────────

router.post('/start', verifyToken, async (req, res) => {
  try {
    await initStockfish();

    const { opponentId, isVsBot, botDifficulty, timeControl } = req.body;

    if (!timeControl || timeControl.totalSeconds == null || timeControl.incrementSeconds == null) {
      return res.status(400).json({ message: 'timeControl with totalSeconds and incrementSeconds is required.' });
    }

    const game = new Game({
      whitePlayerId: req.user.userId,
      blackPlayerId: isVsBot ? null : (opponentId || null),
      isVsBot:       !!isVsBot,
      botDifficulty: isVsBot ? botDifficulty : null,
      timeControl,
      currentFen:    'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      startedAt:     new Date(),
      whiteTimeLeft: timeControl.totalSeconds * 1000,
      blackTimeLeft: timeControl.totalSeconds * 1000,
      activeColor:   'white',
      result:        'ongoing'
    });

    if (isVsBot && botDifficulty) {
      stockfish.setBotDifficulty(botDifficulty);
    }

    await game.save();
    return res.status(201).json(game);
  } catch (error) {
    console.error('[Game] /start error:', error);
    return res.status(500).json({ message: 'Failed to start game.', error: error.message });
  }
});

// ── POST /move ─────────────────────────────────────────────────

router.post('/move', verifyToken, async (req, res) => {
  try {
    await initStockfish();

    const { gameId, move, detectedFen, timeSpentMs } = req.body;

    if (!gameId || !move) {
      return res.status(400).json({ message: 'gameId and move are required.' });
    }

    const game = await Game.findById(gameId);
    if (!game) {
      return res.status(404).json({ message: 'Game not found.' });
    }
    if (game.result !== 'ongoing') {
      return res.status(400).json({ message: 'Game is already finished.' });
    }

    // Verify it is this player's turn
    const playerColor =
      game.whitePlayerId && game.whitePlayerId.toString() === req.user.userId ? 'white' :
      game.blackPlayerId && game.blackPlayerId.toString() === req.user.userId ? 'black' : null;

    if (playerColor !== game.activeColor) {
      return res.status(400).json({ message: 'It is not your turn.' });
    }

    // Validate move legality with chess.js
    const chess = new Chess(game.currentFen);
    const testMove = chess.move(move);
    if (!testMove) {
      return res.status(400).json({ message: `Illegal move: ${move}` });
    }

    const depth = depthForGame(game);

    // Record the human player's move
    const chessAfterHuman = await recordMove(game, move, playerColor, depth, timeSpentMs || 0);

    // Check game over after human move
    if (chessAfterHuman.isGameOver()) {
      game.result  = resolveResult(chessAfterHuman);
      game.endedAt = new Date();
      game.pgn     = generatePGN(game);
    }

    // ── Bot response (if applicable) ─────────────────────────
    if (game.isVsBot && game.result === 'ongoing') {
      // Bot plays as black (human is white in /start)
      const botColor = playerColor === 'white' ? 'black' : 'white';

      await stockfish.setPosition(game.currentFen);
      const uciMove  = await stockfish.getBestMove(depth);
      const botSan   = convertUCItoSAN(uciMove, game.currentFen);

      const chessAfterBot = await recordMove(game, botSan, botColor, depth, 0);

      if (chessAfterBot.isGameOver()) {
        game.result  = resolveResult(chessAfterBot);
        game.endedAt = new Date();
        game.pgn     = generatePGN(game);
      }
    }

    await game.save();
    return res.status(200).json(game);
  } catch (error) {
    console.error('[Game] /move error:', error);
    return res.status(500).json({ message: 'Failed to process move.', error: error.message });
  }
});

// ── GET /detect-move ───────────────────────────────────────────

router.get('/detect-move', verifyToken, async (req, res) => {
  try {
    const { gameId } = req.query;
    if (!gameId) {
      return res.status(400).json({ message: 'gameId query parameter is required.' });
    }

    const game = await Game.findById(gameId);
    if (!game) {
      return res.status(404).json({ message: 'Game not found.' });
    }

    return res.status(200).json({
      currentFen:  game.currentFen,
      activeColor: game.activeColor,
      gameStatus:  game.result
    });
  } catch (error) {
    console.error('[Game] /detect-move error:', error);
    return res.status(500).json({ message: 'Internal server error.', error: error.message });
  }
});

// ── POST /end ──────────────────────────────────────────────────

router.post('/end', verifyToken, async (req, res) => {
  try {
    const { gameId, result } = req.body;

    if (!gameId || !result) {
      return res.status(400).json({ message: 'gameId and result are required.' });
    }
    if (!['white', 'black', 'draw'].includes(result)) {
      return res.status(400).json({ message: 'result must be white, black, or draw.' });
    }

    const game = await Game.findById(gameId);
    if (!game) {
      return res.status(404).json({ message: 'Game not found.' });
    }

    game.result  = result;
    game.endedAt = new Date();

    // Generate PGN
    // Resolve player names for PGN headers
    const whiteName = game.whitePlayerId
      ? (await User.findById(game.whitePlayerId))?.username || 'Unknown'
      : 'Bot';
    const blackName = game.blackPlayerId
      ? (await User.findById(game.blackPlayerId))?.username || 'Unknown'
      : 'Bot';

    game.pgn = generatePGN(game, whiteName, blackName);

    // Run analysis
    const analysisResult = analyzeGame(game);

    // Update player stats
    await updatePlayerStats(game, analysisResult);

    await game.save();

    return res.status(200).json({
      game,
      analysis: analysisResult
    });
  } catch (error) {
    console.error('[Game] /end error:', error);
    return res.status(500).json({ message: 'Failed to end game.', error: error.message });
  }
});

// ── GET /:gameId ───────────────────────────────────────────────

router.get('/:gameId', verifyToken, async (req, res) => {
  try {
    const game = await Game.findById(req.params.gameId)
      .populate('whitePlayerId', 'username email')
      .populate('blackPlayerId', 'username email');

    if (!game) {
      return res.status(404).json({ message: 'Game not found.' });
    }

    return res.status(200).json(game);
  } catch (error) {
    console.error('[Game] GET /:gameId error:', error);
    return res.status(500).json({ message: 'Internal server error.', error: error.message });
  }
});

// ── GET /history ───────────────────────────────────────────────
// NOTE: this route is defined AFTER /:gameId so Express does not
//       swallow "history" as a gameId param.  We place it before
//       the parameterised route by re-ordering below.

router.get('/history', verifyToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    const games = await Game.find({
      $or: [
        { whitePlayerId: userId },
        { blackPlayerId: userId }
      ]
    })
      .populate('whitePlayerId', 'username')
      .populate('blackPlayerId', 'username')
      .sort({ startedAt: -1 })
      .limit(20);

    return res.status(200).json(games);
  } catch (error) {
    console.error('[Game] /history error:', error);
    return res.status(500).json({ message: 'Internal server error.', error: error.message });
  }
});

// ── POST /analysis/:gameId ─────────────────────────────────────

router.post('/analysis/:gameId', verifyToken, async (req, res) => {
  try {
    const game = await Game.findById(req.params.gameId);
    if (!game) {
      return res.status(404).json({ message: 'Game not found.' });
    }

    const analysis        = analyzeGame(game);
    const recommendations = generateRecommendations(analysis);

    return res.status(200).json({ analysis, recommendations });
  } catch (error) {
    console.error('[Game] /analysis/:gameId error:', error);
    return res.status(500).json({ message: 'Failed to analyse game.', error: error.message });
  }
});

module.exports = router;

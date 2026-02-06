const express = require('express');
const router  = express.Router();

const User              = require('../models/User');
const Game              = require('../models/Game');
const { verifyToken }   = require('../middleware/auth');
const { analyzeGame, generateRecommendations } = require('../utils/feedbackEngine');

// ── GET /feedback/:userId ─────────────────────────────────────

router.get('/feedback/:userId', verifyToken, async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId).select('-passwordHash');
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    // Last 10 completed games for this user
    const games = await Game.find({
      $or: [
        { whitePlayerId: userId },
        { blackPlayerId: userId }
      ],
      result: { $ne: 'ongoing' }
    })
      .sort({ startedAt: -1 })
      .limit(10);

    // Analyse each game and aggregate
    const phaseAccumulators = {
      opening:    { accuracySum: 0, count: 0 },
      middlegame: { accuracySum: 0, count: 0 },
      endgame:    { accuracySum: 0, count: 0 },
      overall:    { accuracySum: 0, totalBlunders: 0, totalMistakes: 0, count: 0 }
    };

    for (const game of games) {
      const analysis = analyzeGame(game);

      if (analysis.opening) {
        phaseAccumulators.opening.accuracySum += analysis.opening.accuracy;
        phaseAccumulators.opening.count++;
      }
      if (analysis.middlegame) {
        phaseAccumulators.middlegame.accuracySum += analysis.middlegame.accuracy;
        phaseAccumulators.middlegame.count++;
      }
      if (analysis.endgame) {
        phaseAccumulators.endgame.accuracySum += analysis.endgame.accuracy;
        phaseAccumulators.endgame.count++;
      }
      if (analysis.overall) {
        phaseAccumulators.overall.accuracySum    += analysis.overall.accuracy;
        phaseAccumulators.overall.totalBlunders  += analysis.overall.totalBlunders;
        phaseAccumulators.overall.totalMistakes  += analysis.overall.totalMistakes;
        phaseAccumulators.overall.count++;
      }
    }

    // Compute averages
    const avg = (sum, count) => count > 0 ? Math.round((sum / count) * 100) / 100 : 0;

    const averageStats = {
      opening: {
        accuracy: avg(phaseAccumulators.opening.accuracySum, phaseAccumulators.opening.count)
      },
      middlegame: {
        accuracy: avg(phaseAccumulators.middlegame.accuracySum, phaseAccumulators.middlegame.count)
      },
      endgame: {
        accuracy: avg(phaseAccumulators.endgame.accuracySum, phaseAccumulators.endgame.count)
      },
      overall: {
        accuracy:      avg(phaseAccumulators.overall.accuracySum, phaseAccumulators.overall.count),
        totalBlunders: phaseAccumulators.overall.totalBlunders,
        totalMistakes: phaseAccumulators.overall.totalMistakes
      }
    };

    // Generate recommendations on the aggregated averages
    // We massage averageStats into the shape analyzeGame returns so
    // generateRecommendations can consume it directly.
    const recommendations = generateRecommendations(averageStats);

    return res.status(200).json({
      userId,
      username:       user.username,
      averageStats,
      recommendations,
      gamesAnalyzed:  games.length
    });
  } catch (error) {
    console.error('[Profile] /feedback error:', error);
    return res.status(500).json({ message: 'Internal server error.', error: error.message });
  }
});

// ── GET /stats/:userId ────────────────────────────────────────

router.get('/stats/:userId', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).select('profileStats username');
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    return res.status(200).json({
      username:     user.username,
      profileStats: user.profileStats
    });
  } catch (error) {
    console.error('[Profile] /stats error:', error);
    return res.status(500).json({ message: 'Internal server error.', error: error.message });
  }
});

// ── GET /games/:userId ────────────────────────────────────────

router.get('/games/:userId', verifyToken, async (req, res) => {
  try {
    const games = await Game.find({
      $or: [
        { whitePlayerId: req.params.userId },
        { blackPlayerId: req.params.userId }
      ]
    })
      .populate('whitePlayerId', 'username')
      .populate('blackPlayerId', 'username')
      .sort({ startedAt: -1 })
      .limit(20);

    return res.status(200).json(games);
  } catch (error) {
    console.error('[Profile] /games error:', error);
    return res.status(500).json({ message: 'Internal server error.', error: error.message });
  }
});

module.exports = router;

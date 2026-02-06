const express  = require('express');
const router   = express.Router();
const schedule = require('node-schedule');

const Tournament      = require('../models/TournamentEnhanced');
const Game            = require('../models/Game');
const User            = require('../models/User');
const { verifyToken } = require('../middleware/auth');
const pairingService  = require('../services/pairingService');

// ── POST /create ───────────────────────────────────────────────

router.post('/create', verifyToken, async (req, res) => {
  try {
    const {
      name,
      description,
      format,
      startDatetime,
      startDate,
      registrationEnd,
      timeControl,
      maxPlayers,
      minPlayers,
      isRated,
      isPublic
    } = req.body;

    // --- validation ------------------------------------------------
    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Tournament name is required.' });
    }

    const tournamentStartDate = new Date(startDate || startDatetime);
    if (isNaN(tournamentStartDate.getTime())) {
      return res.status(400).json({ message: 'Start date must be a valid date.' });
    }
    if (tournamentStartDate <= new Date()) {
      return res.status(400).json({ message: 'Start date must be in the future.' });
    }

    const regEnd = registrationEnd ? new Date(registrationEnd) : new Date(tournamentStartDate.getTime() - 3600000);

    if (!timeControl) {
      return res.status(400).json({ message: 'Time control is required.' });
    }

    const players = maxPlayers != null ? Number(maxPlayers) : 8;
    if (players < 2 || players > 256) {
      return res.status(400).json({ message: 'maxPlayers must be between 2 and 256.' });
    }

    const minP = minPlayers != null ? Number(minPlayers) : 2;

    // --- create document -------------------------------------------
    const tournament = new Tournament({
      name: name.trim(),
      description: description?.trim() || '',
      format: format || 'swiss',
      creatorId: req.user.userId,
      startDate: tournamentStartDate,
      registrationStart: new Date(),
      registrationEnd: regEnd,
      timeControl: {
        initial: timeControl.initial || timeControl.totalSeconds || 600,
        increment: timeControl.increment || timeControl.incrementSeconds || 0
      },
      maxPlayers: players,
      minPlayers: minP,
      isRated: isRated !== false,
      isPublic: isPublic !== false,
      status: 'registration',
      participants: [req.user.userId] // creator auto-joins
    });

    // Legacy fields for compatibility
    if (startDatetime) {
      tournament.startDatetime = new Date(startDatetime);
    }
    if (req.body.entrants) {
      tournament.entrants = req.body.entrants;
    }

    await tournament.save();

    return res.status(201).json(tournament);
  } catch (error) {
    console.error('[Tournament] /create error:', error);
    return res.status(500).json({ message: 'Failed to create tournament.', error: error.message });
  }
});

// ── POST /join/:tournamentId ───────────────────────────────────

router.post('/join/:tournamentId', verifyToken, async (req, res) => {
  try {
    const tournament = await Tournament.findById(req.params.tournamentId);
    if (!tournament) {
      return res.status(404).json({ message: 'Tournament not found.' });
    }

    if (tournament.status !== 'registration' && tournament.status !== 'upcoming') {
      return res.status(400).json({ message: 'Registration is closed.' });
    }

    const userId = req.user.userId;

    // Support both participants (new) and entrants (legacy)
    const participantsList = tournament.participants || tournament.entrants || [];

    const alreadyJoined = participantsList.some(
      (id) => id.toString() === userId.toString()
    );
    if (alreadyJoined) {
      return res.status(400).json({ message: 'You have already joined this tournament.' });
    }

    if (participantsList.length >= tournament.maxPlayers) {
      return res.status(400).json({ message: 'Tournament is full.' });
    }

    if (tournament.participants) {
      tournament.participants.push(userId);
    } else {
      tournament.entrants.push(userId);
    }

    await tournament.save();

    return res.status(200).json(tournament);
  } catch (error) {
    console.error('[Tournament] /join error:', error);
    return res.status(500).json({ message: 'Failed to join tournament.', error: error.message });
  }
});

// ── GET / ──────────────────────────────────────────────────────

router.get('/', verifyToken, async (req, res) => {
  try {
    const tournaments = await Tournament.find()
      .populate('creatorId', 'username')
      .sort({ startDatetime: -1 });

    return res.status(200).json(tournaments);
  } catch (error) {
    console.error('[Tournament] GET / error:', error);
    return res.status(500).json({ message: 'Internal server error.', error: error.message });
  }
});

// ── GET /leaderboards ──────────────────────────────────────────
// NOTE: placed BEFORE /:tournamentId so Express does not consume
//       "leaderboards" as a tournamentId parameter.

router.get('/leaderboards', verifyToken, async (req, res) => {
  try {
    const tournaments = await Tournament.find({
      status: { $in: ['active', 'completed'] }
    }).sort({ startDatetime: -1 });

    const summary = [];

    for (const t of tournaments) {
      // Gather all games between this tournament's entrants
      const entrantIds = t.entrants.map((id) => id.toString());

      const games = await Game.find({
        $and: [
          { $or: [{ whitePlayerId: { $in: t.entrants } }, { blackPlayerId: { $in: t.entrants } }] },
          { result: { $ne: 'ongoing' } }
        ]
      });

      // Build score map
      const scoreMap = {};
      for (const id of entrantIds) scoreMap[id] = { wins: 0, draws: 0, losses: 0, score: 0 };

      for (const g of games) {
        const wId = g.whitePlayerId ? g.whitePlayerId.toString() : null;
        const bId = g.blackPlayerId ? g.blackPlayerId.toString() : null;

        // Only count if both players are entrants
        if (!wId || !bId || !scoreMap[wId] || !scoreMap[bId]) continue;

        if (g.result === 'white') {
          scoreMap[wId].wins++;  scoreMap[wId].score += 2;
          scoreMap[bId].losses++;
        } else if (g.result === 'black') {
          scoreMap[bId].wins++;  scoreMap[bId].score += 2;
          scoreMap[wId].losses++;
        } else if (g.result === 'draw') {
          scoreMap[wId].draws++; scoreMap[wId].score += 1;
          scoreMap[bId].draws++; scoreMap[bId].score += 1;
        }
      }

      // Sort and pick top 3
      const sorted = Object.entries(scoreMap)
        .map(([userId, stats]) => ({ userId, ...stats }))
        .sort((a, b) => b.score - a.score || b.wins - a.wins);

      const topPlayers = [];
      for (let i = 0; i < Math.min(3, sorted.length); i++) {
        const user = await User.findById(sorted[i].userId).select('username');
        topPlayers.push({
          username: user ? user.username : 'Unknown',
          score:    sorted[i].score,
          wins:     sorted[i].wins
        });
      }

      summary.push({
        tournamentId: t._id,
        name:         t.name,
        startDatetime: t.startDatetime,
        topPlayers
      });
    }

    return res.status(200).json(summary);
  } catch (error) {
    console.error('[Tournament] GET /leaderboards error:', error);
    return res.status(500).json({ message: 'Internal server error.', error: error.message });
  }
});

// ── GET /:tournamentId ─────────────────────────────────────────

router.get('/:tournamentId', verifyToken, async (req, res) => {
  try {
    const tournament = await Tournament.findById(req.params.tournamentId)
      .populate('entrants', 'username');

    if (!tournament) {
      return res.status(404).json({ message: 'Tournament not found.' });
    }

    return res.status(200).json(tournament);
  } catch (error) {
    console.error('[Tournament] GET /:tournamentId error:', error);
    return res.status(500).json({ message: 'Internal server error.', error: error.message });
  }
});

// ── GET /:tournamentId/leaderboard ─────────────────────────────

router.get('/:tournamentId/leaderboard', verifyToken, async (req, res) => {
  try {
    const tournament = await Tournament.findById(req.params.tournamentId);
    if (!tournament) {
      return res.status(404).json({ message: 'Tournament not found.' });
    }

    const entrantIds = tournament.entrants.map((id) => id.toString());

    // Fetch all finished games where BOTH sides are entrants
    const games = await Game.find({
      whitePlayerId: { $in: tournament.entrants },
      blackPlayerId: { $in: tournament.entrants },
      result: { $ne: 'ongoing' }
    });

    // Tally scores
    const scoreMap = {};
    for (const id of entrantIds) {
      scoreMap[id] = { wins: 0, draws: 0, losses: 0, gamesPlayed: 0, score: 0 };
    }

    for (const g of games) {
      const wId = g.whitePlayerId.toString();
      const bId = g.blackPlayerId.toString();

      if (!scoreMap[wId] || !scoreMap[bId]) continue;   // safety guard

      scoreMap[wId].gamesPlayed++;
      scoreMap[bId].gamesPlayed++;

      if (g.result === 'white') {
        scoreMap[wId].wins++;  scoreMap[wId].score += 2;
        scoreMap[bId].losses++;
      } else if (g.result === 'black') {
        scoreMap[bId].wins++;  scoreMap[bId].score += 2;
        scoreMap[wId].losses++;
      } else if (g.result === 'draw') {
        scoreMap[wId].draws++; scoreMap[wId].score += 1;
        scoreMap[bId].draws++; scoreMap[bId].score += 1;
      }
    }

    // Sort: score desc, then wins desc
    const sorted = Object.entries(scoreMap)
      .map(([userId, stats]) => ({ userId, ...stats }))
      .sort((a, b) => b.score - a.score || b.wins - a.wins);

    // Attach rank and username
    const leaderboard = [];
    for (let i = 0; i < sorted.length; i++) {
      const user = await User.findById(sorted[i].userId).select('username');
      leaderboard.push({
        username:    user ? user.username : 'Unknown',
        score:       sorted[i].score,
        wins:        sorted[i].wins,
        draws:       sorted[i].draws,
        losses:      sorted[i].losses,
        gamesPlayed: sorted[i].gamesPlayed,
        rank:        i + 1
      });
    }

    return res.status(200).json(leaderboard);
  } catch (error) {
    console.error('[Tournament] GET /:tournamentId/leaderboard error:', error);
    return res.status(500).json({ message: 'Internal server error.', error: error.message });
  }
});

// ── POST /:tournamentId/start ──────────────────────────────────
// Start the tournament and generate first round pairings

router.post('/:tournamentId/start', verifyToken, async (req, res) => {
  try {
    const tournament = await Tournament.findById(req.params.tournamentId);
    if (!tournament) {
      return res.status(404).json({ message: 'Tournament not found.' });
    }

    // Check if user is the creator
    if (tournament.creatorId.toString() !== req.user.userId.toString()) {
      return res.status(403).json({ message: 'Only the creator can start the tournament.' });
    }

    if (tournament.status !== 'registration' && tournament.status !== 'upcoming') {
      return res.status(400).json({ message: 'Tournament already started or completed.' });
    }

    if (tournament.participants.length < tournament.minPlayers) {
      return res.status(400).json({ message: `Need at least ${tournament.minPlayers} participants to start.` });
    }

    // Initialize standings
    tournament.initializeStandings();

    // Generate first round pairings based on format
    let pairings;
    if (tournament.format === 'swiss') {
      pairings = pairingService.generateSwissPairings(tournament.standings, 1, tournament.rounds);
      tournament.numberOfRounds = tournament.numberOfRounds || Math.ceil(Math.log2(tournament.participants.length));
    } else if (tournament.format === 'round-robin') {
      pairings = pairingService.generateRoundRobinPairings(tournament.participants, 1);
      tournament.numberOfRounds = tournament.participants.length - 1;
    } else if (tournament.format === 'knockout') {
      tournament.knockoutMatches = pairingService.generateKnockoutBracket(tournament.participants);
      tournament.status = 'ongoing';
      tournament.currentRound = 1;
      await tournament.save();
      return res.status(200).json(tournament);
    }

    // Create first round
    tournament.rounds.push({
      roundNumber: 1,
      pairings,
      startTime: new Date(),
      status: 'ongoing'
    });

    tournament.status = 'ongoing';
    tournament.currentRound = 1;

    await tournament.save();

    return res.status(200).json(tournament);
  } catch (error) {
    console.error('[Tournament] /start error:', error);
    return res.status(500).json({ message: 'Failed to start tournament.', error: error.message });
  }
});

// ── POST /:tournamentId/round/:roundNumber/result ───────────────
// Update game result for a pairing

router.post('/:tournamentId/round/:roundNumber/result', verifyToken, async (req, res) => {
  try {
    const { whiteId, blackId, result } = req.body;
    const tournament = await Tournament.findById(req.params.tournamentId);

    if (!tournament) {
      return res.status(404).json({ message: 'Tournament not found.' });
    }

    const roundNumber = parseInt(req.params.roundNumber);
    const round = tournament.rounds.find(r => r.roundNumber === roundNumber);

    if (!round) {
      return res.status(404).json({ message: 'Round not found.' });
    }

    // Find the pairing
    const pairing = round.pairings.find(
      p => p.white.toString() === whiteId && p.black.toString() === blackId
    );

    if (!pairing) {
      return res.status(404).json({ message: 'Pairing not found.' });
    }

    // Update result
    pairing.result = result;

    // Update standings
    pairingService.updateStandingsAfterGame(tournament.standings, whiteId, blackId, result);

    // Check if round is complete
    const allGamesFinished = round.pairings.every(p => p.result !== 'pending' && p.result !== 'ongoing');

    if (allGamesFinished) {
      round.status = 'completed';

      // Calculate tie-breaks
      pairingService.calculateTieBreaks(tournament.standings);
      tournament.sortStandings();
    }

    await tournament.save();

    return res.status(200).json(tournament);
  } catch (error) {
    console.error('[Tournament] /result error:', error);
    return res.status(500).json({ message: 'Failed to update result.', error: error.message });
  }
});

// ── POST /:tournamentId/next-round ──────────────────────────────
// Generate pairings for the next round

router.post('/:tournamentId/next-round', verifyToken, async (req, res) => {
  try {
    const tournament = await Tournament.findById(req.params.tournamentId);

    if (!tournament) {
      return res.status(404).json({ message: 'Tournament not found.' });
    }

    // Check if user is the creator
    if (tournament.creatorId.toString() !== req.user.userId.toString()) {
      return res.status(403).json({ message: 'Only the creator can advance rounds.' });
    }

    if (tournament.status !== 'ongoing') {
      return res.status(400).json({ message: 'Tournament is not in progress.' });
    }

    // Check if current round is complete
    const currentRound = tournament.rounds[tournament.currentRound - 1];
    if (!currentRound || currentRound.status !== 'completed') {
      return res.status(400).json({ message: 'Current round is not yet completed.' });
    }

    // Check if tournament is finished
    if (tournament.currentRound >= tournament.numberOfRounds) {
      tournament.status = 'completed';

      // Set winner
      if (tournament.standings.length > 0) {
        tournament.winner = tournament.standings[0].userId;
        if (tournament.standings.length > 1) {
          tournament.runnerUp = tournament.standings[1].userId;
        }
      }

      await tournament.save();
      return res.status(200).json({ message: 'Tournament completed!', tournament });
    }

    // Generate next round pairings
    const nextRoundNumber = tournament.currentRound + 1;
    let pairings;

    if (tournament.format === 'swiss') {
      pairings = pairingService.generateSwissPairings(
        tournament.standings,
        nextRoundNumber,
        tournament.rounds
      );
    } else if (tournament.format === 'round-robin') {
      pairings = pairingService.generateRoundRobinPairings(
        tournament.participants,
        nextRoundNumber
      );
    }

    tournament.rounds.push({
      roundNumber: nextRoundNumber,
      pairings,
      startTime: new Date(),
      status: 'ongoing'
    });

    tournament.currentRound = nextRoundNumber;

    await tournament.save();

    return res.status(200).json(tournament);
  } catch (error) {
    console.error('[Tournament] /next-round error:', error);
    return res.status(500).json({ message: 'Failed to generate next round.', error: error.message });
  }
});

// ── GET /:tournamentId/standings ────────────────────────────────
// Get current tournament standings

router.get('/:tournamentId/standings', verifyToken, async (req, res) => {
  try {
    const tournament = await Tournament.findById(req.params.tournamentId)
      .populate('standings.userId', 'username');

    if (!tournament) {
      return res.status(404).json({ message: 'Tournament not found.' });
    }

    return res.status(200).json(tournament.standings);
  } catch (error) {
    console.error('[Tournament] GET /standings error:', error);
    return res.status(500).json({ message: 'Internal server error.', error: error.message });
  }
});

module.exports = router;

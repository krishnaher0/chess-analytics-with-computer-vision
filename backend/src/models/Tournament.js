const mongoose = require('mongoose');
const schedule = require('node-schedule');

const resultEntrySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  score: { type: Number, default: 0 },
  gamesPlayed: { type: Number, default: 0 },
  rank: { type: Number, default: 0 }
}, { _id: false });

const tournamentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  creatorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  startDatetime: {
    type: Date,
    required: true
  },
  timeControl: {
    totalSeconds: { type: Number },
    incrementSeconds: { type: Number }
  },
  maxPlayers: {
    type: Number,
    default: 8
  },
  status: {
    type: String,
    enum: ['upcoming', 'active', 'completed'],
    default: 'upcoming'
  },
  entrants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  results: [resultEntrySchema],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

/**
 * Static method: schedules a node-schedule job that fires at
 * tournament.startDatetime.  When the job runs it transitions
 * status → 'active', creates the first-round round-robin Game
 * documents, and persists everything.
 *
 * Call this after creating or loading a tournament whose status
 * is still 'upcoming' and whose startDatetime has not yet passed.
 */
tournamentSchema.statics.scheduleStart = function (tournament) {
  const Game = require('./Game');                       // lazy require to avoid circular dep
  const startDate = new Date(tournament.startDatetime);

  // If the start time has already passed and there are entrants, activate immediately
  if (startDate <= new Date() && tournament.entrants.length > 0) {
    tournament.status = 'active';
    tournament.save();
    createRoundRobinGames(tournament);
    console.log(`[Tournament] "${tournament.name}" activated immediately (start time already passed).`);
    return;
  }

  // Otherwise schedule for the future
  schedule.scheduleJob(startDate, async () => {
    try {
      // Re-fetch to get the latest entrants list
      const Tournament = mongoose.model('Tournament');
      const updated = await Tournament.findById(tournament._id);

      if (!updated || updated.status !== 'upcoming') return;

      if (updated.entrants.length === 0) {
        console.log(`[Tournament] "${updated.name}" has no entrants. Not starting.`);
        return;
      }

      updated.status = 'active';
      await updated.save();
      createRoundRobinGames(updated);
      console.log(`[Tournament] "${updated.name}" started via scheduled job.`);
    } catch (err) {
      console.error(`[Tournament] Failed to start "${tournament.name}":`, err.message);
    }
  });
};

/**
 * Helper: creates one Game document for every unique pair of
 * entrants (full round-robin, first round).
 */
async function createRoundRobinGames(tournament) {
  const Game = require('./Game');
  const entrants = tournament.entrants;
  const games = [];

  for (let i = 0; i < entrants.length; i++) {
    for (let j = i + 1; j < entrants.length; j++) {
      const game = new Game({
        whitePlayerId: entrants[i],
        blackPlayerId: entrants[j],
        isVsBot: false,
        timeControl: tournament.timeControl,
        currentFen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
        startedAt: new Date(),
        whiteTimeLeft: tournament.timeControl.totalSeconds * 1000,
        blackTimeLeft: tournament.timeControl.totalSeconds * 1000,
        activeColor: 'white',
        result: 'ongoing'
      });
      games.push(game);
    }
  }

  if (games.length > 0) {
    await Game.insertMany(games);
    console.log(`[Tournament] Created ${games.length} round-robin game(s) for "${tournament.name}".`);
  }
}

const Tournament = mongoose.model('Tournament', tournamentSchema);

module.exports = Tournament;

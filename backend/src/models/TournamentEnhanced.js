const mongoose = require('mongoose');

const pairingSchema = new mongoose.Schema({
  white: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  black: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  gameId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Game'
  },
  result: {
    type: String,
    enum: ['1-0', '0-1', '1/2-1/2', 'ongoing', 'pending'],
    default: 'pending'
  },
  boardNumber: { type: Number } // For display purposes
});

const roundSchema = new mongoose.Schema({
  roundNumber: { type: Number, required: true },
  pairings: [pairingSchema],
  startTime: { type: Date },
  status: {
    type: String,
    enum: ['pending', 'ongoing', 'completed'],
    default: 'pending'
  }
});

const standingSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  rank: { type: Number },
  points: { type: Number, default: 0 },
  wins: { type: Number, default: 0 },
  draws: { type: Number, default: 0 },
  losses: { type: Number, default: 0 },
  gamesPlayed: { type: Number, default: 0 },

  // Tie-break scores
  buchholz: { type: Number, default: 0 },        // Sum of opponents' scores
  sonnebornBerger: { type: Number, default: 0 }, // Sum of defeated opponents' scores
  progressiveScore: { type: Number, default: 0 }, // Cumulative score

  // Additional stats
  opponentsPlayed: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  colors: {
    white: { type: Number, default: 0 },
    black: { type: Number, default: 0 }
  }
}, { _id: false });

const knockoutMatchSchema = new mongoose.Schema({
  round: { type: Number, required: true }, // 1 = Finals, 2 = Semi-finals, 3 = Quarter-finals, etc.
  matchNumber: { type: Number, required: true },
  player1: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  player2: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  winner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  gameId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Game'
  },
  result: { type: String },
  nextMatch: { type: Number } // Which match the winner advances to
});

const tournamentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },

  description: {
    type: String,
    maxlength: 500
  },

  format: {
    type: String,
    enum: ['round-robin', 'swiss', 'knockout', 'double-elimination'],
    required: true,
    default: 'swiss'
  },

  creatorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  // Registration
  registrationStart: { type: Date, default: Date.now },
  registrationEnd: { type: Date, required: true },

  // Tournament dates
  startDate: { type: Date, required: true },
  endDate: { type: Date },

  // Settings
  timeControl: {
    initial: { type: Number, required: true }, // seconds
    increment: { type: Number, default: 0 }    // seconds
  },

  maxPlayers: {
    type: Number,
    required: true,
    min: 2,
    max: 256
  },

  minPlayers: {
    type: Number,
    default: 2
  },

  isRated: {
    type: Boolean,
    default: true
  },

  isPublic: {
    type: Boolean,
    default: true
  },

  // For Swiss tournaments
  numberOfRounds: { type: Number },

  // For Knockout tournaments
  knockoutMatches: [knockoutMatchSchema],

  // Participants
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],

  // Tournament progress
  status: {
    type: String,
    enum: ['registration', 'upcoming', 'ongoing', 'completed', 'cancelled'],
    default: 'registration',
    index: true
  },

  currentRound: { type: Number, default: 0 },

  rounds: [roundSchema],

  standings: [standingSchema],

  // Results
  winner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  runnerUp: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  // Metadata
  createdAt: { type: Date, default: Date.now, index: true },
  updatedAt: { type: Date, default: Date.now }
});

// Indexes
tournamentSchema.index({ status: 1, startDate: -1 });
tournamentSchema.index({ creatorId: 1, createdAt: -1 });
tournamentSchema.index({ 'participants': 1 });

// Update timestamp on save
tournamentSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Virtual for participants count
tournamentSchema.virtual('participantsCount').get(function() {
  return this.participants.length;
});

// Virtual for is full
tournamentSchema.virtual('isFull').get(function() {
  return this.participants.length >= this.maxPlayers;
});

// Virtual for can start
tournamentSchema.virtual('canStart').get(function() {
  return this.participants.length >= this.minPlayers &&
         this.status === 'registration' &&
         new Date() >= this.startDate;
});

// Instance method: Add participant
tournamentSchema.methods.addParticipant = function(userId) {
  if (this.isFull) {
    throw new Error('Tournament is full');
  }

  if (this.status !== 'registration') {
    throw new Error('Registration is closed');
  }

  if (this.participants.includes(userId)) {
    throw new Error('User already registered');
  }

  this.participants.push(userId);
  return this.save();
};

// Instance method: Remove participant
tournamentSchema.methods.removeParticipant = function(userId) {
  if (this.status !== 'registration') {
    throw new Error('Cannot withdraw after tournament starts');
  }

  const index = this.participants.indexOf(userId);
  if (index === -1) {
    throw new Error('User not registered');
  }

  this.participants.splice(index, 1);
  return this.save();
};

// Instance method: Initialize standings
tournamentSchema.methods.initializeStandings = function() {
  this.standings = this.participants.map(userId => ({
    userId,
    rank: 0,
    points: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    gamesPlayed: 0,
    buchholz: 0,
    sonnebornBerger: 0,
    progressiveScore: 0,
    opponentsPlayed: [],
    colors: { white: 0, black: 0 }
  }));
};

// Instance method: Calculate tie-breaks
tournamentSchema.methods.calculateTieBreaks = function() {
  const standingsMap = new Map();
  this.standings.forEach(s => standingsMap.set(s.userId.toString(), s));

  this.standings.forEach(standing => {
    // Buchholz: sum of opponents' scores
    standing.buchholz = standing.opponentsPlayed.reduce((sum, oppId) => {
      const opponent = standingsMap.get(oppId.toString());
      return sum + (opponent ? opponent.points : 0);
    }, 0);

    // Sonneborn-Berger: sum of defeated/drawn opponents' scores weighted
    standing.sonnebornBerger = 0;
    // TODO: Implement full SB calculation based on game results
  });
};

// Instance method: Sort standings
tournamentSchema.methods.sortStandings = function() {
  this.standings.sort((a, b) => {
    // Primary: points
    if (b.points !== a.points) return b.points - a.points;

    // Tie-break 1: Buchholz
    if (b.buchholz !== a.buchholz) return b.buchholz - a.buchholz;

    // Tie-break 2: Sonneborn-Berger
    if (b.sonnebornBerger !== a.sonnebornBerger) {
      return b.sonnebornBerger - a.sonnebornBerger;
    }

    // Tie-break 3: Progressive score
    return b.progressiveScore - a.progressiveScore;
  });

  // Assign ranks
  this.standings.forEach((standing, index) => {
    standing.rank = index + 1;
  });
};

const Tournament = mongoose.model('Tournament', tournamentSchema);

module.exports = Tournament;

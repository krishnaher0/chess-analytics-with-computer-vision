const mongoose = require('mongoose');

const moveSchema = new mongoose.Schema({
  moveNumber: { type: Number },
  san: { type: String },
  fenBefore: { type: String },
  fenAfter: { type: String },
  stockfishEval: { type: Number },
  bestMove: { type: String },
  timeSpentMs: { type: Number },
  movedBy: { type: String, enum: ['white', 'black'] }
}, { _id: false });

const gameSchema = new mongoose.Schema({
  whitePlayerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  blackPlayerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  isVsBot: {
    type: Boolean,
    default: false
  },
  botDifficulty: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced', 'expert'],
    default: null
  },
  timeControl: {
    totalSeconds: { type: Number },
    incrementSeconds: { type: Number }
  },
  moves: [moveSchema],
  currentFen: {
    type: String,
    default: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
  },
  result: {
    type: String,
    enum: ['white', 'black', 'draw', 'ongoing'],
    default: 'ongoing'
  },
  pgn: {
    type: String,
    default: ''
  },
  startedAt: {
    type: Date
  },
  endedAt: {
    type: Date
  },
  whiteTimeLeft: {
    type: Number  // milliseconds
  },
  blackTimeLeft: {
    type: Number  // milliseconds
  },
  activeColor: {
    type: String,
    enum: ['white', 'black'],
    default: 'white'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const Game = mongoose.model('Game', gameSchema);

module.exports = Game;

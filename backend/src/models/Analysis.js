const mongoose = require('mongoose');

const criticalMomentSchema = new mongoose.Schema({
  moveNumber: { type: Number, required: true },
  fen: { type: String, required: true },
  move: { type: String, required: true },
  evaluation: {
    type: {
      type: String,
      enum: ['cp', 'mate'],
      required: true
    },
    value: { type: Number, required: true }
  },
  previousEval: {
    type: {
      type: String,
      enum: ['cp', 'mate']
    },
    value: Number
  },
  evalSwing: { type: Number }, // Centipawn swing
  comment: { type: String }
});

const tacticalOpportunitySchema = new mongoose.Schema({
  moveNumber: { type: Number, required: true },
  fen: { type: String, required: true },
  playerMove: { type: String, required: true },
  bestMove: { type: String, required: true },
  missed: { type: Boolean, default: true },
  evaluation: {
    type: {
      type: String,
      enum: ['cp', 'mate'],
      required: true
    },
    value: { type: Number, required: true }
  },
  cpLoss: { type: Number }, // Centipawn loss for missing tactic
  category: {
    type: String,
    enum: ['fork', 'pin', 'skewer', 'discovery', 'mate_threat', 'material_gain', 'positional', 'other'],
    default: 'other'
  },
  description: { type: String }
});

const phaseAnalysisSchema = new mongoose.Schema({
  phaseName: {
    type: String,
    enum: ['opening', 'middlegame', 'endgame'],
    required: true
  },
  moveRange: {
    start: { type: Number, required: true },
    end: { type: Number, required: true }
  },
  moveCount: { type: Number, required: true },
  accuracy: { type: Number, min: 0, max: 100 },
  avgCentipawnLoss: { type: Number },
  moveQuality: {
    best: { type: Number, default: 0 },
    excellent: { type: Number, default: 0 },
    good: { type: Number, default: 0 },
    inaccuracy: { type: Number, default: 0 },
    mistake: { type: Number, default: 0 },
    blunder: { type: Number, default: 0 }
  }
});

const moveAnalysisSchema = new mongoose.Schema({
  moveNumber: { type: Number, required: true },
  side: { type: String, enum: ['white', 'black'], required: true },
  move: { type: String, required: true }, // SAN notation
  uci: { type: String }, // UCI notation
  fenBefore: { type: String, required: true },
  fenAfter: { type: String, required: true },
  evalBefore: {
    type: {
      type: String,
      enum: ['cp', 'mate'],
      required: true
    },
    value: { type: Number, required: true }
  },
  evalAfter: {
    type: {
      type: String,
      enum: ['cp', 'mate'],
      required: true
    },
    value: { type: Number, required: true }
  },
  bestMove: { type: String },
  quality: {
    type: String,
    enum: ['best', 'excellent', 'good', 'inaccuracy', 'mistake', 'blunder'],
    required: true
  },
  cpLoss: { type: Number }, // Centipawn loss
  timeSpent: { type: Number }, // Milliseconds (if available)
  comment: { type: String }
});

const analysisSchema = new mongoose.Schema({
  // Reference to original game
  gameId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Game',
    index: true
  },

  // User who requested analysis
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  // Game metadata
  pgn: { type: String, required: true },
  result: { type: String }, // '1-0', '0-1', '1/2-1/2'
  players: {
    white: { type: String },
    black: { type: String }
  },
  event: { type: String },
  date: { type: Date },

  // Analysis settings
  depth: { type: Number, default: 15 },
  engineName: { type: String, default: 'Stockfish' },
  engineVersion: { type: String },

  // Move-by-move analysis
  moves: [moveAnalysisSchema],

  // Overall statistics
  statistics: {
    white: {
      accuracy: { type: Number, min: 0, max: 100 },
      avgCentipawnLoss: { type: Number },
      moveQuality: {
        best: { type: Number, default: 0 },
        excellent: { type: Number, default: 0 },
        good: { type: Number, default: 0 },
        inaccuracy: { type: Number, default: 0 },
        mistake: { type: Number, default: 0 },
        blunder: { type: Number, default: 0 }
      },
      totalMoves: { type: Number }
    },
    black: {
      accuracy: { type: Number, min: 0, max: 100 },
      avgCentipawnLoss: { type: Number },
      moveQuality: {
        best: { type: Number, default: 0 },
        excellent: { type: Number, default: 0 },
        good: { type: Number, default: 0 },
        inaccuracy: { type: Number, default: 0 },
        mistake: { type: Number, default: 0 },
        blunder: { type: Number, default: 0 }
      },
      totalMoves: { type: Number }
    }
  },

  // Phase analysis (opening, middlegame, endgame)
  phases: {
    white: [phaseAnalysisSchema],
    black: [phaseAnalysisSchema]
  },

  // Critical moments (biggest eval swings)
  criticalMoments: [criticalMomentSchema],

  // Tactical opportunities (missed tactics)
  tacticalOpportunities: [tacticalOpportunitySchema],

  // Opening analysis
  opening: {
    name: { type: String },
    eco: { type: String }, // ECO code
    moves: { type: Number }, // Number of opening moves
    evaluation: {
      type: {
        type: String,
        enum: ['cp', 'mate']
      },
      value: Number
    }
  },

  // Sharing settings
  isPublic: { type: Boolean, default: false },
  shareToken: { type: String, unique: true, sparse: true },

  // Analysis status
  status: {
    type: String,
    enum: ['pending', 'analyzing', 'completed', 'failed'],
    default: 'pending'
  },
  analysisProgress: { type: Number, min: 0, max: 100, default: 0 },
  errorMessage: { type: String },

  // Timestamps
  createdAt: { type: Date, default: Date.now, index: true },
  completedAt: { type: Date },
  updatedAt: { type: Date, default: Date.now }
});

// Indexes for efficient queries
analysisSchema.index({ userId: 1, createdAt: -1 });
analysisSchema.index({ gameId: 1 });
analysisSchema.index({ shareToken: 1 });
analysisSchema.index({ status: 1, createdAt: -1 });

// Update updatedAt on save
analysisSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Generate share token
analysisSchema.methods.generateShareToken = function() {
  const crypto = require('crypto');
  this.shareToken = crypto.randomBytes(16).toString('hex');
  return this.shareToken;
};

// Virtual for analysis URL
analysisSchema.virtual('url').get(function() {
  return `/analysis/${this._id}`;
});

// Virtual for share URL
analysisSchema.virtual('shareUrl').get(function() {
  if (!this.shareToken) return null;
  return `/analysis/shared/${this.shareToken}`;
});

const Analysis = mongoose.model('Analysis', analysisSchema);

module.exports = Analysis;

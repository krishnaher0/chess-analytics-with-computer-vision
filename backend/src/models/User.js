const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  passwordHash: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  profileStats: {
    gamesPlayed: { type: Number, default: 0 },
    gamesWon: { type: Number, default: 0 },
    gamesDrawn: { type: Number, default: 0 },
    totalAccuracy: { type: Number, default: 0 },
    openingAccuracy: { type: Number, default: 0 },
    middlegameAccuracy: { type: Number, default: 0 },
    endgameAccuracy: { type: Number, default: 0 }
  }
});

const User = mongoose.model('User', userSchema);

module.exports = User;

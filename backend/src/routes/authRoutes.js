const express = require('express');
const router  = express.Router();
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');

const User              = require('../models/User');
const { verifyToken }   = require('../middleware/auth');
const { JWT_SECRET, JWT_EXPIRY } = require('../config/env');

// ── helpers ────────────────────────────────────────────────────

/** Very basic email-format check.  Sufficient for registration gate. */
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// ── POST /register ─────────────────────────────────────────────

router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // --- validation ------------------------------------------------
    if (!username || !email || !password) {
      return res.status(400).json({ message: 'Username, email, and password are required.' });
    }
    if (username.trim().length < 3) {
      return res.status(400).json({ message: 'Username must be at least 3 characters.' });
    }
    if (!isValidEmail(email)) {
      return res.status(400).json({ message: 'Invalid email format.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters.' });
    }

    // --- uniqueness check ------------------------------------------
    const existingEmail    = await User.findOne({ email: email.toLowerCase() });
    const existingUsername = await User.findOne({ username: username.trim() });

    if (existingEmail) {
      return res.status(400).json({ message: 'An account with this email already exists.' });
    }
    if (existingUsername) {
      return res.status(400).json({ message: 'Username is already taken.' });
    }

    // --- create user -----------------------------------------------
    const passwordHash = await bcrypt.hash(password, 10);

    const user = new User({
      username: username.trim(),
      email:    email.toLowerCase(),
      passwordHash
    });

    await user.save();

    return res.status(201).json({
      message: 'User created successfully.',
      userId: user._id
    });
  } catch (error) {
    console.error('[Auth] Register error:', error);
    return res.status(500).json({ message: 'Internal server error during registration.' });
  }
});

// ── POST /login ────────────────────────────────────────────────

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const token = jwt.sign(
      { userId: user._id.toString(), email: user.email, username: user.username },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRY }
    );

    return res.status(200).json({
      token,
      user: {
        id:       user._id,
        username: user.username,
        email:    user.email
      }
    });
  } catch (error) {
    console.error('[Auth] Login error:', error);
    return res.status(500).json({ message: 'Internal server error during login.' });
  }
});

// ── GET /me ────────────────────────────────────────────────────

router.get('/me', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-passwordHash');
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }
    return res.status(200).json(user);
  } catch (error) {
    console.error('[Auth] /me error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
});

module.exports = router;

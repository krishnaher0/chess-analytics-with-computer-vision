const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/env');

/**
 * verifyToken — mandatory auth middleware.
 * Extracts the Bearer token from the Authorization header,
 * verifies it, and attaches { userId, email, username } to req.user.
 * Returns 401 if the token is missing or invalid.
 */
const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Access denied. No token provided.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = {
      userId: decoded.userId,
      email: decoded.email,
      username: decoded.username
    };
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired token.' });
  }
};

/**
 * optionalAuth — non-mandatory auth middleware.
 * Behaves identically to verifyToken when a valid token is present.
 * Sets req.user = null when no Authorization header exists at all,
 * instead of returning 401.  Still rejects a malformed/expired token.
 */
const optionalAuth = (req, res, next) => {
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    req.user = null;
    return next();
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = {
      userId: decoded.userId,
      email: decoded.email,
      username: decoded.username
    };
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired token.' });
  }
};

module.exports = { verifyToken, optionalAuth };

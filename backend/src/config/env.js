const config = {
  MONGO_URI: process.env.MONGO_URI || 'mongodb://localhost:27017/chess_analytics',
  JWT_SECRET: process.env.JWT_SECRET || 'chess_analytics_jwt_secret_dev',
  JWT_EXPIRY: process.env.JWT_EXPIRY || '7d',
  ML_SERVICE_URL: process.env.ML_SERVICE_URL || 'http://localhost:5001',
  STOCKFISH_PATH: process.env.STOCKFISH_PATH || 'stockfish',
  PORT: process.env.PORT || 5000
};

module.exports = config;

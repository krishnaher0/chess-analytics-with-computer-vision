/**
 * app.js — Main entry point for the Chess Analytics backend.
 *
 * Responsibilities
 *   1. Bootstrap dotenv, Express middleware, and CORS.
 *   2. Connect to MongoDB via the shared connectDB helper.
 *   3. Mount every route module under /api/*.
 *   4. Spin up a pure-WebSocket (ws) server on the SAME HTTP
 *      server for real-time clock ticks and move notifications.
 *   5. Listen on PORT (default 5000).
 */

require('dotenv').config();                          // must be first

const express = require('express');
const cors = require('cors');
const http = require('http');
const WebSocket = require('ws');

const { connectDB } = require('./config/db');
const { PORT } = require('./config/env');

const User = require('./models/User');
const Game = require('./models/Game');

// ── Route modules ──────────────────────────────────────────────
const authRoutes = require('./routes/authRoutes');
const gameRoutes = require('./routes/gameRoutes');
const tournamentRoutes = require('./routes/tournamentRoutes');
const profileRoutes = require('./routes/profileRoutes');
const detectionRoutes = require('./routes/detectionRoutes');
const analysisRoutes = require('./routes/analysisRoutes');

// ── Express app ────────────────────────────────────────────────

const app = express();

// CORS — allow all origins during development.
// In production you would restrict this to your front-end origin.
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// JSON body parser
app.use(express.json());

// ── Route mounting ─────────────────────────────────────────────

app.use('/api/auth', authRoutes);
app.use('/api/games', gameRoutes);
app.use('/api/tournaments', tournamentRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/detection', detectionRoutes);
app.use('/api/analysis', analysisRoutes);

// ── HTTP server (shared between Express and WebSocket) ─────────

const server = http.createServer(app);

// ── WebSocket server ───────────────────────────────────────────
//
// Architecture decisions:
//   • We use the 'ws' package (not socket.io) for a minimal,
//     standards-compliant WebSocket layer.
//   • Each connected client sends a JSON message of type
//     "authenticate" containing { token } immediately after
//     connecting.  We verify the JWT and then track the socket
//     in `connectedClients` keyed by userId.
//   • clock_tick: every second we iterate over every userId in
//     `activeGames` and push a clock_tick event to that user's
//     socket.  activeGames is populated when a client sends a
//     "watch_game" message and cleared on "unwatch_game" or
//     disconnect.
//   • game_move: when a client sends a "game_move" message we
//     look up the opponent's socket and forward the payload so
//     the opponent can react in real time.

const wss = new WebSocket.Server({ server });

/** Map<userId (string), WebSocket> – one live connection per user */
const connectedClients = new Map();

/**
 * Map<userId (string), { gameId, opponentId }>
 * Tracks which game each user is currently watching so that
 * we can push clock ticks and route move notifications.
 */
const activeGames = new Map();

/** Interval handle for the 1-second clock-tick loop. */
let clockTickInterval = null;

// ── helpers ────────────────────────────────────────────────────

const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('./config/env');

/**
 * Safely send a JSON payload over a WebSocket.
 * Does nothing if the socket is not in the OPEN state.
 */
function safeSend(ws, payload) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(payload));
  }
}

/**
 * Verify a raw JWT string and return the decoded payload or null.
 */
function decodeToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

// ── clock-tick loop ────────────────────────────────────────────
// Fires every 1 000 ms.  For every userId that has an active game
// we push a clock_tick event containing the game ID and the current
// timestamp so the client can keep its local clock in sync.

clockTickInterval = setInterval(() => {
  activeGames.forEach((gameInfo, userId) => {
    const ws = connectedClients.get(userId);
    safeSend(ws, {
      type: 'clock_tick',
      gameId: gameInfo.gameId,
      timestamp: Date.now()
    });
  });
}, 1000);

// ── connection handler ─────────────────────────────────────────

wss.on('connection', (ws, req) => {
  console.log('[WebSocket] New connection established.');

  let authenticatedUserId = null;   // set once the client authenticates

  ws.on('message', (rawMessage) => {
    let message;
    try {
      message = JSON.parse(rawMessage.toString());
    } catch {
      safeSend(ws, { type: 'error', message: 'Invalid JSON.' });
      return;
    }

    switch (message.type) {

      // ── authenticate ----------------------------------------
      case 'authenticate': {
        const decoded = decodeToken(message.token);
        if (!decoded) {
          safeSend(ws, { type: 'auth_error', message: 'Invalid or missing token.' });
          return;
        }

        authenticatedUserId = decoded.userId;
        connectedClients.set(authenticatedUserId, ws);
        console.log(`[WebSocket] User "${decoded.username || authenticatedUserId}" authenticated.`);
        safeSend(ws, { type: 'authenticated', userId: authenticatedUserId });
        break;
      }

      // ── watch_game – start receiving clock ticks for a game --
      case 'watch_game': {
        if (!authenticatedUserId) {
          safeSend(ws, { type: 'error', message: 'Authenticate first.' });
          return;
        }
        activeGames.set(authenticatedUserId, {
          gameId: message.gameId,
          opponentId: message.opponentId || null
        });
        console.log(`[WebSocket] User ${authenticatedUserId} watching game ${message.gameId}.`);
        safeSend(ws, { type: 'watching', gameId: message.gameId });
        break;
      }

      // ── unwatch_game – stop clock ticks ─────────────────────
      case 'unwatch_game': {
        if (authenticatedUserId) {
          activeGames.delete(authenticatedUserId);
        }
        safeSend(ws, { type: 'unwatched' });
        break;
      }

      // ── game_move – forward move to the opponent -------------
      case 'game_move': {
        if (!authenticatedUserId) {
          safeSend(ws, { type: 'error', message: 'Authenticate first.' });
          return;
        }

        const { gameId, move, opponentId } = message;

        if (opponentId) {
          const opponentWs = connectedClients.get(opponentId);
          if (opponentWs) {
            safeSend(opponentWs, {
              type: 'opponent_move',
              gameId,
              move,
              fromId: authenticatedUserId
            });
            console.log(`[WebSocket] Move forwarded: ${authenticatedUserId} → ${opponentId} (game ${gameId}).`);
          } else {
            console.log(`[WebSocket] Opponent ${opponentId} not connected; move not forwarded.`);
          }
        }

        // Echo confirmation back to the sender
        safeSend(ws, { type: 'move_sent', gameId, move });
        break;
      }

      // ── request_analysis – analyze position and stream back ---
      case 'request_analysis': {
        if (!authenticatedUserId) {
          safeSend(ws, { type: 'error', message: 'Authenticate first.' });
          return;
        }

        const { fen, depth = 15, multipv = 3 } = message;

        if (!fen) {
          safeSend(ws, { type: 'error', message: 'FEN required for analysis.' });
          return;
        }

        // Import stockfish and analyze (async)
        (async () => {
          try {
            const { stockfish, initStockfish } = require('./utils/stockfish');
            await initStockfish();
            await stockfish.setPosition(fen);

            const [evaluation, bestMove, topMoves] = await Promise.all([
              stockfish.getEvaluation(depth),
              stockfish.getBestMove(depth),
              multipv > 1 ? stockfish.getTopMoves(multipv, depth) : Promise.resolve([])
            ]);

            safeSend(ws, {
              type: 'analysis_result',
              fen,
              evaluation,
              bestMove,
              topMoves,
              depth
            });
          } catch (err) {
            console.error('[WebSocket] Analysis error:', err.message);
            safeSend(ws, {
              type: 'analysis_error',
              message: 'Failed to analyze position.',
              error: err.message
            });
          }
        })();

        break;
      }

      // ── toggle_engine – enable/disable engine for game -------
      case 'toggle_engine': {
        if (!authenticatedUserId) {
          safeSend(ws, { type: 'error', message: 'Authenticate first.' });
          return;
        }

        const { gameId, enabled } = message;
        const gameInfo = activeGames.get(authenticatedUserId);

        if (gameInfo && gameInfo.gameId === gameId) {
          gameInfo.engineEnabled = enabled;
          activeGames.set(authenticatedUserId, gameInfo);
          console.log(`[WebSocket] Engine ${enabled ? 'enabled' : 'disabled'} for user ${authenticatedUserId} in game ${gameId}.`);
          safeSend(ws, { type: 'engine_toggled', gameId, enabled });
        } else {
          safeSend(ws, { type: 'error', message: 'Not watching this game.' });
        }

        break;
      }

      // ── challenge_send – send a game invitation to a friend --
      case 'challenge_send': {
        if (!authenticatedUserId) {
          safeSend(ws, { type: 'error', message: 'Authenticate first.' });
          return;
        }

        const { toId, timeControl } = message;
        if (!toId) {
          safeSend(ws, { type: 'error', message: 'toId (recipient) is required.' });
          return;
        }

        const recipientWs = connectedClients.get(toId);
        if (recipientWs) {
          // Find sender's username to provide a nice notification
          (async () => {
            try {
              const sender = await User.findById(authenticatedUserId);
              safeSend(recipientWs, {
                type: 'challenge_received',
                fromId: authenticatedUserId,
                fromUsername: sender ? sender.username : 'Unknown',
                timeControl
              });
              console.log(`[WebSocket] Challenge sent: ${authenticatedUserId} → ${toId}`);
            } catch (err) {
              console.error('[WebSocket] challenge_send error:', err);
              safeSend(ws, { type: 'challenge_error', message: 'Failed to send challenge.' });
            }
          })();
        } else {
          console.log(`[WebSocket] Challenge failed: recipient ${toId} not online.`);
          console.log(`[WebSocket] Online users: ${Array.from(connectedClients.keys()).join(', ')}`);
          safeSend(ws, { type: 'challenge_error', message: 'Friend is not online.' });
        }
        break;
      }

      // ── challenge_accept – recipient accepts the challenge ----
      case 'challenge_accept': {
        if (!authenticatedUserId) {
          safeSend(ws, { type: 'error', message: 'Authenticate first.' });
          return;
        }

        const { fromId, timeControl } = message;

        // Create the game in DB
        (async () => {
          try {
            const newGame = new Game({
              whitePlayerId: fromId,          // Challenger is white
              blackPlayerId: authenticatedUserId, // Recipient is black
              isVsBot: false,
              timeControl: timeControl || { totalSeconds: 300, incrementSeconds: 0 },
              currentFen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
              whiteTimeLeft: (timeControl?.totalSeconds || 300) * 1000,
              blackTimeLeft: (timeControl?.totalSeconds || 300) * 1000,
              activeColor: 'white',
              result: 'ongoing',
              startedAt: new Date()
            });
            await newGame.save();

            // Notify both players
            const challengerWs = connectedClients.get(fromId);
            const commonPayload = {
              type: 'challenge_accepted',
              gameId: newGame._id,
              whitePlayerId: fromId,
              blackPlayerId: authenticatedUserId
            };

            safeSend(ws, commonPayload); // Notify acceptor
            if (challengerWs) {
              safeSend(challengerWs, commonPayload); // Notify challenger
            }
            console.log(`[WebSocket] Challenge accepted: ${fromId} + ${authenticatedUserId} → Game ${newGame._id}`);
          } catch (err) {
            console.error('[WebSocket] Failed to create game on challenge_accept:', err.message);
            safeSend(ws, { type: 'error', message: 'Failed to start game.' });
          }
        })();
        break;
      }

      // ── challenge_decline – recipient rejects the challenge --
      case 'challenge_decline': {
        if (!authenticatedUserId) {
          safeSend(ws, { type: 'error', message: 'Authenticate first.' });
          return;
        }

        const { fromId } = message;
        const challengerWs = connectedClients.get(fromId);
        if (challengerWs) {
          safeSend(challengerWs, {
            type: 'challenge_declined',
            fromId: authenticatedUserId
          });
        }
        console.log(`[WebSocket] Challenge declined by ${authenticatedUserId} (from ${fromId})`);
        break;
      }

      default:
        safeSend(ws, { type: 'error', message: `Unknown message type: ${message.type}` });
    }
  });

  // ── disconnection cleanup ─────────────────────────────────
  ws.on('close', () => {
    if (authenticatedUserId) {
      connectedClients.delete(authenticatedUserId);
      activeGames.delete(authenticatedUserId);
      console.log(`[WebSocket] User ${authenticatedUserId} disconnected.`);
    } else {
      console.log('[WebSocket] Unauthenticated connection closed.');
    }
  });

  ws.on('error', (err) => {
    console.error('[WebSocket] Socket error:', err.message);
  });
});

// ── Bootstrap: connect to MongoDB then start listening ─────────

connectDB()
  .then(() => {
    server.listen(PORT, () => {
      console.log(`[Server] Chess Analytics backend running on port ${PORT}`);
      console.log(`[Server] REST  → http://localhost:${PORT}/api`);
      console.log(`[Server] WS    → ws://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('[Server] MongoDB connection failed. Shutting down.', err.message);
    process.exit(1);
  });

module.exports = app;   // export for testing convenience

#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────
# start-all.sh   — launches all three services locally
#                  (no Docker required)
#
# Prerequisites:
#   - Node.js ≥ 18        (https://nodejs.org)
#   - Python  ≥ 3.9       (https://python.org)
#   - MongoDB running     (mongod)
#   - Stockfish installed (update STOCKFISH_PATH in backend/.env)
#   - npm / pip installed
# ─────────────────────────────────────────────────────────

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# ── colours ──
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'

log()   { echo -e "${GREEN}[chess-analytics]${NC} $*"; }
warn()  { echo -e "${YELLOW}[chess-analytics]${NC} $*"; }
error() { echo -e "${RED}[chess-analytics]${NC} $*"; }

# ── 1. Install backend deps ──
log "Installing backend dependencies…"
cd "$SCRIPT_DIR/backend"
npm install --ignore-scripts 2>&1 | tail -3

# ── 2. Install frontend deps ──
log "Installing frontend dependencies…"
cd "$SCRIPT_DIR/frontend"
npm install 2>&1 | tail -3

# ── 3. Install Python ML service deps ──
log "Installing Python ML service dependencies…"
cd "$SCRIPT_DIR/python-ml-service"
pip install -r requirements.txt --quiet

# ── 4. Verify Stockfish ──
STOCKFISH_PATH=$(grep STOCKFISH_PATH "$SCRIPT_DIR/backend/.env" | cut -d= -f2 | tr -d ' ')
if [ -z "$STOCKFISH_PATH" ] || [ ! -x "$STOCKFISH_PATH" ]; then
  warn "Stockfish not found at '$STOCKFISH_PATH'. Update backend/.env with the correct path."
  warn "  On macOS (Homebrew):  /usr/local/bin/stockfish  or  /opt/homebrew/bin/stockfish"
  warn "  On Linux:            /usr/bin/stockfish"
  warn "Continuing — bot games will fail until this is fixed."
fi

# ── 5. Check for trained models ──
if [ ! -f "$SCRIPT_DIR/python-ml-service/models/board_detector.pt" ] || \
   [ ! -f "$SCRIPT_DIR/python-ml-service/models/piece_detector.pt" ]; then
  warn "Trained models not found in python-ml-service/models/."
  warn "Run the training scripts first:"
  warn "  cd python-ml-service && python train_board_model.py && python train_piece_model.py"
  warn "Camera detection features will not work until models are present."
fi

# ── 6. Launch services in background ──
log "Starting MongoDB check…"
if ! mongod --fork --logpath /dev/null 2>/dev/null; then
  warn "Could not start MongoDB (it may already be running)."
fi

log "Starting Python ML service (port 8000)…"
cd "$SCRIPT_DIR/python-ml-service"
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload &
PY_PID=$!

log "Starting Node.js backend (port 5000)…"
cd "$SCRIPT_DIR/backend"
npx nodemon src/app.js &
NODE_PID=$!

log "Starting React frontend (port 3000)…"
cd "$SCRIPT_DIR/frontend"
BROWSER=none npx react-scripts start &
REACT_PID=$!

# ── 7. Summary ──
echo ""
log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
log "  All services started:"
log "    Frontend   → http://localhost:3000"
log "    Backend    → http://localhost:5000/api"
log "    ML Service → http://localhost:8000"
log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
log "Press Ctrl+C to stop all services."

# ── 8. Trap to kill children on exit ──
cleanup() {
  log "Shutting down…"
  kill $PY_PID $NODE_PID $REACT_PID 2>/dev/null
  wait  $PY_PID $NODE_PID $REACT_PID 2>/dev/null
}
trap cleanup EXIT

# Keep script alive
wait

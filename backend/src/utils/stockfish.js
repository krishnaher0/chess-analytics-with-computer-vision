const { spawn } = require('child_process');
const { STOCKFISH_PATH } = require('../config/env');

class StockfishWrapper {
  constructor(stockfishPath) {
    this.path = stockfishPath || 'stockfish';
    this.process = null;
    this.outputBuffer = [];
    this.listeners = [];   // callbacks waiting for specific output
    this.ready = false;
  }

  /**
   * Spawns the Stockfish process, sends 'uci', and waits for 'uciok'.
   * Must be called (and awaited) before any other method.
   */
  async init() {
    return new Promise((resolve, reject) => {
      this.process = spawn(this.path);

      this.process.on('error', (err) => {
        console.error('[Stockfish] Failed to spawn process:', err.message);
        reject(err);
      });

      this.process.stdout.on('data', (data) => {
        const lines = data.toString().trim().split('\n');
        for (const line of lines) {
          const trimmed = line.trim();
          this.outputBuffer.push(trimmed);
          // Notify all registered listeners
          this.listeners.forEach((listener) => listener(trimmed));
        }
      });

      this.process.stderr.on('data', (data) => {
        console.error('[Stockfish] stderr:', data.toString().trim());
      });

      this.process.on('close', (code) => {
        console.log(`[Stockfish] Process exited with code ${code}`);
        this.ready = false;
      });

      // Send 'uci' and wait for 'uciok'
      this.process.stdin.write('uci\n');

      const uciListener = (line) => {
        if (line === 'uciok') {
          this.ready = true;
          this._removePermanentListener(uciListener);
          resolve();
        }
      };
      this.listeners.push(uciListener);
    });
  }

  // ── private helpers ────────────────────────────────────────────

  _removePermanentListener(fn) {
    this.listeners = this.listeners.filter((l) => l !== fn);
  }

  _send(cmd) {
    if (this.process && this.process.stdin.writable) {
      this.process.stdin.write(cmd + '\n');
    }
  }

  /**
   * Returns a promise that resolves when a line matching the
   * predicate arrives on stdout.  Automatically removes the
   * temporary listener afterward.
   */
  _waitForLine(predicate) {
    return new Promise((resolve) => {
      const listener = (line) => {
        if (predicate(line)) {
          this._removePermanentListener(listener);
          resolve(line);
        }
      };
      this.listeners.push(listener);
    });
  }

  // ── public API ─────────────────────────────────────────────────

  /**
   * Sends 'position fen <fen>' to Stockfish.
   */
  async setPosition(fen) {
    this._send(`position fen ${fen}`);
  }

  /**
   * Sends 'go depth <depth>' and returns the best-move string
   * (e.g. 'e2e4').  Strips any optional ponder move.
   */
  async getBestMove(depth = 15) {
    this._send(`go depth ${depth}`);
    const line = await this._waitForLine((l) => l.startsWith('bestmove'));
    // "bestmove e2e4 ponder e7e5"  →  "e2e4"
    const parts = line.split(' ');
    return parts[1];
  }

  /**
   * Sends 'go depth <depth>' and parses the evaluation from the
   * last 'info' line before 'bestmove'.
   * Returns { type: 'cp'|'mate', value: Number }.
   *   cp   → centipawns (from white's perspective)
   *   mate → number of moves to mate (negative = being mated)
   */
  async getEvaluation(depth = 15) {
    let lastInfo = '';

    const infoListener = (line) => {
      if (line.startsWith('info') && line.includes(' depth ')) {
        lastInfo = line;
      }
    };
    this.listeners.push(infoListener);

    this._send(`go depth ${depth}`);

    await this._waitForLine((l) => l.startsWith('bestmove'));
    this._removePermanentListener(infoListener);

    return this._parseEval(lastInfo);
  }

  /**
   * Sends 'go depth <depth> multipv <n>' and collects n principal
   * variations.  Returns an array of { move, eval: {type, value} }.
   */
  async getTopMoves(n = 3, depth = 15) {
    const pvMap = {};   // multipv index → { move, lastInfoLine }

    const pvListener = (line) => {
      if (line.startsWith('info') && line.includes(' multipv ')) {
        const pvMatch = line.match(/multipv (\d+)/);
        const moveMatch = line.match(/ pv (\S+)/);
        if (pvMatch && moveMatch) {
          const idx = parseInt(pvMatch[1], 10);
          pvMap[idx] = { move: moveMatch[1], infoLine: line };
        }
      }
    };
    this.listeners.push(pvListener);

    this._send(`go depth ${depth} multipv ${n}`);

    await this._waitForLine((l) => l.startsWith('bestmove'));
    this._removePermanentListener(pvListener);

    const results = [];
    for (let i = 1; i <= n; i++) {
      if (pvMap[i]) {
        results.push({
          move: pvMap[i].move,
          eval: this._parseEval(pvMap[i].infoLine)
        });
      }
    }
    return results;
  }

  /**
   * Sends 'quit' and destroys the child process.
   */
  quit() {
    if (this.process) {
      this._send('quit');
      this.process.kill();
      this.process = null;
      this.ready = false;
    }
  }

  /**
   * Adjusts search depth based on a time-control category string.
   * Returns the recommended depth (does NOT send a command).
   */
  setDepthForTimeControl(timeControlType) {
    const map = {
      bullet: 8,
      blitz: 10,
      rapid: 15
    };
    return map[timeControlType] || 15;
  }

  /**
   * Configures Stockfish's UCI_LimitStrength / UCI_AnalysisELO
   * options to simulate a player of a given difficulty level.
   */
  setBotDifficulty(difficulty) {
    switch (difficulty) {
      case 'beginner':
        this._send('setoption name UCI_LimitStrength type check value true');
        this._send('setoption name UCI_AnalysisELO type spin value 800');
        break;
      case 'intermediate':
        this._send('setoption name UCI_LimitStrength type check value true');
        this._send('setoption name UCI_AnalysisELO type spin value 1400');
        break;
      case 'advanced':
        this._send('setoption name UCI_LimitStrength type check value true');
        this._send('setoption name UCI_AnalysisELO type spin value 2000');
        break;
      case 'expert':
        this._send('setoption name UCI_LimitStrength type check value false');
        break;
      default:
        console.warn(`[Stockfish] Unknown difficulty: ${difficulty}`);
    }
    this._send('isready');   // flush option changes before next search
  }

  // ── internal eval parser ───────────────────────────────────────

  _parseEval(infoLine) {
    if (!infoLine) return { type: 'cp', value: 0 };

    const mateMatch = infoLine.match(/ score mate (-?\d+)/);
    if (mateMatch) {
      return { type: 'mate', value: parseInt(mateMatch[1], 10) };
    }

    const cpMatch = infoLine.match(/ score cp (-?\d+)/);
    if (cpMatch) {
      return { type: 'cp', value: parseInt(cpMatch[1], 10) };
    }

    return { type: 'cp', value: 0 };
  }
}

// ── Singleton ──────────────────────────────────────────────────

const stockfish = new StockfishWrapper(STOCKFISH_PATH);

// Eagerly initialise; callers that need the engine should await
// stockfish.init() at startup or lazily before first use.
// We do NOT await here because module-level top-scope cannot be async.
// The route handlers call initStockfish() before using it.
let _initPromise = null;

async function initStockfish() {
  if (!_initPromise) {
    _initPromise = stockfish.init();
  }
  return _initPromise;
}

module.exports = { stockfish, initStockfish };

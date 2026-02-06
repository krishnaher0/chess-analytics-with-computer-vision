const { Chess } = require('chess.js');

/**
 * Result mapping: internal game.result values → PGN result tokens.
 */
const RESULT_MAP = {
  white: '1-0',
  black: '0-1',
  draw: '1/2-1/2',
  ongoing: '*'
};

/**
 * generatePGN(game)
 *
 * Accepts a Mongoose Game document (or a plain object with the same
 * shape) and returns a complete PGN text string.
 *
 * @param {Object} game        – the game document / plain object
 * @param {string} [whiteName] – display name for White (optional; falls back to 'Bot')
 * @param {string} [blackName] – display name for Black (optional; falls back to 'Bot')
 * @returns {string}           – PGN text
 */
function generatePGN(game, whiteName, blackName) {
  const chess = new Chess();

  // Replay every recorded move so that chess.js internal state
  // matches what was actually played.  If a move is somehow invalid
  // we log a warning and stop replaying (the remaining moves will
  // simply be absent from the PGN).
  for (const m of game.moves) {
    const result = chess.move(m.san);
    if (!result) {
      console.warn(`[PGN] Invalid move "${m.san}" at move number ${m.moveNumber}. Stopping replay.`);
      break;
    }
  }

  // Determine player display names
  const white = whiteName || 'Bot';
  const black = blackName || 'Bot';

  // Build the date header in PGN format: YYYY.MM.DD
  const now = game.startedAt ? new Date(game.startedAt) : new Date();
  const dateStr = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0')
  ].join('.');

  // TimeControl header: "totalSeconds+incrementSeconds"  e.g. "300+0"
  const tc = game.timeControl
    ? `${game.timeControl.totalSeconds}+${game.timeControl.incrementSeconds}`
    : '0+0';

  // chess.js exposes pgn() which returns the move-text portion.
  // We prepend the standard tag roster ourselves for full control.
  const pgnResult = RESULT_MAP[game.result] || '*';

  const headers = [
    `[Event "Club Game"]`,
    `[Site "Nepal"]`,
    `[Date "${dateStr}"]`,
    `[Round "1"]`,
    `[White "${white}"]`,
    `[Black "${black}"]`,
    `[Result "${pgnResult}"]`,
    `[TimeControl "${tc}"]`
  ].join('\n');

  // chess.pgn() already includes default headers; we replace them
  // with our own by extracting only the movetext portion.
  const fullPgn = chess.pgn();
  // The movetext starts after the last empty line following the headers.
  const parts = fullPgn.split('\n\n');
  const movetext = parts.length > 1 ? parts.slice(1).join('\n\n') : fullPgn;

  return `${headers}\n\n${movetext.trim()} ${pgnResult}\n`;
}

/**
 * convertUCItoSAN(uciMove, fen)
 *
 * Converts a UCI move string (e.g. 'e2e4', 'e7e8q') to its
 * Standard Algebraic Notation equivalent given the board position.
 *
 * @param {string} uciMove – UCI move (4–5 chars)
 * @param {string} fen     – FEN of the position BEFORE the move
 * @returns {string}       – SAN string (e.g. 'e4', 'Nf3', 'O-O')
 */
function convertUCItoSAN(uciMove, fen) {
  const chess = new Chess(fen);

  const from = uciMove.slice(0, 2);
  const to   = uciMove.slice(2, 4);
  const promotion = uciMove[4] || undefined;   // e.g. 'q' for queen

  const moveObj = { from, to };
  if (promotion) moveObj.promotion = promotion;

  const result = chess.move(moveObj);

  if (!result) {
    throw new Error(`[PGN] UCI move "${uciMove}" is illegal on FEN: ${fen}`);
  }

  return result.san;
}

module.exports = { generatePGN, convertUCItoSAN };

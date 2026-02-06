"""
fen_generator.py
----------------
FEN-string generation and validation from a piece-square map produced by
the detection pipeline.
"""

# ---------------------------------------------------------------------------
# Piece-class-name  →  FEN character
# ---------------------------------------------------------------------------
PIECE_TO_FEN: dict[str, str] = {
    "white_king":   "K",
    "white_queen":  "Q",
    "white_rook":   "R",
    "white_bishop": "B",
    "white_knight": "N",
    "white_pawn":   "P",
    "black_king":   "k",
    "black_queen":  "q",
    "black_rook":   "r",
    "black_bishop": "b",
    "black_knight": "n",
    "black_pawn":   "p",
}


# ---------------------------------------------------------------------------
# FEN generation
# ---------------------------------------------------------------------------
def generate_fen(square_map: dict[str, str]) -> str:
    """
    Build a complete FEN string from a square → piece-class mapping.

    The board portion is constructed by walking rank 8 down to rank 1 and
    file a through h.  Consecutive empty squares are collapsed into a single
    digit (1-8) as the FEN standard requires.

    The remaining fields use safe defaults:
        * Active colour  : ``w``  (white to move)
        * Castling       : ``KQkq``  (all rights; the Node.js backend will
                                      update this from its own game state)
        * En-passant     : ``-``  (none)
        * Half-move clock: ``0``
        * Full-move number: ``1``

    Parameters
    ----------
    square_map : dict[str, str]
        Keys are algebraic squares (``"a1"`` … ``"h8"``);
        values are piece class names (``"white_king"`` etc.).

    Returns
    -------
    str
        A complete FEN string.
    """
    ranks: list[str] = []

    for rank_num in range(8, 0, -1):            # 8 … 1
        rank_str = ""
        empty_count = 0

        for file_idx in range(8):               # a … h  (0 … 7)
            file_char = "abcdefgh"[file_idx]
            square = file_char + str(rank_num)

            if square in square_map:
                # Flush any accumulated empties first
                if empty_count > 0:
                    rank_str += str(empty_count)
                    empty_count = 0
                piece_class = square_map[square]
                rank_str += PIECE_TO_FEN.get(piece_class, "?")
            else:
                empty_count += 1

        # Flush trailing empties for this rank
        if empty_count > 0:
            rank_str += str(empty_count)

        ranks.append(rank_str)

    board_part = "/".join(ranks)
    fen = f"{board_part} w KQkq - 0 1"
    return fen


# ---------------------------------------------------------------------------
# FEN validation
# ---------------------------------------------------------------------------
_VALID_BOARD_CHARS = set("rnbqkpRNBQKP12345678")


def validate_fen(fen: str) -> dict[str, object]:
    """
    Perform lightweight validation on a FEN string (board portion only).

    Checks performed:
        1. Exactly one white king (``K``).
        2. Exactly one black king (``k``).
        3. At most 8 white pawns (``P``).
        4. At most 8 black pawns (``p``).
        5. Exactly 8 ranks separated by ``/``.
        6. Each rank sums to exactly 8 squares (pieces count as 1, digits
           are interpreted as their integer value).
        7. No characters outside the legal set appear in the board portion.

    Parameters
    ----------
    fen : str
        A full FEN string (all 6 fields, space-separated).

    Returns
    -------
    dict
        ``{"valid": bool, "errors": list[str]}``
    """
    errors: list[str] = []

    # Isolate the board portion (first space-separated token)
    board_part = fen.split(" ")[0] if " " in fen else fen

    # ----------------------------------------------------------
    # 5. Rank count
    # ----------------------------------------------------------
    ranks = board_part.split("/")
    if len(ranks) != 8:
        errors.append(
            f"Expected 8 ranks separated by '/', found {len(ranks)}."
        )

    # ----------------------------------------------------------
    # 7. Invalid characters
    # ----------------------------------------------------------
    for ch in board_part:
        if ch != "/" and ch not in _VALID_BOARD_CHARS:
            errors.append(f"Invalid character '{ch}' in board portion.")

    # ----------------------------------------------------------
    # 6. Each rank must sum to 8
    # ----------------------------------------------------------
    for i, rank in enumerate(ranks):
        total = 0
        for ch in rank:
            if ch.isdigit():
                total += int(ch)
            else:
                total += 1          # a piece occupies one square
        if total != 8:
            errors.append(
                f"Rank {8 - i} ('{rank}') sums to {total} squares; expected 8."
            )

    # ----------------------------------------------------------
    # 1 & 2. King counts
    # ----------------------------------------------------------
    white_kings = board_part.count("K")
    black_kings = board_part.count("k")
    if white_kings != 1:
        errors.append(
            f"Expected exactly 1 white king ('K'), found {white_kings}."
        )
    if black_kings != 1:
        errors.append(
            f"Expected exactly 1 black king ('k'), found {black_kings}."
        )

    # ----------------------------------------------------------
    # 3 & 4. Pawn counts
    # ----------------------------------------------------------
    white_pawns = board_part.count("P")
    black_pawns = board_part.count("p")
    if white_pawns > 8:
        errors.append(
            f"White has {white_pawns} pawns; maximum is 8."
        )
    if black_pawns > 8:
        errors.append(
            f"Black has {black_pawns} pawns; maximum is 8."
        )

    return {"valid": len(errors) == 0, "errors": errors}

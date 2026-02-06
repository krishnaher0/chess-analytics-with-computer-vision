/**
 * Tournament Pairing Service
 * Implements Swiss, Round-Robin, and Knockout pairing algorithms
 */

/**
 * Swiss System Pairing
 * Players with similar scores are paired together
 * Avoids repeat pairings when possible
 */
function generateSwissPairings(standings, currentRound, previousRounds = []) {
  // Sort by points, then tie-breaks
  const sortedPlayers = [...standings].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.buchholz !== a.buchholz) return b.buchholz - a.buchholz;
    return b.sonnebornBerger - a.sonnebornBerger;
  });

  const pairings = [];
  const paired = new Set();

  // Track color preferences (players should alternate colors)
  const needsWhite = sortedPlayers.filter(p => p.colors.black > p.colors.white);
  const needsBlack = sortedPlayers.filter(p => p.colors.white > p.colors.black);

  for (let i = 0; i < sortedPlayers.length; i++) {
    if (paired.has(sortedPlayers[i].userId.toString())) continue;

    const player1 = sortedPlayers[i];
    let player2 = null;

    // Find suitable opponent
    for (let j = i + 1; j < sortedPlayers.length; j++) {
      if (paired.has(sortedPlayers[j].userId.toString())) continue;

      const candidate = sortedPlayers[j];

      // Check if they've already played
      const alreadyPlayed = player1.opponentsPlayed.some(
        opp => opp.toString() === candidate.userId.toString()
      );

      if (!alreadyPlayed) {
        player2 = candidate;
        break;
      }
    }

    // If no suitable opponent found (rare), pair with closest available
    if (!player2) {
      for (let j = i + 1; j < sortedPlayers.length; j++) {
        if (!paired.has(sortedPlayers[j].userId.toString())) {
          player2 = sortedPlayers[j];
          break;
        }
      }
    }

    if (player2) {
      // Determine colors based on color balance
      let white, black;

      if (player1.colors.white < player1.colors.black &&
          player2.colors.black < player2.colors.white) {
        white = player1.userId;
        black = player2.userId;
      } else if (player1.colors.black < player1.colors.white &&
                 player2.colors.white < player2.colors.black) {
        white = player2.userId;
        black = player1.userId;
      } else {
        // Default: higher-ranked player gets white
        white = player1.userId;
        black = player2.userId;
      }

      pairings.push({
        white,
        black,
        result: 'pending',
        boardNumber: pairings.length + 1
      });

      paired.add(player1.userId.toString());
      paired.add(player2.userId.toString());
    }
  }

  // Handle bye (odd number of players)
  if (sortedPlayers.length % 2 === 1) {
    const unpaired = sortedPlayers.find(
      p => !paired.has(p.userId.toString())
    );

    if (unpaired) {
      // Award bye point (1 point for sitting out)
      pairings.push({
        white: unpaired.userId,
        black: null,
        result: '1-0',
        boardNumber: pairings.length + 1
      });
    }
  }

  return pairings;
}

/**
 * Round-Robin Pairing
 * Every player plays every other player once
 */
function generateRoundRobinPairings(participants, currentRound) {
  const n = participants.length;

  // Berger tables algorithm for round-robin
  if (n < 2) return [];

  // Make even number of participants (add dummy if odd)
  const players = [...participants];
  const hasBye = n % 2 === 1;
  if (hasBye) {
    players.push(null); // Dummy player for bye
  }

  const totalPlayers = players.length;
  const totalRounds = totalPlayers - 1;

  if (currentRound > totalRounds) {
    return []; // Tournament complete
  }

  // Round-robin rotation algorithm
  const pairings = [];
  const round = currentRound - 1; // 0-indexed

  // Fixed position for first player
  const fixed = players[0];
  const rotating = players.slice(1);

  // Rotate for this round
  const rotated = [
    ...rotating.slice(round),
    ...rotating.slice(0, round)
  ];

  const roundPlayers = [fixed, ...rotated];

  // Pair players: first half vs second half (reversed)
  const half = totalPlayers / 2;
  for (let i = 0; i < half; i++) {
    const p1 = roundPlayers[i];
    const p2 = roundPlayers[totalPlayers - 1 - i];

    // Skip if either player is the bye dummy
    if (!p1 || !p2) continue;

    // Alternate colors each round
    const white = currentRound % 2 === 1 ? p1 : p2;
    const black = currentRound % 2 === 1 ? p2 : p1;

    pairings.push({
      white,
      black,
      result: 'pending',
      boardNumber: pairings.length + 1
    });
  }

  return pairings;
}

/**
 * Knockout/Single Elimination Bracket
 * Winners advance to next round
 */
function generateKnockoutBracket(participants) {
  const n = participants.length;

  // Find next power of 2
  const bracketSize = Math.pow(2, Math.ceil(Math.log2(n)));
  const firstRoundByes = bracketSize - n;

  const matches = [];
  let matchNumber = 1;

  // Calculate number of rounds (log2 of bracket size)
  const totalRounds = Math.log2(bracketSize);

  // Seed players (can be enhanced with actual seeding based on rating)
  const seededPlayers = [...participants];

  // First round
  const firstRoundMatches = Math.floor(n / 2);

  for (let i = 0; i < firstRoundMatches; i++) {
    matches.push({
      round: totalRounds,
      matchNumber: matchNumber++,
      player1: seededPlayers[i * 2],
      player2: seededPlayers[i * 2 + 1],
      winner: null,
      result: null,
      nextMatch: Math.ceil(matchNumber / 2)
    });
  }

  // Handle byes (players who advance automatically)
  if (firstRoundByes > 0) {
    const byePlayers = seededPlayers.slice(n - firstRoundByes);
    byePlayers.forEach(player => {
      matches.push({
        round: totalRounds,
        matchNumber: matchNumber++,
        player1: player,
        player2: null,
        winner: player,
        result: 'bye',
        nextMatch: Math.ceil(matchNumber / 2)
      });
    });
  }

  return matches;
}

/**
 * Update standings after a game result
 */
function updateStandingsAfterGame(standings, whiteId, blackId, result) {
  const whiteStanding = standings.find(
    s => s.userId.toString() === whiteId.toString()
  );
  const blackStanding = standings.find(
    s => s.userId.toString() === blackId.toString()
  );

  if (!whiteStanding || !blackStanding) {
    throw new Error('Player not found in standings');
  }

  // Update games played
  whiteStanding.gamesPlayed++;
  blackStanding.gamesPlayed++;

  // Update colors
  whiteStanding.colors.white++;
  blackStanding.colors.black++;

  // Update opponents
  if (!whiteStanding.opponentsPlayed.includes(blackId)) {
    whiteStanding.opponentsPlayed.push(blackId);
  }
  if (!blackStanding.opponentsPlayed.includes(whiteId)) {
    blackStanding.opponentsPlayed.push(whiteId);
  }

  // Update results based on game outcome
  if (result === '1-0') {
    // White wins
    whiteStanding.wins++;
    whiteStanding.points++;
    blackStanding.losses++;
  } else if (result === '0-1') {
    // Black wins
    blackStanding.wins++;
    blackStanding.points++;
    whiteStanding.losses++;
  } else if (result === '1/2-1/2') {
    // Draw
    whiteStanding.draws++;
    blackStanding.draws++;
    whiteStanding.points += 0.5;
    blackStanding.points += 0.5;
  }

  // Update progressive score (cumulative)
  whiteStanding.progressiveScore += whiteStanding.points;
  blackStanding.progressiveScore += blackStanding.points;

  return standings;
}

/**
 * Calculate tie-break scores
 */
function calculateTieBreaks(standings) {
  const standingsMap = new Map();
  standings.forEach(s => standingsMap.set(s.userId.toString(), s));

  standings.forEach(standing => {
    // Buchholz: sum of opponents' scores
    standing.buchholz = standing.opponentsPlayed.reduce((sum, oppId) => {
      const opponent = standingsMap.get(oppId.toString());
      return sum + (opponent ? opponent.points : 0);
    }, 0);

    // Sonneborn-Berger: sum of (opponent's score × game result)
    // For now, simplified: defeated opponents' total scores
    standing.sonnebornBerger = standing.wins * standing.buchholz / standing.gamesPlayed || 0;
  });

  return standings;
}

module.exports = {
  generateSwissPairings,
  generateRoundRobinPairings,
  generateKnockoutBracket,
  updateStandingsAfterGame,
  calculateTieBreaks
};

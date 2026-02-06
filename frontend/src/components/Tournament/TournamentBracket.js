import React from 'react';

const TournamentBracket = ({ tournament }) => {
  if (!tournament || !tournament.rounds || tournament.rounds.length === 0) {
    return (
      <div className="text-center text-gray-400 py-8">
        No rounds have been created yet.
      </div>
    );
  }

  // For Swiss and Round-Robin formats
  if (tournament.format === 'swiss' || tournament.format === 'round-robin') {
    return (
      <div className="space-y-6">
        {tournament.rounds.map((round) => (
          <div key={round.roundNumber} className="bg-gray-800 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">
                Round {round.roundNumber}
              </h3>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                round.status === 'completed'
                  ? 'bg-green-900 text-green-300'
                  : round.status === 'ongoing'
                  ? 'bg-blue-900 text-blue-300'
                  : 'bg-gray-700 text-gray-300'
              }`}>
                {round.status}
              </span>
            </div>

            <div className="space-y-2">
              {round.pairings.map((pairing, idx) => (
                <div
                  key={idx}
                  className="bg-gray-700 rounded p-3 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <span className="text-gray-400 text-sm">#{pairing.boardNumber}</span>

                    <div className="flex-1 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-white font-medium">
                          {pairing.white?.username || 'BYE'}
                        </span>
                        <span className="text-gray-500 text-xs">⚪</span>
                      </div>

                      <span className="text-gray-400 mx-4">vs</span>

                      <div className="flex items-center gap-2">
                        <span className="text-gray-500 text-xs">⚫</span>
                        <span className="text-white font-medium">
                          {pairing.black?.username || 'BYE'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="ml-4">
                    {pairing.result === 'pending' && (
                      <span className="text-yellow-400 text-sm">Pending</span>
                    )}
                    {pairing.result === 'ongoing' && (
                      <span className="text-blue-400 text-sm">In Progress</span>
                    )}
                    {pairing.result === '1-0' && (
                      <span className="text-green-400 text-sm font-medium">1-0</span>
                    )}
                    {pairing.result === '0-1' && (
                      <span className="text-green-400 text-sm font-medium">0-1</span>
                    )}
                    {pairing.result === '1/2-1/2' && (
                      <span className="text-gray-400 text-sm font-medium">½-½</span>
                    )}
                    {pairing.gameId && (
                      <a
                        href={`/game/${pairing.gameId}`}
                        className="ml-2 text-blue-400 hover:text-blue-300 text-sm"
                      >
                        View
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {round.startTime && (
              <div className="mt-3 text-sm text-gray-400">
                Started: {new Date(round.startTime).toLocaleString()}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  }

  // For Knockout format
  if (tournament.format === 'knockout' && tournament.knockoutMatches) {
    // Group matches by round
    const matchesByRound = {};
    tournament.knockoutMatches.forEach((match) => {
      if (!matchesByRound[match.round]) {
        matchesByRound[match.round] = [];
      }
      matchesByRound[match.round].push(match);
    });

    const rounds = Object.keys(matchesByRound).sort((a, b) => b - a);
    const roundNames = {
      1: 'Finals',
      2: 'Semi-Finals',
      3: 'Quarter-Finals',
      4: 'Round of 16'
    };

    return (
      <div className="overflow-x-auto">
        <div className="flex gap-8 p-4 min-w-max">
          {rounds.map((roundNum) => (
            <div key={roundNum} className="flex flex-col gap-4 min-w-[250px]">
              <h3 className="text-center text-lg font-semibold text-white mb-2">
                {roundNames[roundNum] || `Round ${roundNum}`}
              </h3>

              {matchesByRound[roundNum].map((match) => (
                <div
                  key={match.matchNumber}
                  className="bg-gray-800 rounded-lg p-4 space-y-2"
                >
                  <div className={`flex items-center justify-between p-2 rounded ${
                    match.winner?.toString() === match.player1?.toString()
                      ? 'bg-green-900'
                      : 'bg-gray-700'
                  }`}>
                    <span className="text-white">
                      {match.player1?.username || 'TBD'}
                    </span>
                    {match.winner?.toString() === match.player1?.toString() && (
                      <span className="text-green-400">✓</span>
                    )}
                  </div>

                  <div className="text-center text-gray-500 text-sm">vs</div>

                  <div className={`flex items-center justify-between p-2 rounded ${
                    match.winner?.toString() === match.player2?.toString()
                      ? 'bg-green-900'
                      : 'bg-gray-700'
                  }`}>
                    <span className="text-white">
                      {match.player2?.username || 'TBD'}
                    </span>
                    {match.winner?.toString() === match.player2?.toString() && (
                      <span className="text-green-400">✓</span>
                    )}
                  </div>

                  {match.result === 'bye' && (
                    <div className="text-center text-yellow-400 text-sm mt-2">
                      BYE
                    </div>
                  )}

                  {match.gameId && (
                    <a
                      href={`/game/${match.gameId}`}
                      className="block text-center text-blue-400 hover:text-blue-300 text-sm mt-2"
                    >
                      View Game
                    </a>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return null;
};

export default TournamentBracket;

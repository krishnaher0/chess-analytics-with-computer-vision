import React from 'react';

const TournamentStandings = ({ standings }) => {
  if (!standings || standings.length === 0) {
    return (
      <div className="text-center text-gray-400 py-8">
        No standings available yet.
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg overflow-hidden">
      <table className="w-full">
        <thead className="bg-gray-900">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
              Rank
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
              Player
            </th>
            <th className="px-4 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">
              Points
            </th>
            <th className="px-4 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">
              W/D/L
            </th>
            <th className="px-4 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">
              Games
            </th>
            <th className="px-4 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">
              Buchholz
            </th>
            <th className="px-4 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">
              S-B
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-700">
          {standings.map((standing, idx) => (
            <tr
              key={standing.userId?._id || idx}
              className={`hover:bg-gray-750 transition-colors ${
                idx < 3 ? 'bg-gray-750' : ''
              }`}
            >
              <td className="px-4 py-3 whitespace-nowrap">
                <div className="flex items-center gap-2">
                  {idx === 0 && <span className="text-yellow-400">🥇</span>}
                  {idx === 1 && <span className="text-gray-300">🥈</span>}
                  {idx === 2 && <span className="text-orange-400">🥉</span>}
                  <span className={`text-sm font-medium ${
                    idx < 3 ? 'text-white' : 'text-gray-300'
                  }`}>
                    {standing.rank || idx + 1}
                  </span>
                </div>
              </td>
              <td className="px-4 py-3 whitespace-nowrap">
                <span className={`text-sm font-medium ${
                  idx < 3 ? 'text-white' : 'text-gray-300'
                }`}>
                  {standing.userId?.username || 'Unknown'}
                </span>
              </td>
              <td className="px-4 py-3 text-center whitespace-nowrap">
                <span className="text-lg font-bold text-primary-400">
                  {standing.points}
                </span>
              </td>
              <td className="px-4 py-3 text-center whitespace-nowrap">
                <span className="text-sm text-gray-300">
                  {standing.wins}/{standing.draws}/{standing.losses}
                </span>
              </td>
              <td className="px-4 py-3 text-center whitespace-nowrap">
                <span className="text-sm text-gray-400">
                  {standing.gamesPlayed}
                </span>
              </td>
              <td className="px-4 py-3 text-center whitespace-nowrap">
                <span className="text-sm text-gray-400">
                  {standing.buchholz.toFixed(1)}
                </span>
              </td>
              <td className="px-4 py-3 text-center whitespace-nowrap">
                <span className="text-sm text-gray-400">
                  {standing.sonnebornBerger.toFixed(1)}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="bg-gray-900 px-4 py-3 text-xs text-gray-400">
        <p>Points: Win = 1, Draw = 0.5, Loss = 0</p>
        <p>Tie-breaks: Buchholz (sum of opponents' scores), Sonneborn-Berger</p>
      </div>
    </div>
  );
};

export default TournamentStandings;

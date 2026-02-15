import React from 'react';
import { useGame } from '../../context/GameContext';

export default function ChallengeNotification() {
    const { incomingChallenge, acceptChallenge, declineChallenge } = useGame();

    if (!incomingChallenge) return null;

    return (
        <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-5">
            <div className="card border-primary-500 bg-gray-900 shadow-2xl p-4 w-80">
                <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-primary-600 flex items-center justify-center text-white font-bold">
                        {incomingChallenge.fromUsername?.[0]?.toUpperCase() || 'P'}
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-100">Game Challenge!</h3>
                        <p className="text-sm text-gray-400">From {incomingChallenge.fromUsername}</p>
                    </div>
                </div>

                <div className="text-sm text-gray-300 mb-4 bg-gray-800 rounded p-2 border border-gray-700">
                    Mode: {incomingChallenge.timeControl?.label || 'Custom'}
                    <br />
                    {incomingChallenge.timeControl?.totalSeconds / 60} min + {incomingChallenge.timeControl?.incrementSeconds}s
                </div>

                <div className="flex gap-2 mt-4">
                    <button
                        onClick={() => acceptChallenge(incomingChallenge.fromId, incomingChallenge.timeControl)}
                        className="btn-primary flex-1 py-2 text-sm"
                    >
                        Accept
                    </button>
                    <button
                        onClick={() => declineChallenge(incomingChallenge.fromId)}
                        className="bg-gray-700 hover:bg-gray-600 text-white rounded-lg px-4 py-2 text-sm transition-colors flex-1"
                    >
                        Decline
                    </button>
                </div>
            </div>
        </div>
    );
}

import React, { useMemo } from 'react';

type Winner = 'player' | 'ai';

interface Props {
    winner: Winner;
    onRestart: () => void;
    onClose: () => void;
}

/**
 * Celebratory modal with confetti particles.
 * Confetti implemented as many small <span> elements with CSS keyframes.
 */
const GameOverModal: React.FC<Props> = ({ winner, onRestart, onClose }) => {
    // generate confetti positions (stable per mount)
    const confetti = useMemo(() => {
        const pieces = [];
        const colors = ['#F43F5E', '#FB923C', '#FDE68A', '#34D399', '#60A5FA', '#A78BFA'];
        for (let i = 0; i < 36; i++) {
            pieces.push({
                left: `${Math.random() * 100}%`,
                delay: `${Math.random() * 600}ms`,
                dur: `${900 + Math.floor(Math.random() * 600)}ms`,
                color: colors[Math.floor(Math.random() * colors.length)],
                rotate: `${Math.random() * 360}deg`,
            });
        }
        return pieces;
    }, []);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-auto">
            {/* dark overlay */}
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

            {/* confetti layer */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                {confetti.map((c, i) => (
                    <span
                        key={i}
                        className="absolute w-2 h-3 rounded-sm animate-confetti"
                        style={{
                            left: c.left,
                            top: '-5%',
                            background: c.color,
                            animationDelay: c.delay,
                            animationDuration: c.dur,
                            transform: `rotate(${c.rotate})`,
                        }}
                    />
                ))}
            </div>

            <div className="relative z-10 bg-white rounded-2xl p-8 w-11/12 max-w-md shadow-2xl text-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="text-6xl">{winner === 'player' ? '🏆' : '💀'}</div>
                    <h2 className="text-3xl font-bold">
                        {winner === 'player' ? 'You Win!' : 'You Lose'}
                    </h2>
                    <p className="text-gray-600">
                        {winner === 'player' ? 'Nice work — all enemy ships destroyed.' : 'All your ships have been sunk. Try again!'}
                    </p>

                    <div className="mt-4 flex gap-3">
                        <button
                            onClick={() => {
                                onRestart();
                            }}
                            className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                        >
                            Restart Game
                        </button>

                        <button
                            onClick={() => {
                                onClose();
                            }}
                            className="px-6 py-2 bg-gray-200 rounded hover:bg-gray-300 transition"
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GameOverModal;

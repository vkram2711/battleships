import React, { useState } from 'react';
import Board from './components/Board';
import GameOverModal from './components/GameOverModal';
import {
    attackCell,
    placeShip,
    resetPlacement as apiResetPlacement,
    confirmPlacement as apiConfirmPlacement,
    restartGame as apiRestartGame,
} from './api';

// ... keep your helper types and functions (generateShipQueue, sleep, diffBoardChanges) above or import them ...

interface ShipQueueItem {
    length: number;
    orientation: 'H' | 'V';
}

const generateShipQueue = (): ShipQueueItem[] => {
    const shipDefs = [
        { length: 4, count: 1 },
        { length: 3, count: 2 },
        { length: 2, count: 3 },
        { length: 1, count: 4 },
    ];
    const q: ShipQueueItem[] = [];
    shipDefs.forEach(def => {
        for (let i = 0; i < def.count; i++) q.push({ length: def.length, orientation: 'H' });
    });
    return q;
};

const sleep = (ms: number) => new Promise(res => setTimeout(res, ms));

// copy diffBoardChanges from your project
const diffBoardChanges = (
    prev: string[][],
    next: string[][]
): { row: number; col: number; to: string; from: string }[] => {
    const changes: { row: number; col: number; to: string; from: string }[] = [];
    for (let r = 0; r < prev.length; r++) {
        for (let c = 0; c < prev[r].length; c++) {
            if (prev[r][c] !== next[r][c]) {
                changes.push({ row: r, col: c, from: prev[r][c], to: next[r][c] });
            }
        }
    }
    return changes;
};

type Highlight = { row: number; col: number; result: 'hit' | 'miss' };

const App: React.FC = () => {
    const [playerBoard, setPlayerBoard] = useState<string[][]>(Array(10).fill(null).map(() => Array(10).fill('~')));
    const [aiBoard, setAiBoard] = useState<string[][]>(Array(10).fill(null).map(() => Array(10).fill('~')));
    const [loading, setLoading] = useState(false);

    const [shipQueue, setShipQueue] = useState<ShipQueueItem[]>(generateShipQueue());
    const [currentShipIndex, setCurrentShipIndex] = useState(0);
    const placingShip = shipQueue[currentShipIndex] || null;
    const [orientation, setOrientation] = useState<'H' | 'V'>('H');

    const [gameStarted, setGameStarted] = useState(false);
    const [aiPlaying, setAiPlaying] = useState(false);

    const [highlightCellsPlayer, setHighlightCellsPlayer] = useState<Highlight[] | null>(null);
    const [highlightCellsAI, setHighlightCellsAI] = useState<Highlight[] | null>(null);

    const [gameOver, setGameOver] = useState(false);
    const [winner, setWinner] = useState<'player' | 'ai' | null>(null);
    const [notification, setNotification] = useState<string | null>(null);

    const showNotification = (msg: string) => {
        setNotification(msg);
        setTimeout(() => setNotification(null), 2000); // auto-hide after 2s
    };
    // --------------- Placement handlers (unchanged) ---------------
    const handlePlayerPlace = async (row: number, col: number) => {
        if (!placingShip || gameStarted) return;
        setLoading(true);
        const data = await placeShip(row, col, placingShip.length, orientation);
        if (data.success) {
            setPlayerBoard(data.player_board);
            setCurrentShipIndex(prev => prev + 1);
        } else {
            showNotification('❌ Invalid placement! Ships cannot overlap or touch.');
        }
        setLoading(false);
    };


    const resetPlacementHandler = async () => {
        setLoading(true);
        const data = await apiResetPlacement();
        setPlayerBoard(data.player_board);
        setShipQueue(generateShipQueue());
        setCurrentShipIndex(0);
        setOrientation('H');
        setGameStarted(false);
        setGameOver(false);
        setWinner(null);
        setLoading(false);
    };

    const confirmPlacementHandler = async () => {
        if (placingShip) return alert('Place all ships before confirming!');
        setLoading(true);
        const data = await apiConfirmPlacement();
        setPlayerBoard(data.player_board);
        setAiBoard(data.ai_board);
        setGameStarted(true);
        setGameOver(false);
        setWinner(null);
        setLoading(false);
    };

    // --------------- Restart at any time ---------------
    const restartGameHandler = async () => {
        setLoading(true);
        const data = await apiRestartGame();
        // Reset frontend state to fresh placement (because server re-created game)
        setPlayerBoard(data.player_board);
        setAiBoard(data.ai_board);
        setShipQueue(generateShipQueue());
        setCurrentShipIndex(0);
        setOrientation('H');
        setGameStarted(false);
        setGameOver(false);
        setWinner(null);
        setHighlightCellsAI(null);
        setHighlightCellsPlayer(null);
        setLoading(false);
    };

    // --------------- AI play / attack (reuse your playAiTurn / handleAttack) ---------------
    const playAiTurn = async (
        attacks: [number, number, 'hit' | 'miss'][],
        finalPlayerBoard: string[][]
    ) => {
        setAiPlaying(true);
        let tempBoard = playerBoard.map(row => [...row]);

        for (let i = 0; i < attacks.length; i++) {
            const [r, c, res] = attacks[i];
            const prevTemp = tempBoard.map(row => [...row]);
            tempBoard[r][c] = finalPlayerBoard[r][c];

            const allChanges = diffBoardChanges(prevTemp, finalPlayerBoard).filter(ch => ch.to === 'X' || ch.to === 'O');

            const futureCoords = new Set<string>();
            for (let j = i + 1; j < attacks.length; j++) {
                const [fr, fc] = attacks[j];
                futureCoords.add(`${fr},${fc}`);
            }

            const toAnimate = allChanges.filter(ch => !futureCoords.has(`${ch.row},${ch.col}`));

            for (const ch of toAnimate) tempBoard[ch.row][ch.col] = finalPlayerBoard[ch.row][ch.col];

            const highlights: Highlight[] = toAnimate.map(ch => ({
                row: ch.row,
                col: ch.col,
                result: finalPlayerBoard[ch.row][ch.col] === 'X' ? 'hit' : 'miss'
            }));

            if (highlights.length === 0) highlights.push({ row: r, col: c, result: res });

            setPlayerBoard(tempBoard.map(row => [...row]));
            setHighlightCellsPlayer(highlights);
            await sleep(700);
            setHighlightCellsPlayer(null);
            await sleep(150);
        }

        setAiPlaying(false);
    };

    const handleAttack = async (row: number, col: number) => {
        if (!gameStarted || aiPlaying || loading || gameOver) return;
        setLoading(true);

        const prevAiBoard = aiBoard.map(r => [...r]);
        const data = await attackCell(row, col);

        // first animate player-side changes (highlights) before applying final ai board
        const changes = diffBoardChanges(prevAiBoard, data.ai_board).filter(ch => ch.to === 'X' || ch.to === 'O');
        if (changes.length > 0) {
            const highlights: Highlight[] = changes.map(ch => ({ row: ch.row, col: ch.col, result: ch.to === 'X' ? 'hit' : 'miss' }));
            setHighlightCellsAI(highlights);
            await sleep(450); // shorter so it feels snappier with new animations
            setHighlightCellsAI(null);
        }

        // apply ai board update after the short highlight
        setAiBoard(data.ai_board);

        // if AI attacks, play them (they will animate)
        if (data.ai_attacks && data.ai_attacks.length > 0) {
            await playAiTurn(data.ai_attacks, data.player_board);
        }

        // update final player board
        setPlayerBoard(data.player_board);

        // handle game over state (type-safe)
        if (data.game_over) {
            setGameOver(true);
            setWinner((data.winner ?? null) as 'player' | 'ai' | null);
        }

        setLoading(false);
    };

    // --------------- UI ---------------
    return (
        <div className="min-h-screen flex flex-col items-center bg-gradient-to-b from-blue-100 to-blue-300 p-6">
            <header className="w-full max-w-5xl flex items-center justify-between mb-6">
                <h1 className="text-4xl font-bold text-gray-800">Battleships</h1>

                <div className="flex items-center gap-3">
                    {/* Show restart anytime */}
                    <button
                        className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition"
                        onClick={restartGameHandler}
                        disabled={loading}
                        title="Restart game (server-side)"
                    >
                        Restart Game
                    </button>

                    {/* status badge */}
                    <div className="px-3 py-1 rounded bg-white/60 text-sm text-gray-800">
                        {gameOver ? (winner === 'player' ? '🎉 You won' : '💀 You lost') : gameStarted ? 'Game in progress' : 'Placement phase'}
                    </div>
                </div>
            </header>

            {/* GameOver modal (fancier) */}
            {gameOver && winner && (
                <GameOverModal
                    winner={winner}
                    onRestart={restartGameHandler}
                    onClose={() => {
                        // keep modal dismissible but game remains ended
                        setGameOver(false);
                    }}
                />
            )}

            {!gameStarted && !gameOver && (
                <div className="mb-4 text-center">
                    {placingShip ? (
                        <p className="text-gray-700">
                            Place your ships! Current length: {placingShip.length}, orientation: {orientation}
                        </p>
                    ) : (
                        <p className="text-gray-700 mb-2">All ships placed! Confirm to start the game.</p>
                    )}
                    <div className="flex justify-center gap-2">
                        {placingShip && (
                            <button
                                className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition"
                                onClick={() => setOrientation(prev => (prev === 'H' ? 'V' : 'H'))}
                            >
                                Rotate Ship
                            </button>
                        )}
                        <button
                            className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 transition"
                            onClick={resetPlacementHandler}
                        >
                            Reset Placement
                        </button>
                        {!placingShip && (
                            <button
                                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
                                onClick={confirmPlacementHandler}
                            >
                                Confirm Placement
                            </button>
                        )}
                    </div>
                </div>
            )}

            <div className="flex flex-col md:flex-row gap-10 w-full max-w-5xl">
                {/* Left: always player board */}
                <div className="text-center w-full md:w-1/2">
                    <h2 className="text-2xl font-semibold mb-2">
                        {gameStarted ? 'Your Board' : 'Place Your Ships'}
                    </h2>
                    <Board
                        board={playerBoard}
                        onCellClick={gameStarted ? () => {
                        } : handlePlayerPlace}
                        disabled={loading || aiPlaying || gameOver}
                        showShips={true}
                        highlightCells={highlightCellsPlayer}
                    />
                </div>

                {/* Right: AI board only after game starts */}
                <div className="text-center w-full md:w-1/2">
                    <h2 className="text-2xl font-semibold mb-2">
                        {gameStarted ? 'AI Board' : 'Waiting for game to start'}
                    </h2>
                    <Board
                        board={gameStarted ? aiBoard : Array(10).fill(null).map(() => Array(10).fill('~'))}
                        onCellClick={gameStarted ? handleAttack : () => {
                        }}
                        disabled={!gameStarted || loading || aiPlaying || gameOver}
                        showShips={false}
                        highlightCells={highlightCellsAI}
                    />
                </div>
            </div>
            {notification && (
                <div className="fixed top-6 left-1/2 transform -translate-x-1/2 z-50">
                    <div className="bg-red-500 text-white px-4 py-2 rounded shadow-lg animate-bounce">
                        {notification}
                    </div>
                </div>
            )}

        </div>
    );
};

export default App;

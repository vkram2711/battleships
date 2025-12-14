import React, { useState } from 'react';
import Board from './components/Board';
import {
    attackCell,
    placeShip,
    resetPlacement as apiResetPlacement,
    confirmPlacement as apiConfirmPlacement,
    restartGame as apiRestartGame
} from './api';

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
    const queue: ShipQueueItem[] = [];
    shipDefs.forEach(def => {
        for (let i = 0; i < def.count; i++) queue.push({ length: def.length, orientation: 'H' });
    });
    return queue;
};

const sleep = (ms: number) => new Promise(res => setTimeout(res, ms));

type Highlight = { row: number; col: number; result: 'hit' | 'miss' };

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
    const [winner, setWinner] = useState<string | null>(null);

    // ---------------- Player ship placement ----------------
    const handlePlayerPlace = async (row: number, col: number) => {
        if (!placingShip || gameStarted || gameOver) return;
        setLoading(true);
        const data = await placeShip(row, col, placingShip.length, orientation);
        if (data.success) {
            setPlayerBoard(data.player_board);
            setCurrentShipIndex(prev => prev + 1);
        } else {
            alert('Invalid placement! Ships cannot overlap or touch.');
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
        setLoading(false);
    };

    const confirmPlacementHandler = async () => {
        if (placingShip) return alert('Place all ships before confirming!');
        setLoading(true);
        const data = await apiConfirmPlacement();
        setPlayerBoard(data.player_board);
        setAiBoard(data.ai_board);
        setGameStarted(true);
        setLoading(false);
    };

    // ---------------- Restart Game ----------------
    const restartGameHandler = async () => {
        setLoading(true);
        const data = await apiRestartGame();
        setPlayerBoard(data.player_board);
        setAiBoard(data.ai_board);
        setGameStarted(false);
        setShipQueue(generateShipQueue());
        setCurrentShipIndex(0);
        setOrientation('H');
        setGameOver(false);
        setWinner(null);
        setLoading(false);
    };

    // ---------------- Attack handlers ----------------
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
            await sleep(500);
            setHighlightCellsPlayer(null);
            await sleep(100);
        }

        setAiPlaying(false);
    };

    const handleAttack = async (row: number, col: number) => {
        if (!gameStarted || aiPlaying || loading || gameOver) return;
        setLoading(true);

        const prevAiBoard = aiBoard.map(r => [...r]);
        const data = await attackCell(row, col);

        // Compute only the cells that changed in this attack (primary + revealed)
        const changes = diffBoardChanges(prevAiBoard, data.ai_board)
            .filter(ch => ch.to === 'X' || ch.to === 'O');

        // Animate highlights first
        if (changes.length > 0) {
            const highlights: Highlight[] = changes.map(ch => ({
                row: ch.row,
                col: ch.col,
                result: ch.to === 'X' ? 'hit' : 'miss'
            }));
            setHighlightCellsAI(highlights);
            await sleep(500); // animation duration
            setHighlightCellsAI(null);
        }

        // Apply AI board updates AFTER animation
        setAiBoard(data.ai_board);

        // If AI attacks, play them
        if (data.ai_attacks && data.ai_attacks.length > 0) {
            await playAiTurn(data.ai_attacks, data.player_board);
        }

        setPlayerBoard(data.player_board);

        // Check for game over
        if (data.game_over) {
            setGameOver(true);
            setWinner(data.winner ?? null);
        }

        setLoading(false);
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-start bg-gradient-to-b from-blue-100 to-blue-300 p-6">
            <h1 className="text-4xl font-bold text-gray-800 mb-4">Battleships</h1>

            {/* Game over modal */}
            {gameOver && (
                <div className="fixed top-0 left-0 w-full h-full bg-black/50 flex flex-col items-center justify-center z-50">
                    <div className="bg-white p-8 rounded-lg shadow-lg text-center">
                        <h2 className="text-3xl font-bold mb-4">{winner === 'player' ? 'You Win!' : 'You Lose!'}</h2>
                        <button
                            className="px-6 py-3 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
                            onClick={restartGameHandler}
                        >
                            Restart Game
                        </button>
                    </div>
                </div>
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

            <div className="flex flex-col md:flex-row gap-10">
                {/* Left: AI board while playing, player board while placing */}
                <div className="text-center">
                    <h2 className="text-2xl font-semibold mb-2">{gameStarted ? 'AI Board' : 'Your Board (Place Ships)'}</h2>
                    <Board
                        board={gameStarted ? aiBoard : playerBoard}
                        onCellClick={gameStarted ? handleAttack : handlePlayerPlace}
                        disabled={loading || aiPlaying || gameOver}
                        showShips={!gameStarted}
                        highlightCells={gameStarted ? highlightCellsAI : highlightCellsPlayer}
                    />
                </div>

                {/* Right: show player board after game starts */}
                {gameStarted && (
                    <div className="text-center">
                        <h2 className="text-2xl font-semibold mb-2">Your Board</h2>
                        <Board
                            board={playerBoard}
                            onCellClick={() => {}}
                            disabled={true}
                            showShips={true}
                            highlightCells={highlightCellsPlayer}
                        />
                    </div>
                )}
            </div>
        </div>
    );
};

export default App;

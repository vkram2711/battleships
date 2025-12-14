import React, { useState } from 'react';
import Board from './components/Board';
import { attackCell, placeShip, resetPlacement as apiResetPlacement, confirmPlacement as apiConfirmPlacement } from './api';

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
        for (let i = 0; i < def.count; i++) {
            queue.push({ length: def.length, orientation: 'H' });
        }
    });
    return queue;
};

const sleep = (ms: number) => new Promise(res => setTimeout(res, ms));

const App: React.FC = () => {
    const [playerBoard, setPlayerBoard] = useState<string[][]>(
        Array(10).fill(null).map(() => Array(10).fill('~'))
    );
    const [aiBoard, setAiBoard] = useState<string[][]>(
        Array(10).fill(null).map(() => Array(10).fill('~'))
    );
    const [loading, setLoading] = useState(false);

    const [shipQueue, setShipQueue] = useState<ShipQueueItem[]>(generateShipQueue());
    const [currentShipIndex, setCurrentShipIndex] = useState(0);
    const placingShip = shipQueue[currentShipIndex] || null;
    const [orientation, setOrientation] = useState<'H' | 'V'>('H');

    const [gameStarted, setGameStarted] = useState(false);
    const [aiPlaying, setAiPlaying] = useState(false);

    const [highlightCellPlayer, setHighlightCellPlayer] = useState<{ row: number; col: number; result: 'hit' | 'miss' } | null>(null);
    const [highlightCellAI, setHighlightCellAI] = useState<{ row: number; col: number; result: 'hit' | 'miss' } | null>(null);

    const handlePlayerPlace = async (row: number, col: number) => {
        if (!placingShip || gameStarted) return;
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

    const playAiTurn = async (attacks: [number, number, 'hit' | 'miss'][], finalPlayerBoard: string[][]) => {
        setAiPlaying(true);
        let tempBoard = playerBoard.map(row => [...row]);

        for (const [row, col, result] of attacks) {
            if (result === 'hit' || result === 'miss') {
                setHighlightCellPlayer({ row, col, result });
            }
            tempBoard[row][col] = finalPlayerBoard[row][col];
            setPlayerBoard([...tempBoard]);
            await sleep(700);
            setHighlightCellPlayer(null);
            await sleep(150);
        }

        setAiPlaying(false);
    };

    const handleAttack = async (row: number, col: number) => {
        if (!gameStarted || aiPlaying || loading) return;
        setLoading(true);

        const data = await attackCell(row, col);

        // Highlight player attack
        if (data.player_result === 'hit' || data.player_result === 'miss') {
            setHighlightCellAI({ row, col, result: data.player_result });
        }
        setAiBoard(data.ai_board);
        await sleep(500);
        setHighlightCellAI(null);

        // AI turn
        if (data.ai_attacks.length > 0) {
            await playAiTurn(data.ai_attacks, data.player_board);
        }

        setLoading(false);
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-start bg-gradient-to-b from-blue-100 to-blue-300 p-6">
            <h1 className="text-4xl font-bold text-gray-800 mb-4">Battleships</h1>

            {!gameStarted && (
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
                {/* AI board */}
                <div className="text-center">
                    <h2 className="text-2xl font-semibold mb-2">{gameStarted ? 'AI Board' : 'Your Board (Place Ships)'}</h2>
                    <Board
                        board={gameStarted ? aiBoard : playerBoard}
                        onCellClick={gameStarted ? handleAttack : handlePlayerPlace}
                        disabled={loading || aiPlaying}
                        showShips={!gameStarted}
                        highlightCell={highlightCellAI}
                    />
                </div>

                {/* Player board */}
                {gameStarted && (
                    <div className="text-center">
                        <h2 className="text-2xl font-semibold mb-2">Your Board</h2>
                        <Board
                            board={playerBoard}
                            onCellClick={() => {}}
                            disabled={true}
                            showShips={true}
                            highlightCell={highlightCellPlayer}
                        />
                    </div>
                )}
            </div>
        </div>
    );
};

export default App;

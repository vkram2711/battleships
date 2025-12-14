import React from 'react';
import Cell from './Cell';

export type Highlight = { row: number; col: number; result: 'hit' | 'miss' } | null;

interface BoardProps {
    board: string[][];
    onCellClick: (row: number, col: number) => void;
    disabled?: boolean;
    showShips?: boolean;
    highlightCells?: { row: number; col: number; result: 'hit' | 'miss' }[] | null;
}

const Board: React.FC<BoardProps> = ({
                                         board,
                                         onCellClick,
                                         disabled = false,
                                         showShips = false,
                                         highlightCells = null,
                                     }) => {
    return (
        <div className="inline-block bg-blue-800 p-2 rounded-lg shadow-lg">
            {board.map((row, rowIdx) => (
                <div key={rowIdx} className="flex">
                    {row.map((cell, colIdx) => {
                        // find highlight for this cell (if any)
                        const h = highlightCells ? highlightCells.find(x => x.row === rowIdx && x.col === colIdx) : null;
                        return (
                            <Cell
                                key={colIdx}
                                row={rowIdx}
                                col={colIdx}
                                value={cell}
                                onClick={onCellClick}
                                disabled={disabled}
                                showShips={showShips}
                                highlight={h ? { result: h.result } : null}
                            />
                        );
                    })}
                </div>
            ))}
        </div>
    );
};

export default Board;

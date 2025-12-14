import React from 'react';
import Cell from './Cell';

interface HighlightCell {
    row: number;
    col: number;
    result: 'hit' | 'miss';
}

interface BoardProps {
    board: string[][];
    onCellClick: (row: number, col: number) => void;
    disabled?: boolean;
    showShips?: boolean;
    highlightCell?: HighlightCell | null;
}

const Board: React.FC<BoardProps> = ({
                                         board,
                                         onCellClick,
                                         disabled = false,
                                         showShips = false,
                                         highlightCell = null,
                                     }) => {
    return (
        <div className="inline-block bg-blue-800 p-2 rounded-lg shadow-lg">
            {board.map((row, rowIdx) => (
                <div key={rowIdx} className="flex">
                    {row.map((cell, colIdx) => (
                        <Cell
                            key={colIdx}
                            row={rowIdx}
                            col={colIdx}
                            value={cell}
                            onClick={onCellClick}
                            disabled={disabled}
                            showShips={showShips}
                            highlight={
                                highlightCell &&
                                highlightCell.row === rowIdx &&
                                highlightCell.col === colIdx
                                    ? { result: highlightCell.result }
                                    : null
                            }
                        />
                    ))}
                </div>
            ))}
        </div>
    );
};

export default Board;

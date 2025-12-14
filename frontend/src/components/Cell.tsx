import React from 'react';

interface CellProps {
    row: number;
    col: number;
    value: string;
    onClick: (row: number, col: number) => void;
    disabled?: boolean;
    showShips?: boolean;
    highlight?: { result: 'hit' | 'miss' } | null;
}

const Cell: React.FC<CellProps> = ({
                                       row,
                                       col,
                                       value,
                                       onClick,
                                       disabled = false,
                                       showShips = false,
                                       highlight = null,
                                   }) => {
    const isHighlighted = !!highlight;
    const highlightClass = isHighlighted
        ? highlight!.result === 'hit'
            ? 'ring-4 ring-red-500 animate-pulse'
            : 'ring-4 ring-blue-400 animate-pulse'
        : '';

    const cellColor = (() => {
        if (value === 'X') return 'bg-red-500';
        if (value === 'O') return 'bg-blue-300';
        if (value === 'S' && showShips) return 'bg-gray-600';
        return 'bg-blue-100 hover:bg-blue-200';
    })();

    return (
        <div
            onClick={() => !disabled && onClick(row, col)}
            className={`
        w-10 h-10 flex items-center justify-center
        border border-blue-500 cursor-pointer
        ${cellColor} ${highlightClass}
        transition-transform duration-200
      `}
        >
            {value === 'X' && '💥'}
            {value === 'O' && '•'}
        </div>
    );
};

export default Cell;

import React from 'react';

interface CellProps {
    row: number;
    col: number;
    value: string;
    onClick: (row:number,col:number)=>void;
    disabled?: boolean;
    showShip?: boolean; // NEW
}

const Cell: React.FC<CellProps> = ({row,col,value,onClick,disabled,showShip=false}) => {
    const getColor = () => {
        if(value==='X') return 'bg-red-500';
        if(value==='O') return 'bg-blue-400';
        if(value==='S' && showShip) return 'bg-gray-700'; // display ship during placement
        return 'bg-gray-300'; // empty cell
    }

    return (
        <button
            onClick={()=>onClick(row,col)}
            className={`${getColor()} w-10 h-10 m-0.5 border border-black rounded-sm 
      hover:scale-105 transition-transform duration-150
      ${disabled || value==='X' || value==='O' ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'}`}
            disabled={disabled || value==='X' || value==='O'}
        />
    )
}

export default Cell;
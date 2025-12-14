import React from 'react';
import Cell from './Cell';

interface BoardProps {
    board: string[][];
    onCellClick: (row:number,col:number)=>void;
    disabled?: boolean;
    showShips?: boolean;
}

const Board:React.FC<BoardProps> = ({board,onCellClick,disabled,showShips=false})=>{
    return (
        <div className="inline-block p-4 bg-gray-100 rounded-lg shadow-lg">
            {board.map((row,rIdx)=>(
                <div key={rIdx} className="flex">
                    {row.map((cell,cIdx)=>(
                        <Cell
                            key={cIdx}
                            row={rIdx}
                            col={cIdx}
                            value={cell}
                            onClick={onCellClick}
                            disabled={disabled}
                            showShip={showShips}
                        />
                    ))}
                </div>
            ))}
        </div>
    )
}


export default Board;

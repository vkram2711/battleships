export interface AttackResponse {
    player_result: 'hit' | 'miss' | 'already';
    ai_attacks: [number, number, 'hit' | 'miss'][];
    player_board: string[][];
    ai_board: string[][];
}



// Attack AI board
export async function attackCell(row: number, col: number): Promise<AttackResponse> {
    const response = await fetch('http://localhost:5000/attack', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({row, col})
    });
    return response.json();
}

// Get current boards
export async function getBoard(): Promise<{player_board:string[][], ai_board:string[][]}> {
    const response = await fetch('http://localhost:5000/board');
    return response.json();
}

// Place a ship on player board
export async function placeShip(row:number, col:number, length:number, orientation:'H'|'V') {
    const response = await fetch('http://localhost:5000/place_ship', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({row, col, length, orientation})
    });
    return response.json(); // returns {success:boolean, player_board:[][]}
}

export async function resetPlacement() {
    const response = await fetch('http://localhost:5000/reset_placement', {
        method:'POST',
        headers:{'Content-Type':'application/json'}
    });
    return response.json(); // returns { player_board }
}

export async function confirmPlacement() {
    const response = await fetch('http://localhost:5000/confirm_placement', {
        method:'POST',
        headers:{'Content-Type':'application/json'}
    });
    return response.json(); // returns { player_board, ai_board }
}

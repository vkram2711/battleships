import axios from 'axios';

const API_BASE = 'http://localhost:5000'; // change if your backend runs elsewhere

interface PlaceShipResponse {
    success: boolean;
    player_board: string[][];
}

interface ConfirmPlacementResponse {
    player_board: string[][];
    ai_board: string[][];
}

interface ResetPlacementResponse {
    player_board: string[][];
}

interface AttackResponse {
    player_result: 'hit' | 'miss';
    ai_attacks: [number, number, 'hit' | 'miss'][];
    player_board: string[][];
    ai_board: string[][];
    game_over?: boolean;
    winner?: 'player' | 'ai';
}

interface RestartGameResponse {
    player_board: string[][];
    ai_board: string[][];
}

export const placeShip = async (
    row: number,
    col: number,
    length: number,
    orientation: 'H' | 'V'
): Promise<PlaceShipResponse> => {
    const { data } = await axios.post(`${API_BASE}/place_ship`, { row, col, length, orientation });
    return data;
};

export const confirmPlacement = async (): Promise<ConfirmPlacementResponse> => {
    const { data } = await axios.post(`${API_BASE}/confirm_placement`);
    return data;
};

export const resetPlacement = async (): Promise<ResetPlacementResponse> => {
    const { data } = await axios.post(`${API_BASE}/reset_placement`);
    return data;
};

export const attackCell = async (row: number, col: number): Promise<AttackResponse> => {
    const { data } = await axios.post(`${API_BASE}/attack`, { row, col });
    return data;
};

// ---------------- New Restart Game ----------------
export const restartGame = async (): Promise<RestartGameResponse> => {
    const { data } = await axios.post(`${API_BASE}/restart_game`);
    return data;
};

// Optional: get boards (if needed)
export const getBoard = async (): Promise<ConfirmPlacementResponse> => {
    const { data } = await axios.get(`${API_BASE}/board`);
    return data;
};

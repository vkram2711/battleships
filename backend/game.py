import random


class BattleshipGame:
    def __init__(self, size=10):
        self.size = size
        self.player_board = [['~'] * size for _ in range(size)]
        self.ai_board = [['~'] * size for _ in range(size)]
        self.ai_ships = []
        self.player_ships = []
        self.ship_defs = [(4, 1), (3, 2), (2, 3), (1, 4)]  # length, count

        # turn / game end state
        self.current_turn = "player"
        self.game_over = False
        self.winner = None  # "player" or "ai" or None
        self.started = False

    def reset_player_board(self):
        """Clears the player board and ships for new placement"""
        self.player_board = [['~'] * self.size for _ in range(self.size)]
        self.player_ships = []
        # Do NOT reset AI ships here (this is only for placement reset)

    def reset_full_game(self):
        """Full restart of the entire game state (both sides)."""
        self.player_board = [['~'] * self.size for _ in range(self.size)]
        self.ai_board = [['~'] * self.size for _ in range(self.size)]
        self.player_ships = []
        self.ai_ships = []
        self.current_turn = "player"
        self.game_over = False
        self.winner = None

    # ----------- Ship placement -----------
    def place_ai_ships(self):
        # clear existing AI ships first
        self.ai_ships = []
        self.ai_board = [['~'] * self.size for _ in range(self.size)]
        for length, count in self.ship_defs:
            for _ in range(count):
                while True:
                    row, col = random.randint(0, self.size - 1), random.randint(0, self.size - 1)
                    orientation = random.choice(['H', 'V'])
                    if self.can_place_ship(self.ai_board, row, col, length, orientation):
                        self.add_ship(self.ai_board, row, col, length, orientation)
                        self.ai_ships.append((row, col, length, orientation))
                        break

    def player_place_ship(self, row, col, length, orientation):
        if self.can_place_ship(self.player_board, row, col, length, orientation):
            self.add_ship(self.player_board, row, col, length, orientation)
            self.player_ships.append((row, col, length, orientation))
            return True
        return False

    def can_place_ship(self, board, row, col, length, orientation):
        if orientation == 'H' and col + length > self.size:
            return False
        if orientation == 'V' and row + length > self.size:
            return False

        for i in range(length):
            r = row + i if orientation == 'V' else row
            c = col + i if orientation == 'H' else col
            if not self.is_cell_free(board, r, c):
                return False
        return True

    def is_cell_free(self, board, row, col):
        for dr in [-1, 0, 1]:
            for dc in [-1, 0, 1]:
                r, c = row + dr, col + dc
                if 0 <= r < self.size and 0 <= c < self.size:
                    if board[r][c] == 'S':
                        return False
        return True

    def add_ship(self, board, row, col, length, orientation):
        for i in range(length):
            r = row + i if orientation == 'V' else row
            c = col + i if orientation == 'H' else col
            board[r][c] = 'S'

    # ----------- Helpers for game over detection -----------
    def is_ship_sunk(self, board, ship):
        row, col, length, orientation = ship
        for i in range(length):
            r = row + i if orientation == 'V' else row
            c = col + i if orientation == 'H' else col
            if board[r][c] == 'S':  # still part of ship remaining
                return False
        return True

    def all_ships_sunk(self, ship_list, board):
        """Return True if every ship in ship_list is sunk on the given board."""
        if not ship_list:
            return True
        for ship in ship_list:
            if not self.is_ship_sunk(board, ship):
                return False
        return True

    def mark_adjacent_after_sunk(self, board, ship):
        """After a ship is sunk, mark all surrounding cells as misses ('O')"""
        row, col, length, orientation = ship
        for i in range(length):
            r = row + i if orientation == 'V' else row
            c = col + i if orientation == 'H' else col
            # check all surrounding cells
            for dr in [-1, 0, 1]:
                for dc in [-1, 0, 1]:
                    nr, nc = r + dr, c + dc
                    if 0 <= nr < self.size and 0 <= nc < self.size:
                        if board[nr][nc] == '~':  # only mark empty cells
                            board[nr][nc] = 'O'

    # ----------- Core attack logic -----------
    def attack(self, board, row, col):
        """Attack a cell on the given board. Returns 'hit'|'miss'|'already'."""
        if board[row][col] == 'S':
            board[row][col] = 'X'
            # check if ship is sunk: apply adjacency marking
            ship_list = self.ai_ships if board == self.ai_board else self.player_ships
            for ship in ship_list:
                if self.is_ship_sunk(board, ship):
                    self.mark_adjacent_after_sunk(board, ship)
            return 'hit'
        elif board[row][col] == '~':
            board[row][col] = 'O'
            return 'miss'
        else:
            return 'already'

    # ----------- Player / AI turn wrappers (handle turns & game over) -----------
    def player_attack(self, row, col):
        """Player attacks AI board. Returns result string or None if not player's turn."""
        if self.game_over:
            return None
        if self.current_turn != "player":
            return None

        result = self.attack(self.ai_board, row, col)

        # Check if AI lost all ships
        if self.all_ships_sunk(self.ai_ships, self.ai_board):
            self.game_over = True
            self.winner = "player"
            # When game_over, no need to change current_turn
            return result

        if result == 'miss':
            self.current_turn = "ai"  # switch turn
        # if hit → player keeps turn

        return result

    def ai_take_turn(self):
        """AI attacks repeatedly until miss; returns list of (r,c,result). Sets game_over/winner when applicable."""
        attacks = []

        if self.game_over:
            return attacks

        while self.current_turn == "ai":
            row, col = random.randint(0, self.size - 1), random.randint(0, self.size - 1)
            result = self.attack(self.player_board, row, col)

            if result == 'already':
                continue

            attacks.append((row, col, result))

            # Check if player lost all ships
            if self.all_ships_sunk(self.player_ships, self.player_board):
                self.game_over = True
                self.winner = "ai"
                # stop attacking further
                break

            if result == 'miss':
                self.current_turn = "player"  # switch turn
            # else hit -> continue attacking

        return attacks

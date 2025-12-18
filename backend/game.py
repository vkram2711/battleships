import random

from ai import PrologAI, SimpleAI


class BattleshipGame:
    def __init__(self, size=10):
        self.size = size
        self.player_board = [['~'] * size for _ in range(size)]
        self.ai_board = [['~'] * size for _ in range(size)]
        self.ai_ships = []
        self.player_ships = []
        self.ship_defs = [(4, 1), (3, 2), (2, 3), (1, 4)]  # length, count
        self.ai_logic = PrologAI(size)

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
        self.ai_logic.reset()

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
        attacks = []

        if self.game_over:
            return attacks

        MAX_TRIES = 200  # safety cap (higher but kept bounded)
        tries = 0

        while self.current_turn == "ai":
            tries += 1
            if tries > MAX_TRIES:
                print("AI SAFETY BREAK: too many retries")
                self.current_turn = "player"
                break

            # Ask AI for a move
            row, col = self.ai_logic.next_move()
            # Defensive: if AI returned None (no legal moves) break
            if row is None:
                self.current_turn = "player"
                break

            # Snapshot board and sunk state BEFORE applying the attack
            prev_board = [list(r) for r in self.player_board]  # shallow copy of rows
            prev_sunk_indices = set(i for i, ship in enumerate(self.player_ships) if self.is_ship_sunk(prev_board, ship))

            # Apply attack
            result = self.attack(self.player_board, row, col)

            if result == 'already':
                # ask AI again — but keep safety limit
                continue

            # After applying attack, determine which ships (if any) are newly sunk
            newly_sunk_cells = []
            curr_sunk_indices = set(i for i, ship in enumerate(self.player_ships) if self.is_ship_sunk(self.player_board, ship))
            newly_sunk_indices = curr_sunk_indices - prev_sunk_indices
            for idx in newly_sunk_indices:
                ship = self.player_ships[idx]
                srow, scol, slen, sorient = ship
                for i in range(slen):
                    r = srow + i if sorient == 'V' else srow
                    c = scol + i if sorient == 'H' else scol
                    newly_sunk_cells.append((r, c))

            # Also compute any newly auto-marked misses ('O') that appeared after sinking (prev '~' -> current 'O')
            newly_misses = []
            for r in range(self.size):
                for c in range(self.size):
                    if prev_board[r][c] == '~' and self.player_board[r][c] == 'O':
                        newly_misses.append((r, c))

            # Inform AI about the result and the newly discovered info
            # Note: we pass zero-based coords (as the AI expects)
            self.ai_logic.record_result(row, col, result, newly_sunk=newly_sunk_cells, newly_misses=newly_misses)

            attacks.append((row, col, result))

            # Check game over
            if self.all_ships_sunk(self.player_ships, self.player_board):
                self.game_over = True
                self.winner = "ai"
                break

            # Switch turn on miss
            if result == 'miss':
                self.current_turn = "player"

        return attacks



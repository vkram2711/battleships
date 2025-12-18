import random
import subprocess

# Full ship list
SHIPS = [4, 3, 3, 2, 2, 2, 1, 1, 1, 1]


class AI:
    """Base AI class for Battleship."""

    def __init__(self, board_size):
        self.board_size = board_size
        self.hits = []      # active hits (not yet sunk)
        self.misses = []    # missed attacks


    def record_result(self, row, col, result, newly_sunk=None, newly_misses=None):
        """Record attack result and optionally newly sunk ship cells and newly auto-marked misses."""
        if result == 'hit':
            if (row, col) not in self.hits:
                self.hits.append((row, col))
        elif result == 'miss':
            if (row, col) not in self.misses:
                self.misses.append((row, col))

        # newly_misses: list of (r,c) cells that the backend marked as 'O' due to sinking
        if newly_misses:
            for (mr, mc) in newly_misses:
                if (mr, mc) not in self.misses:
                    self.misses.append((mr, mc))
                # if it was in hits for some reason, remove it
                if (mr, mc) in self.hits:
                    self.hits.remove((mr, mc))

        # newly_sunk: list of (r,c) cells that belong to sunk ships
        if newly_sunk:
            # PrologAI overrides to also put them into sunk_cells set.
            # For generic AI we just remove them from hits
            for (sr, sc) in newly_sunk:
                if (sr, sc) in self.hits:
                    self.hits.remove((sr, sc))

    def next_move(self):
        raise NotImplementedError

    def reset(self):
        self.hits = []
        self.misses = []


class SimpleAI(AI):
    """Random AI."""

    def __init__(self, board_size):
        super().__init__(board_size)
        self.possible_moves = [(r, c) for r in range(board_size) for c in range(board_size)]

    def next_move(self):
        move = random.choice(self.possible_moves)
        self.possible_moves.remove(move)
        return move

    def reset(self):
        super().reset()
        self.possible_moves = [(r, c) for r in range(self.board_size) for c in range(self.board_size)]


class PrologAI(AI):
    def __init__(self, board_size, prolog_file="ai.pl"):
        super().__init__(board_size)
        self.prolog_file = prolog_file
        self.sunk_cells = set()

    def next_move(self):
        def coords_to_text(lst):
            if not lst:
                return '[]'
            return '[' + ','.join(f'{r+1}-{c+1}' for (r, c) in lst) + ']'

        # Build attacked list: hits + misses + sunk_cells (all converted to 1-based)
        attacked = set(self.hits) | set(self.misses) | set(self.sunk_cells)
        attacked_list = list(attacked)

        hits_txt = coords_to_text(self.hits)
        misses_txt = coords_to_text(self.misses)
        attacked_txt = coords_to_text(attacked_list)

        query = (
            f"candidate_moves({self.board_size},"
            f"{hits_txt},{misses_txt},{attacked_txt},Moves),"
            f"writeln(Moves), halt."
        )

        try:
            cmd = ['swipl', '-q', '-s', self.prolog_file, '-g', query]
            out = subprocess.check_output(cmd, universal_newlines=True, timeout=1).strip()
        except (subprocess.TimeoutExpired, subprocess.CalledProcessError):
            # fallback: pick any unattacked cell
            return self._random_unattacked()

        # Parse Prolog output robustly: possible formats like "[]", "[1-2,3-4]" or with spaces
        out_str = out.strip()
        # handle the '[]' case
        if out_str == '[]' or out_str == '':
            candidates = []
        else:
            # remove surrounding [ ]
            out_inner = out_str.strip()
            if out_inner.startswith('[') and out_inner.endswith(']'):
                out_inner = out_inner[1:-1].strip()
            # split on commas but allow spaces
            parts = [p.strip() for p in out_inner.split(',') if p.strip()]
            candidates = []
            for part in parts:
                # each part is like 'R-C'
                if '-' not in part:
                    continue
                r_str, c_str = part.split('-', 1)
                try:
                    r = int(r_str)
                    c = int(c_str)
                    candidates.append((r - 1, c - 1))  # convert to 0-based
                except ValueError:
                    continue

        # Final safety: remove any that are already attacked
        attacked0 = set(self.hits) | set(self.misses) | set(self.sunk_cells)
        legal = [p for p in candidates if p not in attacked0]

        # If Prolog returned nothing (rare), fallback to any unattacked
        if not legal:
            legal = self._all_unattacked()

        if not legal:
            # truly no legal moves, give up (shouldn't happen)
            return None

        return random.choice(legal)

    def _all_unattacked(self):
        attacked0 = set(self.hits) | set(self.misses) | set(self.sunk_cells)
        cells = []
        for r in range(self.board_size):
            for c in range(self.board_size):
                if (r, c) not in attacked0:
                    cells.append((r, c))
        return cells

    def _random_unattacked(self):
        cells = self._all_unattacked()
        return random.choice(cells) if cells else None


    def record_result(self, row, col, result, newly_sunk=None, newly_misses=None):
        # call base to update hits/misses
        super().record_result(row, col, result, newly_sunk=newly_sunk, newly_misses=newly_misses)

        # handle sunk cells specifically
        if newly_sunk:
            for (sr, sc) in newly_sunk:
                self.sunk_cells.add((sr, sc))
                # ensure sunk cells are not in active hits
                if (sr, sc) in self.hits:
                    self.hits.remove((sr, sc))

    def reset(self):
        super().reset()
        self.sunk_cells = set()

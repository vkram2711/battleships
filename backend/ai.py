import subprocess
import random
from collections import deque
from copy import deepcopy


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



class HeatmapAI(AI):
    def __init__(self, board_size):
        super().__init__(board_size)
        self.sunk_cells = set()
        self.remaining_ships = deepcopy(SHIPS)

    def reset(self):
        super().reset()
        self.sunk_cells = set()
        self.remaining_ships = deepcopy(SHIPS)

    def record_result(self, row, col, result, newly_sunk=None, newly_misses=None):
        # update hits/misses/sunk_cells and remaining_ships
        super().record_result(row, col, result, newly_sunk=newly_sunk, newly_misses=newly_misses)

        if newly_misses:
            for (mr, mc) in newly_misses:
                # already added to misses by base
                if (mr, mc) in self.hits:
                    self.hits.remove((mr, mc))
        if newly_sunk:
            # add sunk cells and remove ship length from remaining_ships
            for (sr, sc) in newly_sunk:
                self.sunk_cells.add((sr, sc))
                if (sr, sc) in self.hits:
                    self.hits.remove((sr, sc))
            # deduce ship length (they provide full ship cells)
            ship_len = len(newly_sunk)
            # remove one occurrence of ship_len from remaining_ships if present
            if ship_len in self.remaining_ships:
                self.remaining_ships.remove(ship_len)

    def next_move(self):
        attacked = set(self.hits) | set(self.misses) | set(self.sunk_cells)

        # Target mode if there are active hits
        if self.hits:
            candidates = self._target_mode(attacked)
            if candidates:
                return self._choose_best(candidates, attacked)
            # else fallthrough to hunt mode
        # Hunt mode
        candidates = self._hunt_mode(attacked)
        if not candidates:
            # fallback: any unattacked cell
            candidates = [(r, c) for r in range(self.board_size) for c in range(self.board_size)
                          if (r, c) not in attacked]
        return self._choose_best(candidates, attacked)

    # --- helper: target mode (uses cluster + orientation inference) ---
    def _target_mode(self, attacked):
        clusters = self._find_clusters(self.hits)
        candidates = set()

        for cluster in clusters:
            if len(cluster) >= 2:
                orient = self._cluster_orientation(cluster)  # 'H' | 'V' | None
                if orient == 'H':
                    # extend left/right across cluster span
                    row = cluster[0][0]
                    cols = sorted([c for (_r, c) in cluster])
                    left = cols[0] - 1
                    right = cols[-1] + 1
                    if self._valid_cell(row, left) and (row, left) not in attacked:
                        candidates.add((row, left))
                    if self._valid_cell(row, right) and (row, right) not in attacked:
                        candidates.add((row, right))
                elif orient == 'V':
                    col = cluster[0][1]
                    rows = sorted([r for (r, _c) in cluster])
                    up = rows[0] - 1
                    down = rows[-1] + 1
                    if self._valid_cell(up, col) and (up, col) not in attacked:
                        candidates.add((up, col))
                    if self._valid_cell(down, col) and (down, col) not in attacked:
                        candidates.add((down, col))
                else:
                    # cluster not strictly aligned - propose orthogonal neighbors
                    for (r, c) in cluster:
                        for (nr, nc) in [(r-1,c),(r+1,c),(r,c-1),(r,c+1)]:
                            if self._valid_cell(nr, nc) and (nr, nc) not in attacked:
                                candidates.add((nr, nc))
            else:
                # singleton cluster: propose orthogonal neighbors
                r, c = cluster[0]
                for (nr, nc) in [(r-1,c),(r+1,c),(r,c-1),(r,c+1)]:
                    if self._valid_cell(nr, nc) and (nr, nc) not in attacked:
                        candidates.add((nr, nc))

        # If no candidate found around clusters (rare), return empty to fall back
        return list(candidates)

    # --- helper: hunt mode (probability heatmap without numpy) ---
    def _hunt_mode(self, attacked):
        size = self.board_size
        # Initialize heatmap as 2D int grid
        heatmap = [[0]*size for _ in range(size)]

        # Compute placements for each remaining ship length
        for ship_len in self.remaining_ships:
            if ship_len <= 0:
                continue
            # horizontal placements
            for r in range(size):
                for c in range(size - ship_len + 1):
                    positions = [(r, c+i) for i in range(ship_len)]
                    # skip placements that overlap attacked cells
                    if any(p in attacked for p in positions):
                        continue
                    # add 1 to all covered cells
                    for (pr, pc) in positions:
                        heatmap[pr][pc] += 1
            # vertical placements
            for c in range(size):
                for r in range(size - ship_len + 1):
                    positions = [(r+i, c) for i in range(ship_len)]
                    if any(p in attacked for p in positions):
                        continue
                    for (pr, pc) in positions:
                        heatmap[pr][pc] += 1

        # find max heat value among unattacked cells
        maxv = -1
        candidates = []
        for r in range(size):
            for c in range(size):
                if (r, c) in attacked:
                    continue
                v = heatmap[r][c]
                if v > maxv:
                    maxv = v
                    candidates = [(r,c)]
                elif v == maxv:
                    candidates.append((r,c))
        # if heatmap all zeros fallback to checkerboard selection
        if maxv <= 0:
            # choose parity that has more available cells (or random)
            parity_cells = [(r,c) for r in range(size) for c in range(size)
                            if (r+c)%2==0 and (r,c) not in attacked]
            if parity_cells:
                return parity_cells
            # else any unattacked
            return [(r,c) for r in range(size) for c in range(size) if (r,c) not in attacked]
        return candidates

    # choose best candidate: for now random among candidates; could use tie-breaking heuristics
    def _choose_best(self, candidates, attacked):
        # small ranking: prefer cells adjacent to hits (higher finishing chance)
        scored = []
        for (r,c) in candidates:
            score = 0
            # adjacency bonus
            for (dr,dc) in [(-1,0),(1,0),(0,-1),(0,1)]:
                nr, nc = r+dr, c+dc
                if (nr, nc) in self.hits:
                    score += 3
            # prefer central cells slightly
            center = (self.board_size-1)/2
            dist = abs(r-center)+abs(c-center)
            score += max(0, 2 - int(dist//4))  # small center bias
            scored.append(((r,c), score))
        if not scored:
            return random.choice(candidates)
        # find max score
        maxscore = max(s for (_p,s) in scored)
        best = [p for (p,s) in scored if s==maxscore]
        return random.choice(best)

    # --- helpers ---
    def _valid_cell(self, r, c):
        return 0 <= r < self.board_size and 0 <= c < self.board_size

    def _find_clusters(self, hits):
        """Return list of clusters (each cluster is list of (r,c)) using 4-neighbor adjacency."""
        remaining = set(hits)
        clusters = []
        while remaining:
            start = next(iter(remaining))
            q = deque([start])
            cluster = []
            remaining.remove(start)
            while q:
                cur = q.popleft()
                cluster.append(cur)
                r,c = cur
                for nr,nc in [(r-1,c),(r+1,c),(r,c-1),(r,c+1)]:
                    nb = (nr,nc)
                    if nb in remaining:
                        remaining.remove(nb)
                        q.append(nb)
            clusters.append(cluster)
        return clusters

    def _cluster_orientation(self, cluster):
        """Return 'H' if same row, 'V' if same col, else None."""
        if len(cluster) < 2:
            return None
        rows = {r for (r,c) in cluster}
        cols = {c for (r,c) in cluster}
        if len(rows) == 1:
            return 'H'
        if len(cols) == 1:
            return 'V'
        return None

import random

class SimpleAI:
    def __init__(self, board_size):
        self.board_size = board_size
        self.possible_moves = [(r, c) for r in range(board_size) for c in range(board_size)]
        self.hits = []

    def next_move(self):
        # Basic: random selection
        move = random.choice(self.possible_moves)
        self.possible_moves.remove(move)
        return move

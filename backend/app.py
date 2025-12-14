from flask import Flask, request, jsonify
from flask_cors import CORS

from game import BattleshipGame

app = Flask(__name__)
CORS(app)  # allow frontend to call API
game = BattleshipGame()
game.place_ai_ships()  # AI places ships at start


# -------- Player places ship --------
@app.route('/place_ship', methods=['POST'])
def place_ship():
    data = request.get_json()
    row = data['row']
    col = data['col']
    length = data['length']
    orientation = data['orientation']
    success = game.player_place_ship(row, col, length, orientation)
    return jsonify({
        'success': success,
        'player_board': game.player_board  # contains 'S' for ships
    })


@app.route('/confirm_placement', methods=['POST'])
def confirm_placement():
    # Reset game-over flags if any (starting a play session)
    game.game_over = False
    game.winner = None
    # Return the boards (AI board hidden)
    return jsonify({
        'player_board': game.player_board,
        'ai_board': [['~' if cell == 'S' else cell for cell in row_] for row_ in game.ai_board]
    })


@app.route('/reset_placement', methods=['POST'])
def reset_placement():
    game.reset_player_board()
    return jsonify({'player_board': game.player_board})


def hide_ai_ships(board):
    """Hide AI ships from the player unless they are hit"""
    hidden = []
    for row in board:
        hidden.append([
            '~' if cell == 'S' else cell
            for cell in row
        ])
    return hidden


# -------- Attack --------
@app.route('/attack', methods=['POST'])
def attack():
    if game.game_over:
        # If game already ended, return current state with game_over flag
        return jsonify({
            "player_result": None,
            "ai_attacks": [],
            "player_board": game.player_board,
            "ai_board": hide_ai_ships(game.ai_board),
            "game_over": True,
            "winner": game.winner
        })

    data = request.json
    row, col = data['row'], data['col']

    player_result = game.player_attack(row, col)

    # If player_result is None (invalid turn or game over) return appropriate response
    if player_result is None:
        return jsonify({
            "player_result": None,
            "ai_attacks": [],
            "player_board": game.player_board,
            "ai_board": hide_ai_ships(game.ai_board),
            "game_over": game.game_over,
            "winner": game.winner
        })

    ai_attacks = []
    if game.current_turn == "ai" and not game.game_over:
        ai_attacks = game.ai_take_turn()

    return jsonify({
        "player_result": player_result,
        "ai_attacks": ai_attacks,
        "player_board": game.player_board,
        "ai_board": hide_ai_ships(game.ai_board),
        "game_over": game.game_over,
        "winner": game.winner
    })


# -------- Restart whole game --------
@app.route('/restart_game', methods=['POST'])
def restart_game():
    # Reset everything and re-place AI ships
    game.reset_full_game()
    game.place_ai_ships()
    return jsonify({
        'player_board': game.player_board,
        'ai_board': [['~' if cell == 'S' else cell for cell in row_] for row_ in game.ai_board],
        'game_over': game.game_over,
        'winner': game.winner
    })


# -------- Get boards --------
@app.route('/board', methods=['GET'])
def board():
    return jsonify({
        'player_board': game.player_board,
        'ai_board': [['~' if cell == 'S' else cell for cell in row_] for row_ in game.ai_board],
        'game_over': game.game_over,
        'winner': game.winner
    })


if __name__ == '__main__':
    app.run(debug=True)

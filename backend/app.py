import os

from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS

from game import BattleshipGame

app = Flask(__name__, static_folder="../frontend/build")
CORS(app)
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


# confirm_placement: set started True
@app.route('/confirm_placement', methods=['POST'])
def confirm_placement():
    # mark game as started so clients know placement finished
    game.started = True
    game.game_over = False
    game.winner = None
    return jsonify({
        'player_board': game.player_board,
        'ai_board': [['~' if cell == 'S' else cell for cell in row_] for row_ in game.ai_board],
        'started': game.started
    })


# reset_placement: clear player placement and mark started False
@app.route('/reset_placement', methods=['POST'])
def reset_placement():
    game.reset_player_board()
    game.started = False
    return jsonify({'player_board': game.player_board, 'started': game.started})


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


# board endpoint: return started, player_ships list (so client can restore placement progress)
@app.route('/board', methods=['GET'])
def board():
    # serialize player_ships (list of tuples) to list-of-dicts for JSON
    player_ships_serialized = [
        {'row': s[0], 'col': s[1], 'length': s[2], 'orientation': s[3]} for s in game.player_ships
    ]
    return jsonify({
        'player_board': game.player_board,
        'ai_board': [['~' if cell == 'S' else cell for cell in row_] for row_ in game.ai_board],
        'game_over': game.game_over,
        'winner': game.winner,
        'started': game.started,
        'player_ships': player_ships_serialized
    })


# restart_game: reset started flag too
@app.route('/restart_game', methods=['POST'])
def restart_game():
    game.reset_full_game()
    game.place_ai_ships()
    game.started = False
    return jsonify({
        'player_board': game.player_board,
        'ai_board': [['~' if cell == 'S' else cell for cell in row_] for row_ in game.ai_board],
        'game_over': game.game_over,
        'winner': game.winner,
        'started': game.started,
        'player_ships': []
    })


@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def serve(path):
    if path != "" and os.path.exists(os.path.join(app.static_folder, path)):
        return send_from_directory(app.static_folder, path)
    return send_from_directory(app.static_folder, "index.html")


if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=True)

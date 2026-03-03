# 🚢 Battleships (Sea Battle)

A fully playable Battleships game with multiple AI difficulty levels, built with a **Flask** backend and **React** frontend. The AI ranges from a simple random guesser to a sophisticated probability heatmap engine that humans struggle to beat without getting lucky.

**[▶ Play the game](https://battleships-kwvy.onrender.com/)**

---

## Rules

The game is played on two 10×10 grids. Each player places the following fleet:

| Ship | Size | Quantity |
|---|---|---|
| Battleship | 4 cells | 1 |
| Cruiser | 3 cells | 2 |
| Destroyer | 2 cells | 3 |
| Torpedo Boat | 1 cell | 4 |

- Ships are placed vertically or horizontally and **cannot touch each other, including diagonally**.
- Players take turns firing at the opponent's grid. A hit is marked **X**, a miss is marked **O**.
- When a ship is sunk, all adjacent cells are automatically marked as misses.
- Turns continue until a miss occurs. The first player to sink all opponent ships wins.

---

## Game Phases

**1. Placement Phase**
Players place their ships on the grid, with the ability to rotate ships and reset placement before confirming.

**2. Battle Phase**
Players take turns firing at the opponent's grid. AI attacks are animated to enhance the experience.

---

## AI Strategies

The game is partially luck-based — it's theoretically possible to guess every ship's position in the first turn, so no algorithm is unbeatable. AI ship placement is random and does not adapt based on prior games.

### Option 1 — Random
The AI picks any previously unattacked cell at random. This mimics how a first-time player might approach the game, treating it as a pure guessing exercise. It is extremely suboptimal and takes many turns to win.

### Option 2 — Checkerboard Hunt + Cluster Target
Since most ships are longer than one cell, there is no need to probe every cell. The AI instead attacks in a **checkerboard pattern**, skipping every other cell. This maximizes the chances of hitting a multi-cell ship early and revealing larger portions of the board.

Once a hit is scored, the AI switches to **cluster targeting** — attacking adjacent cells to locate the rest of the ship. After a second hit, the ship's orientation is known, giving at least a 50% chance of sinking it by the end of the turn.

This strategy is implemented using **Prolog** for logical inference and **Python** for game state management. Prolog encodes the hunt/cluster rules and returns a list of candidate targets; Python then picks randomly among them to avoid a fully predictable, exploitable attack pattern.

### Option 3 — Probability Heatmap *(hardest)*
The checkerboard approach ignores how many ships remain, which types they are, and how the board has evolved. The heatmap AI addresses this by computing, for every cell, the number of valid positions any remaining ship could occupy that includes that cell. Each possibility adds +1 to the cell's score, producing a live probability map that is recalculated after every move.

The AI always attacks the highest-probability cell. Because the heatmap adapts to every new piece of information, this is an **informed search over all possible ship configurations**. Humans cannot realistically replicate these calculations on the fly, making this AI very difficult to beat without luck.

---

## Tech Stack

- **Backend:** Python / Flask
- **Frontend:** React
- **Logic layer:** Prolog (tactical inference for Option 2)
- **Deployment:** Docker / Heroku

---

## Running Locally

The project uses Docker for easy setup:

```bash
git clone https://github.com/vkram2711/battleships
cd battleships
docker compose up
```

Then open `http://localhost:3000` in your browser.

---

## Project Structure

```
battleships/
├── backend/        # Flask app, game logic, AI strategies
│   ├── ai/         # random.py, checkerboard.py, heatmap.py
│   └── prolog/     # Prolog rules for hunt/cluster logic
├── frontend/       # React app
└── docker-compose.yml
```

---

## AI Design Notes

Battleships is a **partially observable, turn-based, stochastic game** with strict spatial constraints. The three AI strategies correspond to three levels of search sophistication:

- **Random** → uninformed search
- **Checkerboard + Cluster** → heuristic-guided search with logical inference
- **Heatmap** → probabilistic informed search over all legal ship configurations

One known limitation: optimal ship *placement* should counter tactics observed in prior games (e.g. hiding large ships in corners to minimize exposure). This adaptive placement is not currently implemented.

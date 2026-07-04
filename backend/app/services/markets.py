"""Model bookmaker: derive betting markets from a prediction's score matrix.

Pure functions over a predictions row (json.loads(score_matrix_json) -> 11x11
grid of P(home=i, away=j)). Every market returns BOTH the fair price (1/p) and
the displayed price with the house margin baked in — the gap between them is
the educational point of Gamba Mode, and bets settle at the margined price.

Half-lines only for totals (no pushes to adjudicate). Correct score is the one
market real books don't offer for soccer on The Odds API, so it is model-only.
"""
import json

MODEL_MARGIN = 0.05      # 5% house edge on every displayed price
TOTALS_LINES = (1.5, 2.5, 3.5)
TOP_SCORES = 6           # listed correct-score cells; the rest pool into 'other'
MAX_PRICE = 100.0        # longshot cap, bookmaker convention


def _price(p: float) -> dict:
    """{p, fair, price} — probability 4dp, prices 2dp, capped at MAX_PRICE."""
    fair = min(1.0 / p, MAX_PRICE) if p > 0 else MAX_PRICE
    priced = min(1.0 / (p * (1.0 + MODEL_MARGIN)), MAX_PRICE) if p > 0 else MAX_PRICE
    return {"p": round(p, 4), "fair": round(fair, 2), "price": round(priced, 2)}


def h2h(matrix: list[list[float]]) -> dict:
    p_home = sum(matrix[i][j] for i in range(len(matrix)) for j in range(len(matrix[i])) if i > j)
    p_draw = sum(matrix[i][i] for i in range(len(matrix)))
    p_away = sum(matrix[i][j] for i in range(len(matrix)) for j in range(len(matrix[i])) if i < j)
    return {"home": _price(p_home), "draw": _price(p_draw), "away": _price(p_away)}


def totals(matrix: list[list[float]], lines: tuple = TOTALS_LINES) -> list[dict]:
    out = []
    for line in lines:
        p_over = sum(matrix[i][j] for i in range(len(matrix))
                     for j in range(len(matrix[i])) if i + j > line)
        out.append({"line": line, "over": _price(p_over), "under": _price(1.0 - p_over)})
    return out


def btts(matrix: list[list[float]]) -> dict:
    p_yes = sum(matrix[i][j] for i in range(1, len(matrix))
                for j in range(1, len(matrix[i])))
    return {"yes": _price(p_yes), "no": _price(1.0 - p_yes)}


def correct_score(matrix: list[list[float]], top: int = TOP_SCORES) -> list[dict]:
    cells = [(matrix[i][j], f"{i}-{j}") for i in range(len(matrix))
             for j in range(len(matrix[i]))]
    cells.sort(key=lambda c: -c[0])
    listed = cells[:top]
    out = [{"selection": sel, **_price(p)} for p, sel in listed]
    p_other = max(0.0, 1.0 - sum(p for p, _ in listed))
    out.append({"selection": "other", **_price(p_other)})
    return out


def model_markets(prediction: dict | None) -> dict | None:
    """Full model book for one match, or None when no prediction exists
    (knockout fixture whose teams aren't resolved yet -> UI shows it locked)."""
    if not prediction or not prediction.get("score_matrix_json"):
        return None
    matrix = json.loads(prediction["score_matrix_json"])
    return {
        "h2h": h2h(matrix),
        "totals": totals(matrix),
        "btts": btts(matrix),
        "correct_score": correct_score(matrix),
    }

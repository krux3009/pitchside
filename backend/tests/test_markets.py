import json

import pytest

from app.model import poisson
from app.services import markets

# A 2x2 toy matrix with exact hand-checkable sums:
#   home win  (1,0) = 0.3
#   draw      (0,0)+(1,1) = 0.1+0.4 = 0.5
#   away win  (0,1) = 0.2
TOY = [[0.1, 0.2], [0.3, 0.4]]


def real_matrix():
    m = poisson.score_matrix(1.4, 1.1)
    return json.loads(json.dumps(m.tolist()))  # same round-trip as predictions


def test_h2h_probabilities_and_margin():
    book = markets.h2h(TOY)
    assert book["home"]["p"] == 0.3
    assert book["draw"]["p"] == 0.5
    assert book["away"]["p"] == 0.2
    for sel in book.values():
        assert sel["fair"] == round(1 / sel["p"], 2)
        assert sel["price"] < sel["fair"]  # margin always shortens the price
    # the book's overround is exactly the margin: sum(1/price) == 1 + MARGIN
    overround = sum(1 / (1 / (p * 1.05)) for p in (0.3, 0.5, 0.2))
    assert overround == pytest.approx(1.05)


def test_totals_half_lines_partition_and_decline():
    tot = markets.totals(real_matrix())
    assert [t["line"] for t in tot] == [1.5, 2.5, 3.5]
    for t in tot:
        assert t["over"]["p"] + t["under"]["p"] == pytest.approx(1.0, abs=1e-3)
    assert tot[0]["over"]["p"] > tot[1]["over"]["p"] > tot[2]["over"]["p"]


def test_btts_from_toy_matrix():
    book = markets.btts(TOY)
    assert book["yes"]["p"] == 0.4
    assert book["no"]["p"] == 0.6


def test_correct_score_top_cells_plus_other():
    cs = markets.correct_score(real_matrix())
    assert len(cs) == markets.TOP_SCORES + 1
    assert cs[-1]["selection"] == "other"
    assert sum(c["p"] for c in cs) == pytest.approx(1.0, abs=1e-3)
    # listed cells come sorted by probability
    listed = [c["p"] for c in cs[:-1]]
    assert listed == sorted(listed, reverse=True)
    for c in cs:
        assert c["price"] <= markets.MAX_PRICE


def test_price_cap_on_longshots():
    assert markets._price(0.0)["price"] == markets.MAX_PRICE
    assert markets._price(1e-9)["price"] == markets.MAX_PRICE


def test_model_markets_none_without_prediction():
    assert markets.model_markets(None) is None
    assert markets.model_markets({"score_matrix_json": None}) is None


def test_model_markets_full_shape():
    book = markets.model_markets(
        {"score_matrix_json": json.dumps(real_matrix())})
    assert {"h2h", "totals", "btts", "correct_score"} == set(book)

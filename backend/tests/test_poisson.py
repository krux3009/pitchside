import numpy as np
import pytest

from app.model.poisson import lambdas, most_likely, score_matrix, wdl

PARAMS = {"b0": 0.1, "b1": 0.001, "b_home": 0.3, "rho": -0.05}


def test_lambdas_monotone_in_elo_diff():
    lam1, mu1 = lambdas(1800, 1800, params=PARAMS)
    lam2, mu2 = lambdas(1900, 1800, params=PARAMS)
    assert lam2 > lam1
    assert mu2 < mu1


def test_lambdas_equal_teams_symmetric_when_neutral():
    lam, mu = lambdas(1800, 1800, home_ind=0, params=PARAMS)
    assert lam == pytest.approx(mu)


def test_home_indicator_boosts_lambda_only():
    lam_n, mu_n = lambdas(1800, 1800, home_ind=0, params=PARAMS)
    lam_h, mu_h = lambdas(1800, 1800, home_ind=1, params=PARAMS)
    assert lam_h > lam_n
    assert mu_h == pytest.approx(mu_n)


def test_score_matrix_sums_to_one():
    m = score_matrix(1.4, 1.1, rho=-0.05)
    assert m.sum() == pytest.approx(1.0)


def test_dixon_coles_touches_exactly_four_cells():
    base = score_matrix(1.4, 1.1, rho=0.0)
    corrected = score_matrix(1.4, 1.1, rho=-0.05)
    # compare unnormalised structure via ratios: only (0,0),(0,1),(1,0),(1,1) shift
    ratio = corrected / base
    changed = np.argwhere(~np.isclose(ratio, ratio[5, 5], rtol=1e-9))
    assert {tuple(c) for c in changed} == {(0, 0), (0, 1), (1, 0), (1, 1)}


def test_negative_rho_raises_draw_probability():
    _, draw_flat, _ = wdl(score_matrix(1.3, 1.2, rho=0.0))
    _, draw_dc, _ = wdl(score_matrix(1.3, 1.2, rho=-0.08))
    assert draw_dc > draw_flat


def test_wdl_sums_to_one_and_favourite_wins_more():
    h, d, a = wdl(score_matrix(2.0, 0.8, rho=-0.05))
    assert h + d + a == pytest.approx(1.0)
    assert h > a


def test_most_likely_format():
    assert most_likely(score_matrix(0.5, 0.4, rho=0.0)) == "0-0"


def test_score_matrix_zero_rate_stays_finite():
    """A remaining rate that floors to 0 (momentum at t=90, or a degenerate
    param) must not poison the matrix with NaN via 0*log(0); the zero side
    collapses onto 0 goals and the matrix still normalises."""
    m = score_matrix(0.0, 1.2, rho=-0.05)
    assert np.isfinite(m).all()
    assert m.sum() == pytest.approx(1.0)
    assert m[1:, :].sum() == pytest.approx(0.0, abs=1e-9)  # home ~never scores
    # symmetric: a zero away rate keeps the away side on 0
    m2 = score_matrix(1.2, 0.0, rho=-0.05)
    assert np.isfinite(m2).all()
    assert m2[:, 1:].sum() == pytest.approx(0.0, abs=1e-9)

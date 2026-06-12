import pytest

from app.model.elo import HOME_BONUS, expected, g_factor, update


def test_expected_symmetry():
    assert expected(0) == 0.5
    assert expected(100) + expected(-100) == pytest.approx(1.0)


def test_expected_400_point_gap():
    # 400 points -> 10:1 odds -> ~0.909
    assert expected(400) == pytest.approx(10 / 11)


def test_g_factor_tiers():
    assert g_factor(0) == 1.0
    assert g_factor(1) == 1.0
    assert g_factor(-1) == 1.0
    assert g_factor(2) == 1.5
    assert g_factor(3) == pytest.approx(14 / 8)
    assert g_factor(-4) == pytest.approx(15 / 8)


def test_update_zero_sum():
    h, a = update(1900, 1700, 2, 0)
    assert h + a == pytest.approx(1900 + 1700)


def test_update_known_value():
    # equal teams, neutral, 1-goal home win: delta = 60 * 1 * (1 - 0.5) = 30
    h, a = update(1800, 1800, 1, 0)
    assert h == pytest.approx(1830)
    assert a == pytest.approx(1770)


def test_draw_moves_points_toward_underdog():
    h, a = update(1900, 1700, 0, 0)
    assert h < 1900
    assert a > 1700


def test_home_bonus_shrinks_home_gain():
    h_neutral, _ = update(1800, 1800, 1, 0)
    h_at_home, _ = update(1800, 1800, 1, 0, home_bonus=HOME_BONUS)
    # winning as the (favoured) home side earns less than winning on neutral ground
    assert h_at_home < h_neutral

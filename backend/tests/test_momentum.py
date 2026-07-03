from app.services import momentum


def ev(minute, type, team_id, clock=None):
    return {"minute": minute, "type": type, "team_id": team_id, "clock": clock}


def sh(minute, team_id, xg):
    return {"minute": minute, "team_id": team_id, "xg": xg}


def test_empty_without_data_or_lambdas():
    assert momentum.series([], [], 1, 2, 1.4, 1.1) == []
    assert momentum.series([ev(10, "goal", 1)], [], 1, 2, None, 1.1) == []


def test_probs_sum_to_one_and_track_score():
    events = [ev(20, "goal", 1), ev(70, "goal", 2)]      # 1-0 then 1-1
    shots = [sh(18, 1, 0.3), sh(65, 2, 0.5)]
    pts = momentum.series(events, shots, 1, 2, 1.5, 1.2)

    assert pts[0]["minute"] == 0 and pts[-1]["minute"] == 90
    for p in pts:
        assert abs(p["p_home"] + p["p_draw"] + p["p_away"] - 1) < 0.01  # no NaN, normalised
    last = pts[-1]
    assert (last["home_goals"], last["away_goals"]) == (1, 1)
    assert last["p_draw"] == 1.0                                        # 90', level -> certain draw
    assert last["xg_home"] == 0.3 and last["xg_away"] == 0.5            # xG accumulates


def test_own_goal_credits_the_opponent():
    pts = momentum.series([ev(30, "own-goal", 1)], [], 1, 2, 1.3, 1.3)
    assert (pts[-1]["home_goals"], pts[-1]["away_goals"]) == (0, 1)


def test_red_card_tilts_remaining_expectation():
    even = momentum.series([], [sh(5, 1, 0.1)], 1, 2, 1.4, 1.4)
    assert abs(even[0]["p_home"] - even[0]["p_away"]) < 0.02            # symmetric at kickoff
    red = momentum.series([ev(5, "red-card", 1)], [], 1, 2, 1.4, 1.4)  # home sent off
    mid = next(p for p in red if p["minute"] == 50)
    assert mid["p_home"] < mid["p_away"]


def test_series_extends_to_120_on_extra_time():
    # an ET board clock reads "105'" — its first number exceeds 90
    events = [ev(20, "goal", 1), ev(105, "goal", 1, clock="105'")]
    pts = momentum.series(events, [], 1, 2, 1.4, 1.1)
    assert pts[-1]["minute"] == 120
    assert (pts[-1]["home_goals"], pts[-1]["away_goals"]) == (2, 0)
    assert pts[-1]["p_home"] == 1.0                       # decided at 120'
    for p in pts:
        assert abs(p["p_home"] + p["p_draw"] + p["p_away"] - 1) < 0.01
    at90 = next(p for p in pts if p["minute"] == 90)
    assert at90["p_home"] < 1.0                           # ET still to play at 90'


def test_stoppage_clock_stays_on_regulation_axis():
    # "90'+4'" folds to minute 94 but is stoppage, not extra time: the series
    # must end at 90' and the goal must land on that final sample
    events = [ev(94, "goal", 1, clock="90'+4'")]
    pts = momentum.series(events, [], 1, 2, 1.4, 1.1)
    assert pts[-1]["minute"] == 90
    assert pts[-1]["home_goals"] == 1
    assert pts[-1]["p_home"] == 1.0

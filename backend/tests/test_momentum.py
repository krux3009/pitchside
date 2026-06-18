from app.services import momentum


def ev(minute, type, team_id):
    return {"minute": minute, "type": type, "team_id": team_id}


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

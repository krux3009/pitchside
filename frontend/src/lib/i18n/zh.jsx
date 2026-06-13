// 中文词典 — keys mirror en.jsx; missing keys fall back to English there.

export const ZH = {
  // navigation + footer
  "nav.home": "主页",
  "nav.matches": "赛程",
  "nav.players": "球员",
  "nav.methodology": "方法论",
  "footer.disclaimer": "预测仅为统计估计、供娱乐参考，不构成投注建议。",
  "footer.project": "学生作品集项目 —",
  "a11y.skip": "跳到主要内容",

  // loaders / errors
  "loader.warming": "球场灯光预热中…",
  "loader.coldStart": "免费服务器在比赛间隙休眠——首次加载最长可能需要一分钟。",
  "loader.apiError": "无法连接到 API。",

  // gambling disclaimer (required on every prediction surface)
  "disclaimer.ps": "提示：",
  "disclaimer.base": "这是一个学生统计项目。概率为模型估计值，经常出错——不构成投注建议。",
  "disclaimer.short": "如果你参与赌博，本站任何内容都不应作为依据。",
  "disclaimer.expanded": "任何基于这些预测的赌博决定或投注均由你自行承担责任；本站任何内容都不应作为依据。模型仅用于学习和娱乐。",

  // stages
  "stage.GROUP": "小组赛",
  "stage.R32": "32强",
  "stage.R16": "16强",
  "stage.QF": "四分之一决赛",
  "stage.SF": "半决赛",
  "stage.THIRD": "季军赛",
  "stage.FINAL": "决赛",
  "stage.group": ({ letter }) => `${letter}组`,

  // match cards + detail
  "match.live": "直播中",
  "match.ft": "完场",
  "match.fullTime": "全场结束",
  "match.prediction": "模型预测",
  "match.likelyScore": "最可能比分：",
  "match.how": "模型原理",
  "match.teamStats": "球队数据",
  "match.lineups": "首发阵容",
  "match.squads": "大名单",
  "match.bench": "替补",
  "match.squadNote": "官方首发阵容约在开球前30分钟公布——以下为26人完整大名单。",
  "prob.draw": "平局",

  // team stat rows
  "stat.possession": "控球率",
  "stat.shots": "射门",
  "stat.shots_on_target": "射正",
  "stat.corners": "角球",
  "stat.fouls": "犯规",
  "stat.offsides": "越位",
  "stat.passes": "传球",
  "stat.pass_accuracy": "传球成功率",
  "stat.yellows": "黄牌",
  "stat.reds": "红牌",

  // position groups
  "pos.GK": "门将",
  "pos.DF": "后卫",
  "pos.MF": "中场",
  "pos.FW": "前锋",

  // timetable
  "timetable.title": "赛程表",
  "timetable.allStages": "所有阶段",
  "timetable.allGroups": "所有小组",

  // player index
  "players.title": "球员",
  "players.search": "搜索球员或球队…",
  "players.none": "没有符合搜索条件的球员。",
  "players.player": "球员",
  "players.team": "球队",
  "players.col.goals": "进球",
  "players.col.assists": "助攻",
  "players.col.goals_per_90": "球/90",
  "players.col.team_goal_share": "占比",
  "players.col.minutes": "分钟",
  "players.col.apps": "出场",

  // player detail
  "player.age": ({ n }) => `${n}岁`,
  "player.tournament": "本届赛事",
  "player.goals": "进球",
  "player.assists": "助攻",
  "player.goalsPer90": "每90分钟进球",
  "player.share": "球队进球占比",
  "player.minutes": "出场时间",
  "player.apps": "出场次数",
  "player.yellows": "黄牌",
  "player.reds": "红牌",
  "player.form": "状态（近5场进球+助攻）",
  "player.matchLog": "比赛记录",
  "player.log.match": "比赛",
  "player.log.min": "分钟",
  "player.log.shots": "射门",
  "player.log.cards": "红黄牌",
  "player.noMinutes": "2026世界杯尚未出场。",
  "player.clubCareer": "俱乐部生涯",
  "player.international": "国家队生涯",
  "player.career.team": "球队",
  "player.career.years": "年份",
  "player.career.starts": "首发",
  "player.career.cs": "零封",
  "player.careerNote": "生涯数据来自 ESPN 赛季统计（覆盖有记录的联赛与杯赛）。ESPN 统计首发场次，不含替补出场。",

  // home / briefing
  "home.title": "比赛日简报",
  "home.autogen": "由比赛数据自动生成",
  "home.yesterday": "昨日赛果",
  "home.today": "今日比赛",
  "home.noMatches": "今天没有比赛。",
  "home.injuries": "伤停观察",
  "home.whoWins": "谁能赢得世界杯？",
  "home.crunching": "模拟计算中…",
  "home.simNote": ({ n }) => `对剩余赛程进行的 ${n} 次蒙特卡洛模拟 · `,
  "home.oddsMovers": "夺冠概率变动",
  "home.champTail": ({ pct }) => `→ 夺冠概率 ${pct}`,
  "home.upset": ({ team, pct }) => `爆冷：模型赛前只给${team} ${pct}的胜率。`,
  "home.goals": ({ n }) => `${n}球`,
  "home.assists": ({ n }) => `${n}次助攻`,

  // methodology
  "meth.title": "方法论",
  "meth.lead": "本站的每一个概率都来自下面的流程。没有任何主观编辑成分；页面上展示的参数全部实时读取自正在运行的模型。",
  "meth.s1.title": "1 · 球队实力 — World Football Elo 等级分",
  "meth.s1.p1": ({ link }) => (
    <>每支球队都有一个 Elo 等级分（初始值取自 {link}），每场比赛后更新：</>
  ),
  "meth.s1.p2": "世界杯决赛圈比赛 K = 60。G 随净胜球放大（平局或一球小胜为 1，两球为 1.5，更多为 (11+N)/8）。经典的 +100 主场优势分仅在东道主——美国、墨西哥或加拿大——在本国作赛时适用；其余比赛均按中立场计算。按照 Elo 惯例，等级分以90分钟比分更新。",
  "meth.s2.title": "2 · 从等级分到进球 — 泊松桥",
  "meth.s2.p1": "双方的期望进球数由 Elo 分差决定：",
  "meth.s2.fitted": ({ n, year, halfLife, b0, b1, bHome, eloPerGoal }) => (
    <>
      参数由极大似然法拟合，样本为 {year} 年以来的 <strong>{n}</strong>{" "}
      场正式国际比赛（剔除友谊赛，按 {halfLife} 年半衰期指数衰减加权）：
      β₀ = {b0}、β₁ = {b1}、β_home = {bHome}。β₁ 意味着大约每 ~{eloPerGoal}{" "}
      分 Elo 优势对应一个额外进球。
    </>
  ),
  "meth.s3.title": "3 · 比分分布 — Dixon-Coles 修正",
  "meth.s3.p": ({ rho }) => (
    <>
      两个独立的泊松分布构成 11×11 的比分概率矩阵。朴素泊松模型对 0-0 和 1-1
      的预测显著偏低，因此对四个低比分格子施加 Dixon &amp; Coles (1997) 的 τ
      修正{rho && <>（ρ = {rho}）</>}，然后对矩阵重新归一化。对矩阵对角线上方、
      对角线和下方分别求和，即得胜 / 平 / 负概率与最可能比分。
    </>
  ),
  "meth.s4.title": "4 · 整届赛事 — 10,000 次蒙特卡洛模拟",
  "meth.s4.p": () => (
    <>
      对剩余赛程重复模拟 10,000 次。小组排名严格遵循 2026 年的判定顺序——积分，
      然后是<em>整体</em>净胜球与总进球（2026 新规），然后在仍然同分的球队之间
      递归适用相互战绩，再之后是公平竞赛积分和 FIFA 排名。八个成绩最好的小组第三
      通过一个满足 FIFA 分组约束的确定性分配进入32强（在罕见组合下可能与 FIFA
      官方分配不同）。淘汰赛战平进入30分钟加时（按三分之一强度模拟），仍平则按
      50/50 点球大战处理。模拟中公平竞赛积分不可知，直接落到 FIFA 排名。
      模拟期间等级分保持冻结。
    </>
  ),
  "meth.s5.title": "5 · 我们错得有多离谱？— 实时记分卡",
  "meth.s5.p": ({ n, brier, brierBase, logLoss, logLossBase }) => (
    <>
      在已完赛的 <strong>{n}</strong> 场比赛中，模型的 Brier 分数为 {brier}，
      作为对照，"永远各猜⅓"基线为 {brierBase}（越低越好）。对数损失：{logLoss}，
      基线 {logLossBase}。该记分卡随赛事进行自动更新——包括模型表现糟糕的时候。
    </>
  ),
  "meth.s5.none": "还没有已完赛的比赛可供评分——下个比赛日之后再来看看。",
  "meth.s6.title": "6 · 已知局限",
  "meth.limits": [
    "尚无 xG 层（已在计划中）；球队实力仅基于比赛结果。",
    "球员可用性（伤病、停赛）不会调整 λ。",
    "点球大战按公平硬币处理。",
    "未对三个东道国之间的旅途/疲劳建模。",
    "当 ESPN 是唯一数据源时，球员出场时间为估算值。",
  ],
  "meth.refs.title": "参考文献",
};

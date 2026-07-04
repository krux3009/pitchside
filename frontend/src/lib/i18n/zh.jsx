// 中文词典 — keys mirror en.jsx; missing keys fall back to English there.

export const ZH = {
  // navigation + footer
  "nav.home": "主页",
  "nav.matches": "赛程",
  "nav.groups": "小组",
  "nav.bracket": "淘汰赛",
  "nav.players": "球员",
  "nav.compare": "对比",
  "nav.methodology": "方法论",
  "footer.disclaimer": "预测仅为统计估计、供娱乐参考，不构成投注建议。",
  "footer.project": "学生作品集项目 —",
  "a11y.skip": "跳到主要内容",

  // loaders / errors
  "loader.warming": "球场灯光预热中…",
  "loader.coldStart": "免费服务器在比赛间隙休眠——首次加载最长可能需要一分钟。",
  "loader.apiError": "无法连接到 API。",
  "error.title": "页面出错了",
  "error.body": "页面遇到错误，数据没有问题，请刷新重试。",
  "error.reload": "刷新",

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
  "hero.countdown": ({ d, h, m, s }) =>
    d > 0 ? `距开球 ${d} 天 ${h} 小时 ${m} 分 ${s} 秒`
      : h > 0 ? `距开球 ${h} 小时 ${m} 分 ${s} 秒`
      : `距开球 ${m} 分 ${s} 秒`,
  "timetable.onNow": "正在进行",
  "event.ht": "中场休息",
  "event.et": "加时赛",
  "compare.vs": "VS",
  "bracket.topHalf": "上半区",
  "bracket.bottomHalf": "下半区",
  "meth.tile.brier": "Brier 分数",
  "meth.tile.logloss": "对数损失",
  "meth.tile.baseline": ({ v }) => `均匀基线 ${v}`,
  "match.pens": ({ h, a }) => `点球大战 ${h}–${a}`,
  "match.pensShort": ({ h, a }) => `(点球 ${h}–${a})`,
  "match.pensL": ({ h }) => `(点球 ${h}`,
  "match.pensR": ({ a }) => `${a})`,
  "match.aet": "加时赛后",
  "match.prediction": "模型预测",
  "match.likelyScore": "最可能比分：",
  "match.how": "模型原理",
  "match.teamStats": "球队数据",
  "match.lineups": "首发阵容",
  "match.squads": "大名单",
  "match.bench": "替补",
  "match.squadNote": "官方首发阵容约在开球前30分钟公布——以下为26人完整大名单。",
  "match.timeline": "比赛进程",
  "reminder.cta": "开赛前 5 分钟提醒",
  "reminder.aria": "添加开赛提醒",
  "ics.title": "2026 世界杯",
  "momentum.title": "胜率走势",
  "momentum.lineLabel": "胜率",
  "momentum.even": "势均力敌",
  "momentum.now": "当前",
  "momentum.note": "实时近似值：当前比分加上模型对剩余时间的预期。并非训练过的临场模型——不考虑控球。",
  "event.own-goal": "乌龙球",
  "event.penalty-goal": "点球",
  "event.assist": ({ name }) => `助攻：${name}`,
  "shotmap.title": "射门图",
  "shotmap.allPlayers": "所有球员",
  "shotmap.tapHint": "点击射门查看详情，或拖动时间轴回放比赛",
  "shotmap.xgSource": "xG / xGOT 数据来自 ESPN",
  "shotmap.scrub": "拖动查看比赛时间",
  "shotmap.upTo": ({ min, shown, total }) => `${min}′ · ${shown}/${total}`,
  "shotmap.prevShot": "上一次射门",
  "shotmap.nextShot": "下一次射门",
  "shot.result.goal": "进球",
  "shot.result.saved": "被扑出",
  "shot.result.off-target": "偏出",
  "shot.result.blocked": "被封堵",
  "shot.xg": "预期进球 xG",
  "shot.xgot": "预期射正 xGOT",
  "shot.distance": "距离",
  "shot.bodyPart": "射门方式",
  "shot.situation": "情形",
  "shot.goalZone": "射门区域",
  "shot.metres": ({ n }) => `${n} 米`,
  "prob.draw": "平局",

  // team stat rows
  "stat.xg": "预期进球 (xG)",
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
  "timetable.search": "搜索球队…",
  "timetable.none": "没有符合搜索条件的比赛。",
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

  // 小组积分榜
  "groups.title": "小组积分榜",
  "groups.group": ({ letter }) => `${letter} 组`,
  "groups.qualify": "前两名出线",
  "groups.empty": "暂无已结束的小组赛。",
  "groups.pos": "#",
  "groups.col.played": "赛",
  "groups.col.won": "胜",
  "groups.col.drawn": "平",
  "groups.col.lost": "负",
  "groups.col.gf": "进",
  "groups.col.ga": "失",
  "groups.col.gd": "净",
  "groups.col.pts": "分",

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
  "player.career.present": "至今",
  "player.careerNote": "生涯数据来自 ESPN 赛季统计（覆盖有记录的联赛与杯赛）。ESPN 统计首发场次，不含替补出场。",

  // bracket
  "bracket.title": "淘汰赛对阵图",
  "bracket.lead": ({ n }) => `32强直到决赛 · 夺冠概率来自 ${n} 次蒙特卡洛模拟 · `,
  "bracket.leadNoSim": "32强直到决赛 · ",
  "bracket.champion": "冠军",
  "bracket.third": "季军赛",
  "bracket.caveat": "在结果确定前，席位显示 FIFA 的种子规则（小组头名 1A、第二 2B、最佳第三 3rd）。八支最佳第三名球队由确定性规则分配，在少数组合下可能与 FIFA 公布的分配不同。百分比为各队模拟夺冠的概率。",

  // compare
  "compare.title": "对比",
  "compare.lead": "把两支球队或两名球员并排比较。",
  "compare.teams": "球队",
  "compare.players": "球员",
  "compare.selectTeam": "选择球队…",
  "compare.selectPlayer": "选择球员…",
  "compare.empty": "选择两项进行对比。",
  "compare.played": "场次",
  "compare.won": "胜",
  "compare.drawn": "平",
  "compare.lost": "负",
  "compare.gf": "进球",
  "compare.ga": "失球",
  "compare.pts": "积分",
  "compare.champ": "夺冠概率",
  "compare.form": "状态（近5场）",

  // home / briefing
  "home.title": "比赛日简报",
  "home.autogen": "由比赛数据自动生成",
  "home.updated": ({ time }) => `更新于 ${time}`,
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

  // hover fun-fact bar (player line derived from live data; country facts below)
  "fact.loading": "…",
  "posOne.GK": "门将",
  "posOne.DF": "后卫",
  "posOne.MF": "中场",
  "posOne.FW": "前锋",
  "fact.player": ({ team, posLabel, age, club, g, a, apps, intlStarts }) => {
    const id = [team, posLabel, age != null ? `${age}岁` : null, club]
      .filter(Boolean)
      .join(" · ");
    const tail =
      apps > 0
        ? `本届世界杯：${g}球 ${a}助攻，出场${apps}次`
        : intlStarts
          ? `国家队首发${intlStarts}场`
          : null;
    return tail ? `${id} — ${tail}` : id;
  },
  // 球队趣闻 — 已核实、稳定（冠军 / 主办 / 历史战绩）
  "fact.team.ALG": "1982 年世界杯 2-1 爆冷击败西德。",
  "fact.team.ARG": "三夺世界杯冠军——1978、1986、2022。",
  "fact.team.AUS": "2001 年 31-0 胜美属萨摩亚——国际足球史上最大比分。",
  "fact.team.AUT": "1954 年 7-5 胜瑞士——世界杯单场进球最多的比赛。",
  "fact.team.BEL": "2018 年世界杯季军——「黄金一代」最佳战绩。",
  "fact.team.BIH": "2014 年首次以独立国家身份征战世界杯。",
  "fact.team.BRA": "唯一参加过历届世界杯的球队，五夺冠军（纪录）。",
  "fact.team.CAN": "2000 年中北美金杯冠军，先后淘汰墨西哥与美国。",
  "fact.team.CIV": "三夺非洲杯冠军——1992、2015、2023。",
  "fact.team.COD": "1974 年以扎伊尔之名，成首支征战世界杯的撒哈拉以南非洲球队。",
  "fact.team.COL": "1993 年世预赛客场 5-0 大胜阿根廷，传世经典。",
  "fact.team.CPV": "大西洋岛国，人口约 50 万，绰号「蓝鲨」。",
  "fact.team.CRO": "2018 年闯入世界杯决赛，红白格球衣深入人心。",
  "fact.team.CUW": "国际足联认定的前荷属安的列斯继承者。",
  "fact.team.CZE": "「勺子点球」的故乡——帕年卡，1976 年欧洲杯。",
  "fact.team.ECU": "2006 年闯入世界杯 16 强，队史最佳。",
  "fact.team.EGY": "非洲杯夺冠次数最多——七度封王。",
  "fact.team.ENG": "1966 年本土夺得世界杯——队史唯一冠军。",
  "fact.team.ESP": "2010 年世界杯冠军，四夺欧洲杯。",
  "fact.team.FRA": "两夺世界杯冠军——1998、2018。",
  "fact.team.GER": "四夺世界杯冠军——1954、1974、1990、2014。",
  "fact.team.GHA": "四夺非洲杯冠军；2010 年世界杯八强。",
  "fact.team.HAI": "1974 年萨农攻破佐夫，终结其 1142 分钟不失球纪录。",
  "fact.team.IRN": "唯一连续三届夺得亚洲杯的球队——1968、1972、1976。",
  "fact.team.IRQ": "2007 年亚洲杯夺冠，战乱之中的黑马传奇。",
  "fact.team.JOR": "2023 年亚洲杯亚军——队史首个大赛决赛。",
  "fact.team.JPN": "亚洲杯夺冠次数最多——四度封王。",
  "fact.team.KOR": "首支闯入世界杯四强的亚洲球队（2002 年）。",
  "fact.team.KSA": "2022 年世界杯 2-1 爆冷击败亚军阿根廷。",
  "fact.team.MAR": "首支闯入世界杯四强的非洲球队（2022 年）。",
  "fact.team.MEX": "首个两次举办世界杯的国家——1970 与 1986 年。",
  "fact.team.NED": "全攻全守足球的故乡；三获世界杯亚军（1974、1978、2010）。",
  "fact.team.NOR": "对巴西保持不败——四次交锋两胜两平。",
  "fact.team.NZL": "2010 年世界杯唯一保持不败的球队——三场平局。",
  "fact.team.PAN": "2018 年首次晋级世界杯，举国放假庆祝。",
  "fact.team.PAR": "2010 年闯入世界杯八强，队史最佳战绩。",
  "fact.team.POR": "2016 年欧洲杯冠军——队史首座大赛奖杯。",
  "fact.team.QAT": "首个举办世界杯的阿拉伯国家（2022 年）。",
  "fact.team.RSA": "首个举办世界杯的非洲国家（2010 年）。",
  "fact.team.SCO": "参加了世界首场正式国际比赛——1872 年对阵英格兰。",
  "fact.team.SEN": "2002 年世界杯处子秀即闯入八强，并击败法国。",
  "fact.team.SUI": "国际足联总部所在地（苏黎世）；曾主办 1954 年世界杯。",
  "fact.team.SWE": "作为东道主获 1958 年世界杯亚军，决赛负于巴西。",
  "fact.team.TUN": "首支在世界杯赢球的非洲球队——1978 年 3-1 胜墨西哥。",
  "fact.team.TUR": "2002 年苏克约 11 秒入球——世界杯历史最快进球。",
  "fact.team.URU": "1930 年作为东道主夺得首届世界杯；两夺冠军。",
  "fact.team.USA": "1930 年首届世界杯闯入四强——队史最佳。",
  "fact.team.UZB": "中亚球队（亚足联）；1994 年亚运会足球金牌。",

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

  // Gamba Mode — 游戏币模拟投注
  "nav.gamba": "模拟投注",
  "gamba.strap": "游戏币模式 — ₲ 是虚拟积分，永远不是真钱",
  "gamba.balance": "余额",
  "gamba.nav.board": "盘口",
  "gamba.nav.bets": "我的注单",
  "gamba.nav.school": "庄家课堂",
  "gamba.disclaimer": "₲ 是没有任何现金价值的虚拟积分；不能充值、不能提现、也买不到任何东西。这个页面的存在，就是为了用你自己的数字演示赌博为什么会输钱。",

  "gamba.board.title": "盘口板",
  "gamba.board.sub": "下面每一个赔率都藏着抽水——先看穿它，别让它先掏空你。",
  "gamba.rule90": "所有玩法均按90分钟比分结算。淘汰赛90分钟战平即按平局赔付，即使比赛继续进行。",
  "gamba.board.overround": ({ sum, edge, book }) =>
    `下方${book}的胜平负赔率隐含概率合计 ${sum}%，而真实结果只有 100%——多出的 ${edge}% 就是抽水。`,
  "gamba.board.error": "盘口加载失败。",
  "gamba.board.empty": "没有可投注的比赛——本届赛事已结束。",
  "gamba.board.locked": "对阵尚未确定——晋级形势明朗后开盘",
  "gamba.board.noOdds": "博彩公司尚未开出赔率——临近开球再来看看",
  "gamba.board.closed": "已封盘",

  "gamba.market.h2h": "胜平负 · 90分钟",
  "gamba.market.totals": "大小球 · 总进球",
  "gamba.market.btts": "双方球队进球",
  "gamba.market.correct_score": "波胆（精确比分）",
  "gamba.market.modelBook": "模型盘口",
  "gamba.market.realBook": "真实赔率",
  "gamba.market.median": "中位",

  "gamba.sel.draw": "平局",
  "gamba.sel.over": "大",
  "gamba.sel.under": "小",
  "gamba.sel.yes": "是",
  "gamba.sel.no": "否",
  "gamba.sel.otherScore": "其他比分",
  "gamba.sel.exactScore": ({ score }) => `恰好 ${score}`,
  "gamba.sel.toWin": ({ team }) => `${team} 胜`,

  "gamba.slip.title": "投注单",
  "gamba.slip.empty": "点选一个赔率开始下注。",
  "gamba.slip.printed": "已出票 ✓",
  "gamba.slip.stake": "本金",
  "gamba.slip.returns": "可得回报",
  "gamba.slip.fair": "公平赔率（模型）",
  "gamba.slip.implied": "隐含概率",
  "gamba.slip.ev": "期望值",
  "gamba.slip.evPer": ({ v }) => `每 ₲100 ${v}`,
  "gamba.slip.place": "投下虚拟注",
  "gamba.slip.closed": "已封盘",
  "gamba.slip.err.closed": "比赛已开球——封盘。",
  "gamba.slip.err.min": "最低下注 ₲10。",
  "gamba.slip.err.funds": "₲ 余额不足。",
  "gamba.drip": "领取每日救济 ₲200",

  "gamba.ticket.won": "赢",
  "gamba.ticket.lost": "输",
  "gamba.ticket.void": "作废",
  "gamba.ticket.final": ({ score }) => `完场 ${score}`,
  "gamba.ticket.fairWas": ({ fair, paid }) =>
    `公平赔率是 ${fair}，你拿到的是 ${paid}——差额就是庄家优势。`,
  "gamba.ticket.aboveFair": ({ fair, paid }) =>
    `模型公平赔率是 ${fair}，你拿到的是 ${paid}——模型认为这个价格偏高，两本账总有一本是错的。`,
  "gamba.toast.settled": ({ match, amount }) => `${match} 已结算——返还 ${amount}。`,

  "gamba.bets.title": "我的注单",
  "gamba.bets.staked": "总投入",
  "gamba.bets.returned": "总返还",
  "gamba.bets.net": "净盈亏",
  "gamba.bets.roi": "回报率",
  "gamba.bets.none": "还没有注单——盘口在这边：",
  "gamba.bets.open": "未结算",
  "gamba.bets.settled": "已结算",
  "gamba.reset": "重置账户",
  "gamba.reset.confirm": "清空所有注单并重置为 ₲500？",

  "gamba.onboard.title": "欢迎来到 Gamba 模拟投注",
  "gamba.onboard.p1": "你有 ₲500 游戏币。₲ 是纯虚拟积分：不能充值、不能提现、买不到任何东西——永远如此。",
  "gamba.onboard.p2": "盘口上的每个赔率都和真实博彩公司一样藏着抽水。你的任务，是亲眼看着它一点点抽干你的余额。",
  "gamba.onboard.p3": "「庄家课堂」会记录抽水到底花了你多少钱。概率不是投注建议——这个页面就是证明。",
  "gamba.onboard.cta": ({ amount }) => `发牌吧 — ${amount}`,

  "gamba.school.title": "为什么庄家永远赢",
  "gamba.school.p1": ({ margin }) =>
    `模型盘口的每个赔率都被刻意压低了 ${margin}%。按公平赔率永远下注，你不赚不亏；按盘口赔率下注，你每一次都在上交这份抽水。`,
  "gamba.school.p2": "期望值（EV）是把同一注重复无限次的平均结果。本站每张投注单在下注前都会显示 EV——按构造，模型盘口的每个价格 EV 都是负的。",
  "gamba.school.p3": "真实博彩公司用更准的概率和更高的抽水运转着同一台机器，尤其在业余玩家最爱的玩法上。长期来看，没有任何投注策略、连赢手感或直觉能战胜负 EV 的游戏。这就是全部结论——也是概率永远不构成投注建议的原因。",
  "gamba.school.yourLedger": "你的账本",
  "gamba.school.noHistory": "还没有已结算的注单——注单结算后账本会自动更新。",
  "gamba.school.expectedVsActual": ({ expected, expSign, actual, actSign }) =>
    `在已结算的注单上，模型预计你会${expSign} ${expected}；实际你${actSign} ${actual}。`,
  "gamba.school.luck": "差额是运气——而运气没有记忆。",
  "gamba.school.lose": "亏",
  "gamba.school.win": "赚",
  "gamba.school.lost": "亏了",
  "gamba.school.won": "赚了",
  "gamba.school.overround": "抽水，现场版",
  "gamba.school.overroundDemo": ({ match, probs, sum, edge }) =>
    `以 ${match} 为例：真实赔率中位数隐含概率 ${probs} = ${sum}%。真实概率合计只有 100%——多出的 ${edge}% 就是庄家在平衡盘上锁定的利润。`,
  "gamba.school.overroundStatic": "庄家把每个结果的赔率都定得略低于公平值，因此隐含概率合计超过 100%。超出的部分叫抽水（overround）——庄家在平衡盘上的利润。（当前没有加载真实赔率，暂无实例可拆。）",
  "gamba.school.modelVsReal": "模型 vs 真实赔率",
  "gamba.school.modelVsRealSub": "同样的比赛，两本账：我们的 Elo-Poisson 模型对阵真实博彩公司的中位数。分歧最大的地方，就是其中一方错得最厉害的地方。",
  "gamba.school.thMatch": "比赛",
  "gamba.school.thSel": "选项",
  "gamba.school.takeaway": "结论",
};

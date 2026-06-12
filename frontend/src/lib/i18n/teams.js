// Chinese names for the 48 qualified teams, keyed by FIFA trigram (the one
// stable identifier across our seed, ESPN, and API-Football payloads).
export const TEAM_ZH = {
  MEX: "墨西哥", RSA: "南非", KOR: "韩国", CZE: "捷克", CAN: "加拿大",
  BIH: "波黑", QAT: "卡塔尔", SUI: "瑞士", BRA: "巴西", MAR: "摩洛哥",
  HAI: "海地", SCO: "苏格兰", USA: "美国", PAR: "巴拉圭", AUS: "澳大利亚",
  TUR: "土耳其", GER: "德国", CUW: "库拉索", CIV: "科特迪瓦", ECU: "厄瓜多尔",
  NED: "荷兰", JPN: "日本", SWE: "瑞典", TUN: "突尼斯", BEL: "比利时",
  EGY: "埃及", IRN: "伊朗", NZL: "新西兰", ESP: "西班牙", CPV: "佛得角",
  KSA: "沙特阿拉伯", URU: "乌拉圭", FRA: "法国", SEN: "塞内加尔", IRQ: "伊拉克",
  NOR: "挪威", ARG: "阿根廷", ALG: "阿尔及利亚", AUT: "奥地利", JOR: "约旦",
  POR: "葡萄牙", COD: "刚果（金）", UZB: "乌兹别克斯坦", COL: "哥伦比亚",
  ENG: "英格兰", CRO: "克罗地亚", GHA: "加纳", PAN: "巴拿马",
};

// English name -> trigram, for places that only carry a name (career-table
// international rows from ESPN). Seed (openfootball) spellings + observed
// ESPN/eloratings variants. Unknown names simply stay Latin.
export const EN_NAME_TO_CODE = {
  "Mexico": "MEX", "South Africa": "RSA", "South Korea": "KOR",
  "Czech Republic": "CZE", "Canada": "CAN", "Bosnia & Herzegovina": "BIH",
  "Qatar": "QAT", "Switzerland": "SUI", "Brazil": "BRA", "Morocco": "MAR",
  "Haiti": "HAI", "Scotland": "SCO", "USA": "USA", "Paraguay": "PAR",
  "Australia": "AUS", "Turkey": "TUR", "Germany": "GER", "Curaçao": "CUW",
  "Ivory Coast": "CIV", "Ecuador": "ECU", "Netherlands": "NED", "Japan": "JPN",
  "Sweden": "SWE", "Tunisia": "TUN", "Belgium": "BEL", "Egypt": "EGY",
  "Iran": "IRN", "New Zealand": "NZL", "Spain": "ESP", "Cape Verde": "CPV",
  "Saudi Arabia": "KSA", "Uruguay": "URU", "France": "FRA", "Senegal": "SEN",
  "Iraq": "IRQ", "Norway": "NOR", "Argentina": "ARG", "Algeria": "ALG",
  "Austria": "AUT", "Jordan": "JOR", "Portugal": "POR", "DR Congo": "COD",
  "Uzbekistan": "UZB", "Colombia": "COL", "England": "ENG", "Croatia": "CRO",
  "Ghana": "GHA", "Panama": "PAN",
  // variants seen in ESPN / eloratings data
  "United States": "USA", "Czechia": "CZE", "Bosnia and Herzegovina": "BIH",
  "Côte d'Ivoire": "CIV", "Cabo Verde": "CPV", "Türkiye": "TUR",
  "Curacao": "CUW", "Korea Republic": "KOR", "IR Iran": "IRN",
  "Congo DR": "COD",
};

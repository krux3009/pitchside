import { BrowserRouter, Route, Routes } from "react-router-dom";

import GambaLayout from "./components/gamba/GambaLayout";
import Layout from "./components/Layout";
import Bracket from "./pages/Bracket";
import Compare from "./pages/Compare";
import GambaBets from "./pages/gamba/GambaBets";
import GambaBoard from "./pages/gamba/GambaBoard";
import GambaSchool from "./pages/gamba/GambaSchool";
import Groups from "./pages/Groups";
import Home from "./pages/Home";
import MatchDetail from "./pages/MatchDetail";
import Methodology from "./pages/Methodology";
import PlayerDetail from "./pages/PlayerDetail";
import PlayerIndex from "./pages/PlayerIndex";
import Timetable from "./pages/Timetable";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/matches" element={<Timetable />} />
          <Route path="/matches/:id" element={<MatchDetail />} />
          <Route path="/groups" element={<Groups />} />
          <Route path="/bracket" element={<Bracket />} />
          <Route path="/compare" element={<Compare />} />
          <Route path="/players" element={<PlayerIndex />} />
          <Route path="/players/:id" element={<PlayerDetail />} />
          <Route path="/methodology" element={<Methodology />} />
        </Route>
        {/* Gamba Mode lives outside Layout: its own paper theme, header, footer */}
        <Route element={<GambaLayout />}>
          <Route path="/gamba" element={<GambaBoard />} />
          <Route path="/gamba/bets" element={<GambaBets />} />
          <Route path="/gamba/school" element={<GambaSchool />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

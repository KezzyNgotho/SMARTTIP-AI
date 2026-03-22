import { HashRouter, Navigate, Route, Routes } from "react-router-dom";
import Overlay from "./components/Overlay";
import DashboardPage from "./pages/DashboardPage";
import LandingPage from "./pages/LandingPage";

export default function App() {
  return (
    <HashRouter>
      <main className="app-shell app-stage">
        <Overlay />
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </HashRouter>
  );
}

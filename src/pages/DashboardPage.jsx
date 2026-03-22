import { Link } from "react-router-dom";
import Dashboard from "../components/Dashboard";

export default function DashboardPage() {
  return (
    <div className="page-container">
      <header className="dashboard-header">
        <p className="eyebrow">Control Center</p>
        <h1>Tip Agent Dashboard</h1>
        <p>Live operations for budgets, wallet health, and decision flow.</p>
        <Link className="ghost-cta" to="/">
          Back To Landing
        </Link>
      </header>

      <section className="app-grid" id="dashboard">
        <Dashboard />
      </section>
    </div>
  );
}

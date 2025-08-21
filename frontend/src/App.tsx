import React from "react";
import { BrowserRouter as Router, Routes, Route, NavLink } from "react-router-dom";
import WeeklySessions from "./components/weeklySessions";
import FacultySessions from "./components/facultySessions";
import AttendanceReport from "./components/AttendanceReport";
import ClassSessions from "./components/classSessions";
import AddSessionPage from "./components/AddSessionPage";
import './App.css';


function App() {
  return (
    <Router>
      <div className="App bg-gray-100 min-h-screen">
        {/* Navigation */}
        <nav className="sticky top-0 z-50 bg-white shadow-md border-b border-gray-200 px-6 py-4 flex flex-wrap items-center justify-center gap-4 md:gap-8">
          <NavLink
            to="/"
            className={({ isActive }) =>
              `nav-link ${isActive ? "active-link" : ""}`
            }
          >
            Weekly Sessions
          </NavLink>
          <NavLink
            to="/faculty-sessions"
            className={({ isActive }) =>
              `nav-link ${isActive ? "active-link" : ""}`
            }
          >
            Faculty Sessions
          </NavLink>
          <NavLink
            to="/attendance-report"
            className={({ isActive }) =>
              `nav-link ${isActive ? "active-link" : ""}`
            }
          >
            Attendance Report
          </NavLink>
          <NavLink
            to="/class-sessions"
            className={({ isActive }) =>
              `nav-link ${isActive ? "active-link" : ""}`
            }
          >
            Class Sessions
          </NavLink>
        </nav>

        {/* Routes */}
        <div className="px-4 py-6">
          <Routes>
            <Route path="/" element={<WeeklySessions />} />
            <Route path="/faculty-sessions" element={<FacultySessions />} />
            <Route path="/attendance-report" element={<AttendanceReport />} />
            <Route path="/class-sessions" element={<ClassSessions />} />
            <Route path="/sessions/add" element={<AddSessionPage />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;

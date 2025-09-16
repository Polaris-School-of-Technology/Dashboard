import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  NavLink,
  useLocation,
  Navigate,
  useNavigate,
} from "react-router-dom";

import WeeklySessions from "./components/weeklySessions";
import FacultySessions from "./components/facultySessions";
import AttendanceReport from "./components/AttendanceReport";
import ClassSessions from "./components/classSessions";
import AddSessionPage from "./components/AddSessionPage";
import FeedbackPage from "./components/feedback";
import LoginPage from "./components/LoginPage";
import RbacfacultySessions from "./components/rbacFacultyPage";
import AdminNotifications from "./components/Notifications";
import RbacFacultyAttendnace from "./components/rbacFacultyAttenndacePage";

import "./App.css";

function App() {
  return (
    <Router>
      <MainApp />
    </Router>
  );
}

function MainApp() {
  const location = useLocation();
  const navigate = useNavigate();
  const role = localStorage.getItem("role");
  const hideNavbar = location.pathname === "/login";

  const navClass = ({ isActive }: { isActive: boolean }) =>
    `nav-link ${isActive ? "active-link" : ""}`;

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("facultyId");
    navigate("/login", { replace: true });
  };

  return (
    <div className="App bg-gray-100 min-h-screen relative">
      {/* Logout button */}
      {!hideNavbar && (
        <button
          onClick={handleLogout}
          className="logout-btn fixed top-4 right-4 z-50"
        >
          Logout
        </button>
      )}

      {/* Navigation */}
      {!hideNavbar && (
        <nav className="nav-container sticky top-0 z-40 bg-white shadow-lg border-b border-gray-200 px-6 py-4">
          <div className="flex flex-wrap gap-6 justify-center md:justify-start">
            {role === "admin" && (
              <>
                <NavLink to="/weekly-sessions" className={navClass}>
                  Weekly Sessions
                </NavLink>
                <NavLink to="/faculty-sessions" className={navClass}>
                  Faculty Sessions
                </NavLink>
                <NavLink to="/attendance-report" className={navClass}>
                  Attendance Report
                </NavLink>
                <NavLink to="/class-sessions" className={navClass}>
                  Class Sessions
                </NavLink>
                <NavLink to="/admin-notifications" className={navClass}>
                  Notifications
                </NavLink>
              </>
            )}
            {role === "faculty" && (
              <>
                <NavLink to="/rbac-faculty-sessions" className={navClass}>
                  My Sessions
                </NavLink>
                <NavLink to="/rbac-faculty-attendance" className={navClass}>
                  Attendance
                </NavLink>
              </>
            )}
          </div>
        </nav>
      )}

      {/* Main Content */}
      <div className="main-content px-4 py-6">
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          {/* Admin Routes */}
          <Route
            path="/weekly-sessions"
            element={
              <PrivateRoute allowedRoles={["admin"]}>
                <WeeklySessions />
              </PrivateRoute>
            }
          />
          <Route
            path="/faculty-sessions"
            element={
              <PrivateRoute allowedRoles={["admin"]}>
                <FacultySessions />
              </PrivateRoute>
            }
          />
          <Route
            path="/attendance-report"
            element={
              <PrivateRoute allowedRoles={["admin"]}>
                <AttendanceReport />
              </PrivateRoute>
            }
          />
          <Route
            path="/class-sessions"
            element={
              <PrivateRoute allowedRoles={["admin"]}>
                <ClassSessions />
              </PrivateRoute>
            }
          />
          <Route
            path="/sessions/add"
            element={
              <PrivateRoute allowedRoles={["admin"]}>
                <AddSessionPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/quiz/:session_id"
            element={
              <PrivateRoute allowedRoles={["admin"]}>
                <FeedbackPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/admin-notifications"
            element={
              <PrivateRoute allowedRoles={["admin"]}>
                <AdminNotifications />
              </PrivateRoute>
            }
          />

          {/* Faculty Routes */}
          <Route
            path="/rbac-faculty-sessions"
            element={
              <PrivateRoute allowedRoles={["faculty"]}>
                <RbacfacultySessions />
              </PrivateRoute>
            }
          />
          <Route
            path="/rbac-faculty-attendance"
            element={
              <PrivateRoute allowedRoles={["faculty"]}>
                <RbacFacultyAttendnace />
              </PrivateRoute>
            }
          />

          {/* Unauthorized */}
          <Route
            path="/unauthorized"
            element={
              <div className="error-message text-center text-red-500 mt-10 p-8 bg-red-50 rounded-lg border border-red-200">
                <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
                <p>You don't have permission to access this page.</p>
              </div>
            }
          />

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </div>
    </div>
  );
}

function PrivateRoute({
  children,
  allowedRoles,
}: {
  children: React.ReactNode;
  allowedRoles?: string[];
}) {
  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role");

  if (!token) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(role ?? "")) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
}

export default App;

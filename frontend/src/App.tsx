// src/App.tsx
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
import axios from "axios";

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
import AttendanceCSV from "./components/AttendanceCSV";
import SessionAnalyticsDashboard from "./components/sessionAnalysis";
import FacultyRating from "./components/facultyRatings";

import ResetPassword from "./components/ResetPassword";
import ForgotPasswordPage from "./components/forgotPassword";

import "./App.css";

// Axios interceptor for token expiry
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const redirect = error.response?.data?.redirectToLogin;
    const reqUrl = error.config?.url;

    if (reqUrl?.includes("/login")) return Promise.reject(error);

    if (status === 401 || redirect || status === 403) {
      localStorage.removeItem("token");
      localStorage.removeItem("role");
      localStorage.removeItem("facultyId");
      window.location.href = "/login";
      return new Promise(() => { });
    }

    return Promise.reject(error);
  }
);

axios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

function App() {
  return (
    <Router>
      <MainApp />
    </Router>
  );
}

function MainApp() {
  const location = useLocation();
  const role = localStorage.getItem("role");

  // Define completely public pages that should have no navbar/dashboard
  const publicPages = ["/login", "/reset-password"];
  const isPublicPage = publicPages.includes(location.pathname);

  const navClass = ({ isActive }: { isActive: boolean }) =>
    `nav-link ${isActive ? "active-link" : ""}`;

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = "/login";
  };

  return (
    <div className="App bg-gray-100 min-h-screen relative">
      {/* Navbar and Logout only for private/dashboard pages */}
      {!isPublicPage && (
        <>
          <button
            onClick={handleLogout}
            className="logout-btn fixed top-4 right-4 z-50"
          >
            Logout
          </button>

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
                  <NavLink to="/attendance-csv" className={navClass}>
                    Attendance CSV
                  </NavLink>
                  <NavLink to="/session-analytics" className={navClass}>
                    Session Analytics
                  </NavLink>
                  <NavLink to="/faculty-ratings" className={navClass}>
                    Faculty Ratings
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
        </>
      )}

      {/* Main Content */}
      <div className="main-content px-4 py-6">
        <Routes>
          {/* Public Pages */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPassword />} />

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
          <Route
            path="/attendance-csv"
            element={
              <PrivateRoute allowedRoles={["admin"]}>
                <AttendanceCSV />
              </PrivateRoute>
            }
          />
          <Route
            path="/session-analytics"
            element={
              <PrivateRoute allowedRoles={["admin"]}>
                <SessionAnalyticsDashboard />
              </PrivateRoute>
            }
          />
          <Route
            path="/faculty-ratings"
            element={
              <PrivateRoute allowedRoles={["admin"]}>
                <FacultyRating />
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
  const [isReady, setIsReady] = React.useState(false);
  const [redirectPath, setRedirectPath] = React.useState<string | null>(null);

  React.useEffect(() => {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");

    if (!token) {
      setRedirectPath("/login");
      setIsReady(true);
      return;
    }

    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      const now = Date.now() / 1000;

      if (payload.exp < now) {
        localStorage.clear();
        setRedirectPath("/login");
      } else if (allowedRoles && !allowedRoles.includes(role ?? "")) {
        localStorage.clear();
        setRedirectPath("/login");
      } else {
        setRedirectPath(null);
      }
    } catch {
      localStorage.clear();
      setRedirectPath("/login");
    } finally {
      setIsReady(true);
    }
  }, [allowedRoles]);

  if (!isReady) return null;

  if (redirectPath) return <Navigate to={redirectPath} replace />;

  return <>{children}</>;
}

export default App;

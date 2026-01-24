import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';

// Layouts
import MainLayout from './layouts/MainLayout';
import AuthLayout from './layouts/AuthLayout';
import ProjectLayout from './layouts/ProjectLayout';

// Auth Pages
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';

// Main Pages
import Dashboard from './pages/Dashboard';
import Projects from './pages/Projects';
import NewProject from './pages/NewProject';
import Profile from './pages/Profile';

// Project Pages
import ProjectOverview from './pages/project/Overview';
import ProjectStory from './pages/project/Story';
import ProjectCharacters from './pages/project/Characters';
import ProjectPuzzles from './pages/project/Puzzles';
import ProjectTrail from './pages/project/Trail';
import ProjectEvents from './pages/project/Events';
import ProjectAssets from './pages/project/Assets';
import ProjectTasks from './pages/project/Tasks';
import ProjectLore from './pages/project/Lore';
import ProjectTimeline from './pages/project/Timeline';
import ProjectLocations from './pages/project/Locations';
import ProjectDigitalProperties from './pages/project/DigitalProperties';
import ProjectSettings from './pages/project/Settings';
import ProjectTeam from './pages/project/Team';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-arg-purple-500"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-arg-purple-500"></div>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      {/* Auth Routes */}
      <Route element={<AuthLayout />}>
        <Route
          path="/login"
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          }
        />
        <Route
          path="/register"
          element={
            <PublicRoute>
              <Register />
            </PublicRoute>
          }
        />
      </Route>

      {/* Protected Routes */}
      <Route
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/projects" element={<Projects />} />
        <Route path="/projects/new" element={<NewProject />} />
        <Route path="/profile" element={<Profile />} />
      </Route>

      {/* Project Routes */}
      <Route
        path="/project/:projectId"
        element={
          <ProtectedRoute>
            <ProjectLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<ProjectOverview />} />
        <Route path="story" element={<ProjectStory />} />
        <Route path="characters" element={<ProjectCharacters />} />
        <Route path="puzzles" element={<ProjectPuzzles />} />
        <Route path="trail" element={<ProjectTrail />} />
        <Route path="events" element={<ProjectEvents />} />
        <Route path="assets" element={<ProjectAssets />} />
        <Route path="tasks" element={<ProjectTasks />} />
        <Route path="lore" element={<ProjectLore />} />
        <Route path="timeline" element={<ProjectTimeline />} />
        <Route path="locations" element={<ProjectLocations />} />
        <Route path="digital-properties" element={<ProjectDigitalProperties />} />
        <Route path="team" element={<ProjectTeam />} />
        <Route path="settings" element={<ProjectSettings />} />
      </Route>

      {/* Default redirect */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

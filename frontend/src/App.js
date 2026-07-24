import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { Toaster } from "@/components/ui/sonner";

import Home from "@/pages/Home";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import Dashboard from "@/pages/Dashboard";
import CreateChild from "@/pages/CreateChild";
import ChildProfile from "@/pages/ChildProfile";
import Assessment from "@/pages/Assessment";
import Report from "@/pages/Report";
import BrainGames from "@/pages/BrainGames";
import BrainGamePlay from "@/pages/BrainGamePlay";
import Certificates from "@/pages/Certificates";
import ProgressPage from "@/pages/ProgressPage";

function Protected({ children }) {
  const { user, loading } = useAuth();
  if (loading || user === null) return <div className="min-h-screen grid place-items-center text-muted-foreground">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/dashboard" element={<Protected><Dashboard /></Protected>} />
            <Route path="/dashboard/child/new" element={<Protected><CreateChild /></Protected>} />
            <Route path="/dashboard/child/:childId" element={<Protected><ChildProfile /></Protected>} />
            <Route path="/dashboard/child/:childId/assessment" element={<Protected><Assessment /></Protected>} />
            <Route path="/dashboard/report/:assessmentId" element={<Protected><Report /></Protected>} />
            <Route path="/dashboard/games" element={<Protected><BrainGames /></Protected>} />
            <Route path="/dashboard/games/:gameKey" element={<Protected><BrainGamePlay /></Protected>} />
            <Route path="/dashboard/certificates" element={<Protected><Certificates /></Protected>} />
            <Route path="/dashboard/progress" element={<Protected><ProgressPage /></Protected>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          <Toaster position="top-right" richColors />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;

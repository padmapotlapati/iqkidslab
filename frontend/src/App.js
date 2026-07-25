import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { Toaster } from "@/components/ui/sonner";
import PageTracker from "@/components/PageTracker";

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
import Rewards from "@/pages/Rewards";
import Timeline from "@/pages/Timeline";
import DailyChallenge from "@/pages/DailyChallenge";
import Admin from "@/pages/Admin";
import Pricing from "@/pages/Pricing";
import { PaymentSuccess, PaymentCancel } from "@/pages/Payment";
import { BlogList, BlogPost } from "@/pages/Blog";
import { About, Contact, Privacy, Terms, Cookies, Disclaimer } from "@/pages/StaticPages";

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
          <PageTracker />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/payment/success" element={<PaymentSuccess />} />
            <Route path="/payment/cancel" element={<PaymentCancel />} />
            <Route path="/blog" element={<BlogList />} />
            <Route path="/blog/:slug" element={<BlogPost />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/cookies" element={<Cookies />} />
            <Route path="/disclaimer" element={<Disclaimer />} />
            <Route path="/dashboard" element={<Protected><Dashboard /></Protected>} />
            <Route path="/dashboard/child/new" element={<Protected><CreateChild /></Protected>} />
            <Route path="/dashboard/child/:childId" element={<Protected><ChildProfile /></Protected>} />
            <Route path="/dashboard/child/:childId/assessment" element={<Protected><Assessment /></Protected>} />
            <Route path="/dashboard/report/:assessmentId" element={<Protected><Report /></Protected>} />
            <Route path="/dashboard/games" element={<Protected><BrainGames /></Protected>} />
            <Route path="/dashboard/games/:gameKey" element={<Protected><BrainGamePlay /></Protected>} />
            <Route path="/dashboard/certificates" element={<Protected><Certificates /></Protected>} />
            <Route path="/dashboard/progress" element={<Protected><ProgressPage /></Protected>} />
            <Route path="/dashboard/rewards" element={<Protected><Rewards /></Protected>} />
            <Route path="/dashboard/timeline" element={<Protected><Timeline /></Protected>} />
            <Route path="/dashboard/daily-challenge" element={<Protected><DailyChallenge /></Protected>} />
            <Route path="/admin" element={<Protected><Admin /></Protected>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          <Toaster position="top-right" richColors />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;

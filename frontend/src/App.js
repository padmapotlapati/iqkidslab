import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { Toaster } from "@/components/ui/sonner";
import PageTracker from "@/components/PageTracker";

import Home from "@/pages/Home";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";
import VerifyEmail from "@/pages/VerifyEmail";
import VerifyEmailRequired from "@/pages/VerifyEmailRequired";
import AuthCallback from "@/pages/AuthCallback";
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
import Subscription from "@/pages/Subscription";
import { PaymentSuccess, PaymentCancel } from "@/pages/Payment";
import { BlogList, BlogPost } from "@/pages/Blog";
import { About, Contact, Privacy, Terms, Cookies, Disclaimer } from "@/pages/StaticPages";

function Protected({ children }) {
  const { user, loading } = useAuth();
  if (loading || user === null) return <div className="min-h-screen grid place-items-center text-muted-foreground">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  // Hard-lock: require email verification (Google-linked users are auto-verified server-side)
  if (user.email_verified === false) return <Navigate to="/verify-email-required" replace />;
  return children;
}

function VerifyGate({ children }) {
  // Used for the "verify-email-required" page — must be logged in but NOT verified.
  const { user, loading } = useAuth();
  if (loading || user === null) return <div className="min-h-screen grid place-items-center text-muted-foreground">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (user.email_verified) return <Navigate to="/dashboard" replace />;
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
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/verify-email" element={<VerifyEmail />} />
            <Route path="/verify-email-required" element={<VerifyGate><VerifyEmailRequired /></VerifyGate>} />
            <Route path="/auth/callback" element={<AuthCallback />} />
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
            <Route path="/dashboard/subscription" element={<Protected><Subscription /></Protected>} />
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

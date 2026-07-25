import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mail, Send, LogOut, Brain } from "lucide-react";
import { toast } from "sonner";

/**
 * Hard-lock landing page shown by <VerifiedRoute> when the parent hasn't
 * verified their email yet. Parents can resend the verification email or log out.
 */
export default function VerifyEmailRequired() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const resend = async () => {
    setSending(true);
    try {
      await api.post("/auth/send-verification", { email: user?.email });
      setSent(true);
      toast.success("Verification email sent — check your inbox!");
    } catch (e) {
      toast.error(e.response?.data?.detail || "Could not send email");
    } finally { setSending(false); }
  };

  const onLogout = async () => { await logout(); navigate("/login"); };

  return (
    <div className="min-h-screen relative flex items-center justify-center px-4 py-14 overflow-hidden">
      <div className="floating-blob bg-orange-400/40 w-80 h-80 -top-10 -right-16"></div>
      <div className="floating-blob bg-yellow-300/40 w-72 h-72 bottom-0 -left-10"></div>

      <Card className="glass-card rounded-3xl p-8 sm:p-10 border-0 max-w-md w-full relative animate-pop" data-testid="verify-required-card">
        <div className="w-14 h-14 rounded-3xl grid place-items-center bg-gradient-to-br from-orange-500 to-red-500">
          <Mail className="w-7 h-7 text-white" strokeWidth={2.5} />
        </div>
        <h1 className="mt-4 text-2xl sm:text-3xl font-display font-black">Verify your email to continue</h1>
        <p className="text-sm text-muted-foreground mt-2">
          We sent a verification link to <span className="font-black text-foreground">{user?.email}</span>.
          Click the link in that email to unlock your dashboard, assessments, and games.
        </p>
        <p className="text-xs text-muted-foreground mt-3">
          Didn't get it? Check spam, or press "Resend" below.
        </p>

        <div className="mt-6 flex flex-col gap-2">
          <Button onClick={resend} disabled={sending || sent} data-testid="resend-verify-btn"
            className="pill-btn h-12 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-black">
            <Send className="w-4 h-4 mr-2" />
            {sent ? "Sent — check inbox" : sending ? "Sending…" : "Resend verification email"}
          </Button>
          <Button variant="outline" onClick={onLogout} className="pill-btn h-11 font-bold" data-testid="verify-logout-btn">
            <LogOut className="w-4 h-4 mr-2" /> Log out
          </Button>
        </div>
        <div className="mt-6 border-t pt-4 flex items-center gap-2 text-xs text-muted-foreground">
          <Brain className="w-4 h-4" /> Google-signed-in accounts are auto-verified.
        </div>
      </Card>
    </div>
  );
}

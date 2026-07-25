import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Loader2, Brain } from "lucide-react";

export default function VerifyEmail() {
  const [sp] = useSearchParams();
  const token = sp.get("token") || "";
  const navigate = useNavigate();
  const { refresh } = useAuth();
  const [state, setState] = useState("loading"); // loading|success|error
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) { setState("error"); setMessage("No verification token in the URL."); return; }
    (async () => {
      try {
        const { data } = await api.get(`/auth/verify-email/${encodeURIComponent(token)}`);
        setState("success");
        setMessage(`Email verified: ${data.email}`);
        try { await refresh(); } catch {}
        setTimeout(() => navigate("/dashboard", { replace: true }), 1800);
      } catch (e) {
        setState("error");
        setMessage(e.response?.data?.detail || "Verification failed");
      }
    })();
  }, [token, refresh, navigate]);

  return (
    <div className="min-h-screen relative flex items-center justify-center px-4 py-14 overflow-hidden">
      <div className="floating-blob bg-blue-400/40 w-80 h-80 -top-10 -left-16"></div>
      <div className="floating-blob bg-pink-400/40 w-72 h-72 bottom-0 -right-10"></div>

      <Card className="glass-card rounded-3xl p-10 border-0 max-w-md w-full text-center relative animate-pop" data-testid="verify-card">
        <div className="w-14 h-14 rounded-3xl mx-auto grid place-items-center bg-gradient-to-br from-blue-500 to-purple-600">
          <Brain className="w-7 h-7 text-white" strokeWidth={2.5} />
        </div>
        {state === "loading" && (
          <>
            <Loader2 className="w-8 h-8 animate-spin mx-auto mt-6 text-primary" data-testid="verify-loading" />
            <p className="mt-3 font-bold">Verifying your email…</p>
          </>
        )}
        {state === "success" && (
          <>
            <CheckCircle2 className="w-14 h-14 mx-auto mt-6 text-emerald-500" data-testid="verify-success" />
            <h2 className="text-2xl font-display font-black mt-3">All set!</h2>
            <p className="text-muted-foreground text-sm mt-1">{message}</p>
            <p className="text-xs text-muted-foreground mt-3">Redirecting you to the dashboard…</p>
          </>
        )}
        {state === "error" && (
          <>
            <XCircle className="w-14 h-14 mx-auto mt-6 text-rose-500" data-testid="verify-error" />
            <h2 className="text-2xl font-display font-black mt-3">Verification failed</h2>
            <p className="text-muted-foreground text-sm mt-1">{message}</p>
            <div className="mt-5 flex gap-2 justify-center">
              <Link to="/verify-email-required"><Button variant="outline" className="pill-btn font-bold" data-testid="verify-resend-link">Resend email</Button></Link>
              <Link to="/login"><Button className="pill-btn bg-gradient-to-r from-blue-500 to-purple-600 text-white font-black">Back to login</Button></Link>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}

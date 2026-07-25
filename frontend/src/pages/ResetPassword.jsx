import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Brain, Lock, ArrowLeft, CheckCircle2, AlertTriangle } from "lucide-react";

export default function ResetPassword() {
  const [sp] = useSearchParams();
  const navigate = useNavigate();
  const token = sp.get("token") || "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    if (password !== confirm) { setError("Passwords do not match."); return; }
    setLoading(true);
    try {
      await api.post("/auth/reset-password", { token, password });
      setDone(true);
      setTimeout(() => navigate("/login"), 2200);
    } catch (e) {
      setError(e.response?.data?.detail || "Could not reset password");
    } finally { setLoading(false); }
  };

  const noToken = !token;
  return (
    <div className="min-h-screen relative flex items-center justify-center px-4 py-14 overflow-hidden">
      <div className="floating-blob bg-blue-400/40 w-80 h-80 -top-10 -left-16"></div>
      <div className="floating-blob bg-pink-400/40 w-72 h-72 bottom-0 -right-10"></div>

      <div className="w-full max-w-md relative animate-pop">
        <Link to="/login" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4" data-testid="rp-back-link">
          <ArrowLeft className="w-4 h-4" /> Back to login
        </Link>
        <Card className="glass-card rounded-3xl p-8 border-0">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 grid place-items-center">
            <Brain className="w-6 h-6 text-white" strokeWidth={2.5} />
          </div>
          <h1 className="mt-3 text-2xl sm:text-3xl font-display font-black">Set a new password</h1>

          {noToken ? (
            <div className="mt-5 rounded-2xl bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-900 p-4 flex items-start gap-3" data-testid="rp-no-token">
              <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-black">Missing reset token</p>
                <p className="text-muted-foreground">Please use the link from your reset email.</p>
              </div>
            </div>
          ) : done ? (
            <div className="mt-6 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-900 p-4 flex items-start gap-3" data-testid="rp-success">
              <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-black">Password updated</p>
                <p className="text-muted-foreground">Redirecting you to login…</p>
              </div>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="mt-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password" className="font-bold">New password</Label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 8 characters" className="pl-10 h-12 rounded-2xl" data-testid="rp-password-input" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm" className="font-bold">Confirm password</Label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input id="confirm" type="password" required value={confirm} onChange={(e) => setConfirm(e.target.value)}
                    placeholder="Retype the password" className="pl-10 h-12 rounded-2xl" data-testid="rp-confirm-input" />
                </div>
              </div>
              {error && <p className="text-sm font-semibold text-destructive" data-testid="rp-error">{error}</p>}
              <Button type="submit" disabled={loading} data-testid="rp-submit-btn"
                className="pill-btn w-full h-12 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-black">
                {loading ? "Updating…" : "Update password"}
              </Button>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
}

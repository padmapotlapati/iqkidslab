import { useState } from "react";
import { Link } from "react-router-dom";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Brain, Mail, ArrowLeft, CheckCircle2 } from "lucide-react";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post("/auth/forgot-password", { email });
      setSent(true);
    } catch {
      setSent(true); // deliberately identical UX to avoid enumeration
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center px-4 py-14 overflow-hidden">
      <div className="floating-blob bg-blue-400/40 w-80 h-80 -top-10 -left-16"></div>
      <div className="floating-blob bg-pink-400/40 w-72 h-72 bottom-0 -right-10"></div>

      <div className="w-full max-w-md relative animate-pop">
        <Link to="/login" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4" data-testid="fp-back-link">
          <ArrowLeft className="w-4 h-4" /> Back to login
        </Link>
        <Card className="glass-card rounded-3xl p-8 border-0">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 grid place-items-center">
            <Brain className="w-6 h-6 text-white" strokeWidth={2.5} />
          </div>
          <h1 className="mt-3 text-2xl sm:text-3xl font-display font-black">Forgot password?</h1>
          <p className="text-sm text-muted-foreground mt-1">Enter your email and we'll send you a reset link. The link expires in 1 hour.</p>

          {sent ? (
            <div className="mt-6 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-900 p-4 flex items-start gap-3" data-testid="fp-sent">
              <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-black">Check your inbox</p>
                <p className="text-muted-foreground">If <span className="font-bold">{email}</span> is registered with us, we've sent a password reset link. It expires in 1 hour.</p>
              </div>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="mt-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="font-bold">Email</Label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com" className="pl-10 h-12 rounded-2xl" data-testid="fp-email-input" />
                </div>
              </div>
              <Button type="submit" disabled={loading} data-testid="fp-submit-btn"
                className="pill-btn w-full h-12 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-black">
                {loading ? "Sending…" : "Send reset link"}
              </Button>
            </form>
          )}
          <p className="text-sm text-center mt-5 text-muted-foreground">
            Remembered it?{" "}
            <Link to="/login" className="text-primary font-bold hover:underline" data-testid="fp-to-login-link">Log in</Link>
          </p>
        </Card>
      </div>
    </div>
  );
}

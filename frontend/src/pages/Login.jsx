import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Brain, Mail, Lock, LogIn } from "lucide-react";
import { toast } from "sonner";
import GoogleSignInButton from "@/components/GoogleSignInButton";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await login(email, password);
    setLoading(false);
    if (res.ok) {
      toast.success(`Welcome back, ${res.user.name?.split(" ")[0]}!`);
      navigate("/dashboard");
    } else {
      setError(res.error);
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center px-4 py-14 overflow-hidden">
      <div className="floating-blob bg-blue-400/40 w-80 h-80 -top-10 -left-16"></div>
      <div className="floating-blob bg-pink-400/40 w-72 h-72 bottom-0 -right-10"></div>
      <div className="floating-blob bg-yellow-300/40 w-60 h-60 top-1/2 left-1/2"></div>

      <div className="w-full max-w-md relative animate-pop">
        <Link to="/" className="flex items-center gap-2 justify-center mb-8" data-testid="login-brand-link">
          <div className="w-11 h-11 rounded-2xl grid place-items-center bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500">
            <Brain className="w-5 h-5 text-white" strokeWidth={2.5} />
          </div>
          <span className="font-display font-black text-xl">Kids IQ Test</span>
        </Link>
        <Card className="glass-card rounded-3xl p-8 border-0">
          <h1 className="text-2xl sm:text-3xl font-display font-black">Welcome back!</h1>
          <p className="text-sm text-muted-foreground mt-1">Log in to your parent dashboard.</p>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="font-bold">Email</Label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com" className="pl-10 h-12 rounded-2xl" data-testid="login-email-input" />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="font-bold">Password</Label>
                <Link to="/forgot-password" className="text-xs font-bold text-primary hover:underline" data-testid="link-to-forgot-password">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••" className="pl-10 h-12 rounded-2xl" data-testid="login-password-input" />
              </div>
            </div>
            {error && (
              <p className="text-sm font-semibold text-destructive" data-testid="login-error">{error}</p>
            )}
            <Button type="submit" disabled={loading} data-testid="login-submit-btn"
              className="pill-btn w-full h-12 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-black">
              {loading ? "Logging in..." : (<><LogIn className="w-4 h-4 mr-2" /> Log in</>)}
            </Button>
          </form>

          <div className="my-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-border"></div>
            <span className="text-xs font-bold uppercase text-muted-foreground tracking-widest">or</span>
            <div className="h-px flex-1 bg-border"></div>
          </div>
          <GoogleSignInButton testid="login-google-btn" />

          <p className="text-sm text-center mt-5 text-muted-foreground">
            No account yet?{" "}
            <Link to="/register" className="text-primary font-bold hover:underline" data-testid="link-to-register">Create one</Link>
          </p>
        </Card>
      </div>
    </div>
  );
}

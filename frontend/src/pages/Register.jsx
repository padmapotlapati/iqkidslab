import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Brain, Mail, Lock, User, Sparkles } from "lucide-react";
import { toast } from "sonner";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
    setLoading(true);
    const res = await register(name, email, password);
    setLoading(false);
    if (res.ok) {
      toast.success("Account created — let's create your first child profile!");
      navigate("/dashboard/child/new");
    } else {
      setError(res.error);
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center px-4 py-14 overflow-hidden">
      <div className="floating-blob bg-purple-400/40 w-80 h-80 -top-10 -right-16"></div>
      <div className="floating-blob bg-orange-400/40 w-72 h-72 bottom-0 -left-10"></div>

      <div className="w-full max-w-md relative animate-pop">
        <Link to="/" className="flex items-center gap-2 justify-center mb-8" data-testid="register-brand-link">
          <div className="w-11 h-11 rounded-2xl grid place-items-center bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500">
            <Brain className="w-5 h-5 text-white" strokeWidth={2.5} />
          </div>
          <span className="font-display font-black text-xl">Kids IQ Test</span>
        </Link>
        <Card className="glass-card rounded-3xl p-8 border-0">
          <h1 className="text-2xl sm:text-3xl font-display font-black">Create your account</h1>
          <p className="text-sm text-muted-foreground mt-1">It&apos;s free — start in seconds.</p>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="font-bold">Parent name</Label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input id="name" required value={name} onChange={(e) => setName(e.target.value)}
                  placeholder="Alex Parent" className="pl-10 h-12 rounded-2xl" data-testid="register-name-input" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="font-bold">Email</Label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com" className="pl-10 h-12 rounded-2xl" data-testid="register-email-input" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="font-bold">Password</Label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters" className="pl-10 h-12 rounded-2xl" data-testid="register-password-input" />
              </div>
            </div>
            {error && (<p className="text-sm font-semibold text-destructive" data-testid="register-error">{error}</p>)}
            <Button type="submit" disabled={loading} data-testid="register-submit-btn"
              className="pill-btn w-full h-12 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-black">
              {loading ? "Creating..." : (<><Sparkles className="w-4 h-4 mr-2" /> Create account</>)}
            </Button>
          </form>
          <p className="text-sm text-center mt-5 text-muted-foreground">
            Already have an account?{" "}
            <Link to="/login" className="text-primary font-bold hover:underline" data-testid="link-to-login">Log in</Link>
          </p>
        </Card>
      </div>
    </div>
  );
}

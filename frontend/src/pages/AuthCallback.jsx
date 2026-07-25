import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/api";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

/**
 * Handles the Emergent Google Auth redirect.
 * Emergent sends the user back with #session_id=... in the URL fragment.
 * We exchange it for a session_token cookie via /api/auth/google/session.
 */
export default function AuthCallback() {
  const navigate = useNavigate();
  const { refresh } = useAuth();
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      const hash = window.location.hash || "";
      // Format: #session_id=XYZ
      const match = hash.match(/session_id=([^&]+)/);
      if (!match) {
        setError("No session id from Google");
        return;
      }
      try {
        const { data } = await api.post("/auth/google/session", { session_id: match[1] });
        // Clear hash + refresh user
        window.history.replaceState(null, "", "/dashboard");
        await refresh();
        toast.success(`Welcome, ${data.name?.split(" ")[0] || "friend"}!`);
        navigate("/dashboard", { replace: true });
      } catch (e) {
        setError(e.response?.data?.detail || "Google sign-in failed");
      }
    })();
  }, [navigate, refresh]);

  return (
    <div className="min-h-screen grid place-items-center px-4">
      <div className="text-center max-w-md" data-testid="auth-callback">
        {error ? (
          <>
            <p className="text-lg font-black text-destructive">Sign-in failed</p>
            <p className="text-sm text-muted-foreground mt-2">{error}</p>
            <button onClick={() => navigate("/login")} className="mt-4 pill-btn h-11 px-6 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-black rounded-full" data-testid="callback-back-btn">
              Back to login
            </button>
          </>
        ) : (
          <>
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
            <p className="mt-3 font-bold">Signing you in with Google…</p>
          </>
        )}
      </div>
    </div>
  );
}

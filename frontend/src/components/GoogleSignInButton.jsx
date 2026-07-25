/**
 * Google Sign-In button that redirects to Emergent-managed Google Auth.
 * Emergent will bounce back to /auth/callback#session_id=... on success.
 */
export default function GoogleSignInButton({ label = "Continue with Google", testid = "google-signin-btn" }) {
  const start = () => {
    const redirectUrl = `${window.location.origin}/auth/callback`;
    // Emergent Auth entrypoint (per playbook)
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };
  return (
    <button
      type="button"
      onClick={start}
      data-testid={testid}
      className="pill-btn w-full h-12 rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 font-black text-slate-800 dark:text-slate-100 flex items-center justify-center gap-3 transition-colors"
    >
      <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
        <path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.44c-.28 1.4-1.09 2.6-2.32 3.4v2.83h3.75c2.19-2.02 3.62-5.02 3.62-8.47z"/>
        <path fill="#34A853" d="M12 24c3.24 0 5.96-1.08 7.94-2.9l-3.75-2.83c-1.05.7-2.38 1.13-4.19 1.13-3.22 0-5.96-2.17-6.94-5.09H1.19v3.19C3.15 21.36 7.24 24 12 24z"/>
        <path fill="#FBBC05" d="M5.06 14.31c-.25-.7-.38-1.44-.38-2.31s.14-1.61.38-2.31V6.5H1.19C.42 8.14 0 10.02 0 12s.42 3.86 1.19 5.5l3.87-3.19z"/>
        <path fill="#EA4335" d="M12 4.76c1.77 0 3.35.61 4.6 1.8l3.4-3.4C17.95 1.17 15.24 0 12 0 7.24 0 3.15 2.64 1.19 6.5l3.87 3.19C6.04 6.93 8.78 4.76 12 4.76z"/>
      </svg>
      {label}
    </button>
  );
}

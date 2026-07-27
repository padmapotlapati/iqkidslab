import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/api";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Play, Award, Users, Sparkles, TrendingUp, ChevronRight, Coins, Zap, Trash2, Crown, Copy, Gift } from "lucide-react";
import { toast } from "sonner";

const AGE_COLORS = {
  "3-5": "from-pink-400 to-orange-400",
  "6-8": "from-blue-400 to-cyan-400",
  "9-12": "from-purple-500 to-fuchsia-500",
  "13-16": "from-emerald-400 to-teal-500",
};

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [children, setChildren] = useState([]);
  const [stats, setStats] = useState({ total_children: 0, total_assessments: 0, recent_assessments: [] });
  const [loading, setLoading] = useState(true);
  const [referral, setReferral] = useState(null);
  const [streaks, setStreaks] = useState({}); // childId -> streak data

  useEffect(() => {
    (async () => {
      try {
        const [c, s, r] = await Promise.all([api.get("/children"), api.get("/dashboard/stats"), api.get("/referrals/me")]);
        setChildren(c.data);
        setStats(s.data);
        setReferral(r.data);
        // Load streaks for each child
        const streakData = {};
        await Promise.all(c.data.map(async (child) => {
          try {
            const { data } = await api.get(`/streak/${child.id}`);
            streakData[child.id] = data;
          } catch {}
        }));
        setStreaks(streakData);
      } catch { toast.error("Could not load dashboard."); }
      setLoading(false);
    })();
  }, []);

  const startAssessment = (child) => navigate(`/dashboard/child/${child.id}/assessment`);

  const deleteChild = async (id, name) => {
    if (!window.confirm(`Delete ${name}'s profile?`)) return;
    await api.delete(`/children/${id}`);
    setChildren(children.filter(c => c.id !== id));
    toast.success("Profile removed.");
  };

  return (
    <div className="min-h-screen relative">
      <Navbar />
      <div className="floating-blob bg-blue-400/30 w-72 h-72 -top-10 -left-16"></div>
      <div className="floating-blob bg-purple-400/30 w-72 h-72 top-32 -right-16"></div>

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 relative">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Parent Dashboard</p>
            <h1 className="text-3xl sm:text-5xl font-display font-black tracking-tight mt-1" data-testid="dashboard-heading">
              Welcome, {user?.name?.split(" ")[0]}!
            </h1>
            <p className="text-muted-foreground mt-1">Here&apos;s how your family is exploring brain skills.</p>
          </div>
          <Link to="/dashboard/child/new">
            <Button className="pill-btn h-12 px-6 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-black" data-testid="add-child-btn">
              <Plus className="w-4 h-4 mr-2" /> Add child
            </Button>
          </Link>
        </div>

        {/* Premium / credits banner */}
        {user?.is_premium ? (
          <div className="mt-6 rounded-3xl bg-gradient-to-r from-yellow-400 via-orange-400 to-pink-500 p-5 text-slate-900 lift-shadow flex items-center gap-4" data-testid="premium-banner">
            <Crown className="w-10 h-10 shrink-0" />
            <div className="flex-1">
              <p className="font-display font-black text-lg">You&apos;re on Premium</p>
              <p className="text-xs font-bold opacity-80">Unlimited assessments, AI reports & certificates. Expires {user.premium_expires_at ? new Date(user.premium_expires_at).toLocaleDateString() : "—"}.</p>
            </div>
          </div>
        ) : (user?.assessment_credits > 0) ? (
          <div className="mt-6 rounded-3xl glass-card p-5 flex items-center gap-4" data-testid="credits-banner">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-orange-400 to-red-500 grid place-items-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <p className="font-display font-black text-lg">{user.assessment_credits} assessment credits</p>
              <p className="text-xs text-muted-foreground">Use these on premium AI reports & certificates.</p>
            </div>
            <Link to="/pricing"><Button variant="outline" className="pill-btn font-bold" data-testid="banner-upgrade-btn">Get more</Button></Link>
          </div>
        ) : (
          <div className="mt-6 rounded-3xl bg-gradient-to-r from-blue-600 via-purple-600 to-pink-500 p-5 text-white lift-shadow flex items-center gap-4" data-testid="upgrade-banner">
            <Sparkles className="w-10 h-10 shrink-0" />
            <div className="flex-1">
              <p className="font-display font-black text-lg">Unlock unlimited AI reports & certificates</p>
              <p className="text-xs opacity-90">Try Premium at ₹99/month or grab a Pay-per-test from just ₹9.</p>
            </div>
            <Link to="/pricing"><Button className="pill-btn bg-white text-slate-900 hover:bg-white/90 font-black" data-testid="upgrade-cta-btn">See plans</Button></Link>
          </div>
        )}

        {/* Phonics Fun CTA — visible from the Home Dashboard */}
        {children.length > 0 && (
          <div className="mt-8 rounded-3xl p-6 bg-gradient-to-r from-yellow-300 via-orange-300 to-pink-300 text-slate-900 lift-shadow" data-testid="phonics-dashboard-cta">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-3xl bg-white/80 grid place-items-center backdrop-blur shadow-inner">
                  <span className="font-display font-black text-orange-500 text-2xl leading-none">Aa</span>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-70">Learn • Play • Smile</p>
                  <p className="font-display font-black text-xl leading-tight">Phonics Fun!</p>
                  <p className="text-xs opacity-80 mt-0.5">Listen, tap, and speak your ABC sounds — collect stars &amp; badges.</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {children.slice(0, 3).map(c => (
                  <Link key={c.id} to={`/dashboard/phonics/${c.id}`}>
                    <Button className="pill-btn bg-white text-orange-700 hover:bg-white/90 font-black" data-testid={`phonics-open-${c.id}`}>
                      Open for {c.name}
                    </Button>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Daily Rewards CTA */}
        {children.length > 0 && (
          <div className="mt-8 rounded-3xl p-6 bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 text-white lift-shadow flex flex-col sm:flex-row items-center justify-between gap-4" data-testid="rewards-cta-banner">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-3xl bg-white/20 grid place-items-center backdrop-blur">
                <Gift className="w-7 h-7 text-white" />
              </div>
              <div>
                <p className="font-display font-black text-xl">Daily rewards, streaks & mystery boxes</p>
                <p className="text-xs text-white/90">Play the 5-minute Daily Brain Challenge and claim today&apos;s bonus.</p>
              </div>
            </div>
            <Link to="/dashboard/rewards"><Button className="pill-btn bg-white text-orange-700 hover:bg-white/90 font-black" data-testid="dashboard-rewards-btn">
              <Sparkles className="w-4 h-4 mr-2" /> Open rewards
            </Button></Link>
          </div>
        )}
        {/* STATS */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
          <StatCard icon={Users} label="Children" value={stats.total_children} color="from-blue-500 to-cyan-500" testid="stat-children" />
          <StatCard icon={Award} label="Assessments" value={stats.total_assessments} color="from-purple-500 to-pink-500" testid="stat-assessments" />
          <StatCard icon={Zap} label="Total XP" value={user?.xp || 0} color="from-orange-500 to-red-500" testid="stat-xp" />
          <StatCard icon={Coins} label="Coins" value={user?.coins || 0} color="from-yellow-400 to-orange-400" testid="stat-coins" />
        </div>

        {/* CHILDREN */}
        <section className="mt-12">
          <h2 className="text-2xl font-display font-black tracking-tight">Children Profiles</h2>
          {loading ? (
            <div className="mt-4 text-muted-foreground">Loading...</div>
          ) : children.length === 0 ? (
            <Card className="mt-4 glass-card rounded-3xl border-0 p-10 text-center">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-blue-500 to-purple-500 grid place-items-center">
                <Sparkles className="w-7 h-7 text-white" />
              </div>
              <h3 className="mt-4 text-xl font-display font-black">No children yet</h3>
              <p className="text-muted-foreground text-sm mt-1">Add your first child profile to begin the brain-skills journey.</p>
              <Link to="/dashboard/child/new"><Button className="mt-5 pill-btn bg-gradient-to-r from-blue-500 to-purple-600 text-white font-black" data-testid="empty-add-child-btn">Add first child</Button></Link>
            </Card>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-4">
              {children.map(c => (
                <Card key={c.id} data-testid={`child-card-${c.id}`}
                  className="relative overflow-hidden rounded-3xl border-0 lift-shadow p-6 bg-card hover:-translate-y-1 transition-transform">
                  <div className={`absolute inset-x-0 top-0 h-24 bg-gradient-to-r ${AGE_COLORS[c.age_group]} opacity-90`}></div>
                  <div className="relative">
                    <div className="w-20 h-20 rounded-2xl bg-white dark:bg-card border-4 border-white dark:border-card shadow-lg grid place-items-center text-3xl font-display font-black text-slate-800">
                      {c.name?.[0]?.toUpperCase()}
                    </div>
                    <div className="mt-3 flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-display font-black text-lg">{c.name}</h3>
                        <p className="text-xs text-muted-foreground">Age {c.age} · {c.grade || "—"}</p>
                      </div>
                      <Button size="icon" variant="ghost" onClick={() => deleteChild(c.id, c.name)} data-testid={`delete-child-${c.id}`} className="rounded-full text-muted-foreground hover:text-destructive">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="flex items-center gap-2 mt-3 flex-wrap">
                      <Badge variant="secondary" className="rounded-full"><Zap className="w-3 h-3 mr-1" /> {c.xp || 0} XP</Badge>
                      <Badge variant="secondary" className="rounded-full">⭐ {c.stars || 0}</Badge>
                      {streaks[c.id]?.current_streak > 0 && (
                        <Badge className="rounded-full bg-orange-100 text-orange-800 hover:bg-orange-100 border-0 font-bold" data-testid={`streak-${c.id}`}>
                          🔥 {streaks[c.id].current_streak}d
                        </Badge>
                      )}
                      {(c.badges || []).length > 0 && (
                        <Badge className="rounded-full bg-yellow-400 text-yellow-900 hover:bg-yellow-400">{c.badges.length} badges</Badge>
                      )}
                    </div>
                    <div className="mt-5 flex gap-2">
                      <Button className="pill-btn flex-1 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-black" onClick={() => startAssessment(c)} data-testid={`start-assessment-${c.id}`}>
                        <Play className="w-4 h-4 mr-1.5" /> Start
                      </Button>
                      <Button variant="outline" className="pill-btn font-bold" onClick={() => navigate(`/dashboard/child/${c.id}`)} data-testid={`view-child-${c.id}`}>
                        View
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </section>

        {/* RECENT ASSESSMENTS */}
        <section className="mt-12">
          <h2 className="text-2xl font-display font-black tracking-tight">Recent assessments</h2>          {stats.recent_assessments.length === 0 ? (
            <p className="mt-3 text-muted-foreground text-sm">No assessments yet. Start one to see progress here.</p>
          ) : (
            <div className="grid md:grid-cols-2 gap-4 mt-4">
              {stats.recent_assessments.map(a => (
                <Card key={a.id} data-testid={`recent-assessment-${a.id}`}
                  onClick={() => navigate(`/dashboard/report/${a.id}`)}
                  className="glass-card rounded-3xl border-0 p-5 cursor-pointer hover:-translate-y-1 transition-transform">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold uppercase text-muted-foreground">Age group {a.age_group}</p>
                      <p className="mt-1 font-display font-black text-xl">{a.total_correct} / {a.total_questions} correct</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{new Date(a.created_at).toLocaleDateString()}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-display font-black brand-gradient-text">{a.percentage}%</div>
                      <div className="flex items-center gap-1 justify-end mt-1 text-xs font-bold text-emerald-500"><TrendingUp className="w-3 h-3" /> +{a.xp_earned} XP</div>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-1 text-xs font-bold text-primary">View report <ChevronRight className="w-3 h-3" /></div>
                </Card>
              ))}
            </div>
          )}
        </section>

        {/* REFERRAL WIDGET */}
        {referral && (
          <section className="mt-12" data-testid="referral-widget">
            <Card className="glass-card rounded-3xl border-0 p-6 flex flex-col md:flex-row items-start md:items-center gap-5 relative overflow-hidden">
              <div className="floating-blob bg-emerald-400/30 w-40 h-40 -top-10 -right-10"></div>
              <div className="w-14 h-14 rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-500 grid place-items-center shrink-0">
                <Gift className="w-7 h-7 text-white" />
              </div>
              <div className="flex-1 relative">
                <h3 className="font-display font-black text-lg">Share & earn</h3>
                <p className="text-sm text-muted-foreground">Share your referral code — you and your friend BOTH get 3 free assessments after they buy.</p>
                <div className="mt-3 flex items-center gap-2">
                  <code className="text-lg font-black tracking-widest bg-muted rounded-2xl px-4 py-2" data-testid="referral-code">{referral.code}</code>
                  <Button size="icon" variant="ghost" onClick={() => { navigator.clipboard.writeText(referral.code); toast.success("Copied!"); }} data-testid="copy-referral-btn" className="rounded-full">
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  <span className="font-bold">Signups:</span> {referral.referred_signups}
                  <span className="ml-4 font-bold">Rewarded:</span> {referral.rewarded_purchases}
                </p>
              </div>
            </Card>
          </section>
        )}
      </main>
      <Footer />
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color, testid }) {
  return (
    <Card className="glass-card rounded-3xl border-0 p-5" data-testid={testid}>
      <div className={`w-11 h-11 rounded-2xl grid place-items-center bg-gradient-to-br ${color} shadow-md`}>
        <Icon className="w-5 h-5 text-white" strokeWidth={2.5} />
      </div>
      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mt-3">{label}</p>
      <p className="text-3xl font-display font-black">{value}</p>
    </Card>
  );
}

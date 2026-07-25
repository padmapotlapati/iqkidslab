import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import api from "@/lib/api";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Play, Zap, Star, Award, ChevronLeft, ChevronRight, TrendingUp, Coins, Flame,
  Sparkles, Target, Trophy, Gift, Gamepad2, Brain, Rocket, Puzzle, Shapes, BookOpen,
  Timer, Calculator,
} from "lucide-react";
import { toast } from "sonner";

const GAME_ICONS = {
  brain: Brain, zap: Zap, shapes: Shapes, target: Target, calculator: Calculator,
  book: BookOpen, puzzle: Puzzle,
};

const CAT_LABELS = {
  memory: "Memory", logical_reasoning: "Logic", pattern_recognition: "Pattern",
  visual_intelligence: "Visual", attention: "Attention", processing_speed: "Speed",
  problem_solving: "Problem Solving", mathematical_thinking: "Math",
  language_skills: "Language", creativity: "Creativity",
};

export default function ChildProfile() {
  const { childId } = useParams();
  const navigate = useNavigate();

  const [child, setChild] = useState(null);
  const [assessments, setAssessments] = useState([]);
  const [level, setLevel] = useState(null);
  const [streak, setStreak] = useState(null);
  const [missions, setMissions] = useState([]);
  const [inProgress, setInProgress] = useState(null);
  const [games, setGames] = useState([]);
  const [progress, setProgress] = useState(null);
  const [dailyStatus, setDailyStatus] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const c = await api.get(`/children/${childId}`);
        setChild(c.data);
        const ag = c.data.age_group;

        const [a, lvl, st, ms, ip, gm, pr, ds] = await Promise.all([
          api.get(`/assessments/child/${childId}`),
          api.get(`/progress/level/${childId}`).catch(() => ({ data: null })),
          api.get(`/streak/${childId}`).catch(() => ({ data: null })),
          api.get(`/missions/${childId}`).catch(() => ({ data: [] })),
          api.get(`/sessions/in-progress/${childId}`).catch(() => ({ data: { in_progress: false } })),
          api.get(`/games?age_group=${encodeURIComponent(ag)}`).catch(() => ({ data: [] })),
          api.get(`/progress/${childId}`).catch(() => ({ data: null })),
          api.get(`/rewards/daily-status/${childId}`).catch(() => ({ data: null })),
        ]);
        setAssessments(a.data);
        setLevel(lvl.data);
        setStreak(st.data);
        // /missions/{id} returns {weekly:[], monthly:[], ...}; flatten & take top 3
        const _m = ms.data || {};
        const _all = Array.isArray(_m) ? _m : [...(_m.weekly || []), ...(_m.monthly || [])];
        setMissions(_all.slice(0, 3));
        setInProgress(ip.data?.in_progress ? ip.data : null);
        setGames(gm.data || []);
        setProgress(pr.data);
        setDailyStatus(ds.data);
      } catch (e) {
        console.error("ChildProfile load failed:", e);
        navigate("/dashboard");
      }
    })();
  }, [childId, navigate]);

  const claimDaily = async () => {
    try {
      const { data } = await api.post("/rewards/claim-daily", { child_id: childId });
      toast.success(`+${data.xp_awarded} XP, +${data.coins_awarded} coins!`);
      const ds = await api.get(`/rewards/daily-status/${childId}`).catch(() => ({ data: null }));
      setDailyStatus(ds.data);
      const c = await api.get(`/children/${childId}`);
      setChild(c.data);
    } catch (e) {
      toast.error(e.response?.data?.detail || "Could not claim today's reward");
    }
  };

  if (!child) return <div className="min-h-screen"><Navbar /><div className="text-center mt-40 text-muted-foreground">Loading...</div></div>;

  const featuredGames = games.slice(0, 5);
  const topSkill = progress?.strengths?.[0];
  const growthSkill = progress?.growth_areas?.[0];
  const canClaimDaily = dailyStatus?.can_claim;

  return (
    <div className="min-h-screen relative overflow-hidden">
      <Navbar />
      <div className="floating-blob bg-blue-400/30 w-80 h-80 -top-10 -left-16"></div>
      <div className="floating-blob bg-purple-400/30 w-72 h-72 bottom-0 -right-10"></div>

      <main className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8 relative">
        <button onClick={() => navigate("/dashboard")} className="text-sm font-bold text-muted-foreground hover:text-foreground flex items-center gap-1 mb-4" data-testid="child-back-btn">
          <ChevronLeft className="w-4 h-4" /> Back
        </button>

        {/* ===== 1. Welcome Message ===== */}
        <Card className="glass-card rounded-[2rem] border-0 p-6 sm:p-8" data-testid="child-welcome">
          <div className="flex flex-col sm:flex-row items-start gap-5">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-gradient-to-br from-pink-400 via-purple-500 to-blue-500 grid place-items-center text-3xl sm:text-4xl font-display font-black text-white shadow-xl">
              {child.name?.[0]?.toUpperCase()}
            </div>
            <div className="flex-1">
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Child Dashboard</p>
              <h1 className="text-3xl sm:text-4xl font-display font-black" data-testid="child-name-heading">
                Hi {child.name}!  <span className="inline-block animate-wave">👋</span>
              </h1>
              <p className="text-muted-foreground text-sm mt-1">
                Age {child.age} · Age group {child.age_group}{child.grade ? ` · ${child.grade}` : ""}
              </p>
            </div>
          </div>
        </Card>

        {/* ===== 2. Level, XP, Coins, Streak ===== */}
        <section className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-3" data-testid="child-stats">
          <StatTile icon={Rocket} label="Level" value={level?.level ?? 1} sub={level?.tier || "Curious Sprout"} color="from-blue-500 to-cyan-500" testid="stat-level" />
          <StatTile icon={Zap} label="XP" value={child.xp ?? 0} sub={level ? `Next: ${level.xp_to_next}` : ""} color="from-orange-500 to-red-500" testid="stat-xp" />
          <StatTile icon={Coins} label="Coins" value={child.stars ?? 0} sub="Spend on avatars" color="from-yellow-400 to-orange-400" testid="stat-coins" />
          <StatTile icon={Flame} label="Streak" value={streak?.current_streak ?? 0} sub={`Best: ${streak?.longest_streak ?? 0}d`} color="from-pink-500 to-rose-500" testid="stat-streak" />
        </section>

        {/* ===== 3. Today's Mission ===== */}
        <section className="mt-8" data-testid="section-missions">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xl sm:text-2xl font-display font-black flex items-center gap-2">
              <Target className="w-5 h-5 text-emerald-500" /> Today's Mission
            </h2>
            <Link to="/dashboard/rewards" className="text-sm font-bold text-primary hover:underline flex items-center gap-1">
              See all <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          {missions.length === 0 ? (
            <Card className="glass-card rounded-3xl border-0 p-5" data-testid="missions-empty">
              <p className="text-sm text-muted-foreground">No missions available. Come back tomorrow!</p>
            </Card>
          ) : (
            <div className="grid sm:grid-cols-3 gap-3">
              {missions.map((m, i) => (
                <Card key={i} data-testid={`mission-card-${i}`} className="glass-card rounded-3xl border-0 p-5">
                  <div className="flex items-start gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 grid place-items-center shrink-0">
                      <Target className="w-5 h-5 text-white" strokeWidth={2.5} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-sm">{m.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{m.description}</p>
                      <div className="mt-2 h-2 rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-500" style={{ width: `${Math.min(100, (m.progress / m.target) * 100)}%` }} />
                      </div>
                      <div className="flex items-center justify-between mt-1 text-[11px] font-bold">
                        <span className="text-muted-foreground">{m.progress}/{m.target}</span>
                        <span className="text-emerald-600">+{m.xp} XP</span>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </section>

        {/* ===== 4. Continue Brain Assessment / Start New ===== */}
        <section className="mt-8" data-testid="section-continue-assessment">
          {inProgress ? (
            <Card className="rounded-3xl border-0 p-6 bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 text-white lift-shadow flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="w-14 h-14 rounded-3xl bg-white/20 grid place-items-center backdrop-blur">
                <Timer className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-bold uppercase tracking-widest text-white/90">Pick up where you left off</p>
                <p className="font-display font-black text-xl">Continue Brain Assessment</p>
                <p className="text-xs text-white/90 mt-0.5">{inProgress.total_questions} questions · started {new Date(inProgress.started_at).toLocaleDateString()}</p>
              </div>
              <Link to={`/dashboard/child/${childId}/assessment`}>
                <Button className="pill-btn bg-white text-orange-700 hover:bg-white/90 font-black" data-testid="continue-assessment-btn">
                  Continue <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </Card>
          ) : (
            <Card className="rounded-3xl border-0 p-6 bg-gradient-to-r from-blue-500 via-purple-600 to-pink-500 text-white lift-shadow flex flex-col sm:flex-row items-start sm:items-center gap-4" data-testid="start-assessment-cta">
              <div className="w-14 h-14 rounded-3xl bg-white/20 grid place-items-center backdrop-blur">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-bold uppercase tracking-widest text-white/90">Ready for a challenge?</p>
                <p className="font-display font-black text-xl">Start a new Brain Skills Assessment</p>
                <p className="text-xs text-white/90 mt-0.5">20 questions · adaptive difficulty · earn XP & coins</p>
              </div>
              <Link to={`/dashboard/child/${childId}/assessment`}>
                <Button className="pill-btn bg-white text-purple-700 hover:bg-white/90 font-black" data-testid="start-new-assessment-btn">
                  <Play className="w-4 h-4 mr-1.5" /> Start now
                </Button>
              </Link>
            </Card>
          )}
        </section>

        {/* ===== 5. Featured Brain Games ===== */}
        <section className="mt-8" data-testid="section-featured-games">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xl sm:text-2xl font-display font-black flex items-center gap-2">
              <Gamepad2 className="w-5 h-5 text-pink-500" /> Featured Brain Games
            </h2>
            <Link to="/dashboard/games" className="text-sm font-bold text-primary hover:underline flex items-center gap-1" data-testid="see-all-games-link">
              See all <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          {featuredGames.length === 0 ? (
            <Card className="glass-card rounded-3xl border-0 p-5" data-testid="games-empty">
              <p className="text-sm text-muted-foreground">Games are being prepared for your age group.</p>
            </Card>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {featuredGames.map(g => {
                const Icon = GAME_ICONS[g.icon] || Brain;
                return (
                  <Card
                    key={g.key}
                    data-testid={`featured-game-${g.key}`}
                    className={`relative overflow-hidden rounded-3xl border-0 lift-shadow p-6 text-white bg-gradient-to-br ${g.color} hover:-translate-y-1 transition-transform`}
                  >
                    <div className="floating-blob bg-white/20 w-28 h-28 -top-6 -right-6"></div>
                    <div className="relative">
                      <div className="flex items-start justify-between">
                        <div className="w-14 h-14 rounded-2xl bg-white/20 grid place-items-center backdrop-blur">
                          <Icon className="w-7 h-7 text-white" strokeWidth={2.3} />
                        </div>
                        <Badge className="rounded-full bg-white/25 backdrop-blur text-white border-0 font-bold text-xs">
                          {g.difficulty_label}
                        </Badge>
                      </div>
                      <h3 className="mt-4 font-display font-black text-xl">{g.name}</h3>
                      <p className="text-sm text-white/85 mt-1 line-clamp-2 min-h-[40px]">{g.description}</p>
                      <button
                        onClick={() => navigate(`/dashboard/games/${g.key}?child=${childId}`)}
                        data-testid={`play-now-${g.key}`}
                        className="pill-btn mt-4 w-full h-11 rounded-full font-black text-sm bg-white text-slate-900 hover:bg-white/90 flex items-center justify-center"
                      >
                        <Play className="w-4 h-4 mr-1.5" /> Play now
                      </button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </section>

        {/* ===== 6. Brain Skills Tests (assessment history) ===== */}
        <section className="mt-8" data-testid="section-brain-skills-tests">
          <h2 className="text-xl sm:text-2xl font-display font-black flex items-center gap-2 mb-3">
            <Brain className="w-5 h-5 text-blue-500" /> Brain Skills Tests
          </h2>
          {assessments.length === 0 ? (
            <Card className="glass-card rounded-3xl border-0 p-6" data-testid="tests-empty">
              <p className="text-sm text-muted-foreground">No tests completed yet — take your first one above!</p>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {assessments.slice(0, 6).map(a => (
                <Card key={a.id} onClick={() => navigate(`/dashboard/report/${a.id}`)} data-testid={`test-history-${a.id}`}
                  className="glass-card rounded-3xl border-0 p-5 cursor-pointer hover:-translate-y-1 transition-transform">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-xs font-bold uppercase text-muted-foreground">{new Date(a.created_at).toLocaleDateString()}</p>
                      <p className="mt-1 font-display font-black text-xl">{a.total_correct} / {a.total_questions}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">View full report →</p>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-display font-black brand-gradient-text">{a.overall_score ?? a.percentage}%</div>
                      <div className="text-xs font-bold text-emerald-500 flex items-center gap-1 justify-end"><TrendingUp className="w-3 h-3" /> +{a.xp_earned} XP</div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </section>

        {/* ===== 7. Achievements & Badges ===== */}
        <section className="mt-8" data-testid="section-achievements">
          <h2 className="text-xl sm:text-2xl font-display font-black flex items-center gap-2 mb-3">
            <Trophy className="w-5 h-5 text-yellow-500" /> Achievements & Badges
          </h2>
          <Card className="glass-card rounded-3xl border-0 p-6">
            {(child.badges || []).length === 0 ? (
              <p className="text-sm text-muted-foreground">No badges yet — complete assessments and play games to unlock badges!</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {child.badges.map((b) => (
                  <Badge key={b} data-testid={`badge-${b}`} className="rounded-full bg-gradient-to-r from-yellow-400 to-orange-400 text-white border-0 hover:opacity-90 font-bold px-4 py-2 text-sm">
                    <Award className="w-4 h-4 mr-1.5" /> {b.replace(/_/g, " ")}
                  </Badge>
                ))}
              </div>
            )}
          </Card>
        </section>

        {/* ===== 8. Progress Overview ===== */}
        <section className="mt-8" data-testid="section-progress-overview">
          <h2 className="text-xl sm:text-2xl font-display font-black flex items-center gap-2 mb-3">
            <TrendingUp className="w-5 h-5 text-emerald-500" /> Progress Overview
          </h2>
          {(!progress || (progress.category_progress || []).length === 0) ? (
            <Card className="glass-card rounded-3xl border-0 p-6" data-testid="progress-empty">
              <p className="text-sm text-muted-foreground">Take an assessment to see your skill map.</p>
            </Card>
          ) : (
            <Card className="glass-card rounded-3xl border-0 p-6">
              <div className="grid sm:grid-cols-3 gap-4 mb-5">
                <div>
                  <p className="text-xs font-bold uppercase text-muted-foreground">Total attempts</p>
                  <p className="text-2xl font-display font-black">{progress.total_attempts}</p>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase text-muted-foreground">Average score</p>
                  <p className="text-2xl font-display font-black">{progress.avg_overall_score ?? "—"}%</p>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase text-muted-foreground">Best score</p>
                  <p className="text-2xl font-display font-black brand-gradient-text">{progress.best_overall_score ?? "—"}%</p>
                </div>
              </div>
              <div className="space-y-2.5">
                {progress.category_progress.slice(0, 6).map(cp => (
                  <div key={cp.category} data-testid={`progress-${cp.category}`}>
                    <div className="flex justify-between text-sm font-bold">
                      <span>{CAT_LABELS[cp.category] || cp.label}</span>
                      <span className="text-muted-foreground">{cp.percentage}%</span>
                    </div>
                    <div className="h-2.5 mt-1 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-purple-600" style={{ width: `${cp.percentage}%` }} />
                    </div>
                  </div>
                ))}
              </div>
              {(topSkill || growthSkill) && (
                <div className="mt-5 grid sm:grid-cols-2 gap-3">
                  {topSkill && (
                    <div className="rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-900 p-3">
                      <p className="text-[10px] font-bold uppercase text-emerald-700 dark:text-emerald-400">Top strength</p>
                      <p className="font-black text-sm mt-0.5">{CAT_LABELS[topSkill] || topSkill}</p>
                    </div>
                  )}
                  {growthSkill && (
                    <div className="rounded-2xl bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-900 p-3">
                      <p className="text-[10px] font-bold uppercase text-orange-700 dark:text-orange-400">Focus next</p>
                      <p className="font-black text-sm mt-0.5">{CAT_LABELS[growthSkill] || growthSkill}</p>
                    </div>
                  )}
                </div>
              )}
            </Card>
          )}
        </section>

        {/* ===== 9. Daily Reward ===== */}
        <section className="mt-8 mb-4" data-testid="section-daily-reward">
          <Card className={`rounded-3xl border-0 p-6 lift-shadow ${canClaimDaily ? "bg-gradient-to-r from-yellow-400 via-orange-500 to-rose-500 text-white" : "glass-card"}`}>
            <div className="flex items-start sm:items-center gap-4 flex-col sm:flex-row">
              <div className={`w-14 h-14 rounded-3xl grid place-items-center ${canClaimDaily ? "bg-white/20 backdrop-blur" : "bg-gradient-to-br from-yellow-400 to-orange-400"}`}>
                <Gift className={`w-7 h-7 ${canClaimDaily ? "text-white" : "text-white"}`} />
              </div>
              <div className="flex-1">
                <p className={`text-xs font-bold uppercase tracking-widest ${canClaimDaily ? "text-white/90" : "text-muted-foreground"}`}>Daily Reward</p>
                <p className={`font-display font-black text-xl ${canClaimDaily ? "" : "text-foreground"}`}>
                  {canClaimDaily ? `Claim today's ${dailyStatus?.next_reward?.xp || 10} XP + 5 coins!` : "Come back tomorrow for a new reward"}
                </p>
                <p className={`text-xs mt-0.5 ${canClaimDaily ? "text-white/90" : "text-muted-foreground"}`}>
                  Day {dailyStatus?.day_in_ladder || 1} of 7-day ladder
                </p>
              </div>
              {canClaimDaily ? (
                <Button onClick={claimDaily} className="pill-btn bg-white text-orange-700 hover:bg-white/90 font-black" data-testid="claim-daily-btn">
                  <Sparkles className="w-4 h-4 mr-1.5" /> Claim now
                </Button>
              ) : (
                <Link to="/dashboard/rewards">
                  <Button variant="outline" className="pill-btn font-bold" data-testid="view-rewards-btn">
                    View rewards
                  </Button>
                </Link>
              )}
            </div>
          </Card>
        </section>
      </main>
      <Footer />
    </div>
  );
}

function StatTile({ icon: Icon, label, value, sub, color, testid }) {
  return (
    <Card className="glass-card rounded-3xl border-0 p-4" data-testid={testid}>
      <div className={`w-10 h-10 rounded-2xl bg-gradient-to-br ${color} grid place-items-center`}>
        <Icon className="w-5 h-5 text-white" strokeWidth={2.5} />
      </div>
      <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider mt-2">{label}</p>
      <p className="text-2xl font-display font-black leading-none mt-0.5">{value}</p>
      {sub && <p className="text-[11px] text-muted-foreground mt-1 truncate">{sub}</p>}
    </Card>
  );
}

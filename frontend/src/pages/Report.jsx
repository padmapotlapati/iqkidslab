import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import api, { API } from "@/lib/api";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Award, Sparkles, Zap, Star, TrendingUp, ChevronLeft, Download, Gauge, Focus,
  Lock, Crown, Gamepad2, Target, CalendarClock, HandHeart, Rocket, Play, ChevronRight,
} from "lucide-react";
import Confetti from "@/components/Confetti";
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer } from "recharts";
import { toast } from "sonner";

const CATEGORY_LABELS = {
  logical_reasoning: "Logic",
  visual_intelligence: "Visual",
  pattern_recognition: "Pattern",
  memory: "Memory",
  attention: "Attention",
  processing_speed: "Speed",
  mathematical_thinking: "Math",
  language_skills: "Language",
  creativity: "Creativity",
  problem_solving: "Problem Solving",
};

// Category → practice tip pool
const TIPS = {
  memory: "Play card-matching games and recite grocery lists to strengthen short-term recall.",
  logical_reasoning: "Solve one Sudoku or logic riddle daily — start easy and build up.",
  pattern_recognition: "Look for number and shape patterns in everyday objects (tiles, music).",
  visual_intelligence: "Try puzzle building or spot-the-difference games for 10 minutes.",
  attention: "Practice focused reading — 15-minute distraction-free sessions.",
  processing_speed: "Timed mental-math drills for 5 minutes daily boost speed.",
  problem_solving: "Try one word problem or riddle before bed to stretch reasoning.",
  mathematical_thinking: "Practice fractions/percentages using real-life examples (recipes, prices).",
  language_skills: "Read for 20 minutes daily and note 3 new words each day.",
  creativity: "Brainstorm 5 uses for a household object every morning.",
};

const PARENT_ADVICE = {
  memory: "Play memory games together and encourage retelling stories with details.",
  logical_reasoning: "Ask 'why' and 'what if' questions during casual conversations.",
  pattern_recognition: "Point out patterns in nature, music, or architecture together.",
  visual_intelligence: "Do jigsaw puzzles or drawing side-by-side.",
  attention: "Establish quiet-time routines and celebrate focused practice.",
  processing_speed: "Turn mental math into a fun daily race.",
  problem_solving: "Involve them in real-world planning (packing a trip, budget).",
  mathematical_thinking: "Cook together and use measuring/scaling as math practice.",
  language_skills: "Read aloud together and discuss the story afterwards.",
  creativity: "Encourage open-ended play with blocks or drawing.",
};

// Score → suggested wait days before re-assessment
function nextAssessmentIn(score) {
  if (score >= 80) return 14;
  if (score >= 65) return 10;
  if (score >= 50) return 7;
  return 5;
}

export default function Report() {
  const { assessmentId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [assessment, setAssessment] = useState(null);
  const [child, setChild] = useState(null);
  const [games, setGames] = useState([]);
  const [confetti, setConfetti] = useState(false);

  const isPremium = !!user?.is_premium;
  const hasCredits = (user?.assessment_credits ?? 0) > 0;
  const canAccessDetailed = isPremium || hasCredits;

  useEffect(() => {
    (async () => {
      try {
        const { data: a } = await api.get(`/assessments/${assessmentId}`);
        setAssessment(a);
        const { data: c } = await api.get(`/children/${a.child_id}`);
        setChild(c);
        if ((a.overall_score || a.percentage || 0) >= 60) setConfetti(true);
        // Load age-appropriate games for recommendations
        try {
          const { data: g } = await api.get(`/games?age_group=${encodeURIComponent(a.age_group)}`);
          setGames(g);
        } catch {}
      } catch { navigate("/dashboard"); }
    })();
  }, [assessmentId, navigate]);

  const overall = assessment?.overall_score ?? assessment?.percentage ?? 0;
  const estimated = assessment?.estimated_index ?? assessment?.estimated_score ?? 0;
  const categoryScores = assessment?.category_scores || {};

  const radarData = useMemo(() =>
    Object.entries(categoryScores).map(([k, v]) => ({
      skill: CATEGORY_LABELS[k] || k,
      value: v.score ?? (v.total > 0 ? Math.round((v.correct / v.total) * 100) : 0),
    })),
    [categoryScores]
  );

  // Weekly goals from growth areas
  const weeklyGoals = useMemo(() => {
    const goals = [];
    const growth = assessment?.growth_areas || [];
    growth.slice(0, 2).forEach(g => {
      goals.push({ area: CATEGORY_LABELS[g] || g, goal: `Improve ${CATEGORY_LABELS[g] || g} score by 10% this week` });
    });
    goals.push({ area: "Consistency", goal: "Complete at least 3 brain games this week" });
    goals.push({ area: "Streak", goal: "Play any game 5 days in a row" });
    return goals;
  }, [assessment]);

  // Recommended games — match to growth areas first, fallback to strengths
  const recommendedGames = useMemo(() => {
    if (!games?.length) return [];
    const priority = [...(assessment?.growth_areas || []), ...(assessment?.strengths || [])];
    const picked = [];
    const seen = new Set();
    for (const cat of priority) {
      const match = games.find(g => g.category === cat && !seen.has(g.key));
      if (match) { picked.push(match); seen.add(match.key); }
      if (picked.length >= 3) break;
    }
    // Fill remaining with random games (skip already seen)
    for (const g of games) {
      if (picked.length >= 3) break;
      if (!seen.has(g.key)) { picked.push(g); seen.add(g.key); }
    }
    return picked;
  }, [games, assessment]);

  if (!assessment) {
    return <div className="min-h-screen"><Navbar /><div className="text-center mt-40 text-muted-foreground">Loading report...</div></div>;
  }

  const handleDownloadPdf = async () => {
    if (!canAccessDetailed) {
      toast.info("Premium members can download PDF reports. Upgrade to unlock!");
      navigate("/pricing");
      return;
    }
    window.open(`${API}/assessments/${assessmentId}/pdf`, "_blank");
  };

  const nextRetryDays = nextAssessmentIn(overall);

  return (
    <div className="min-h-screen relative overflow-hidden">
      <Navbar />
      <Confetti trigger={confetti} />
      <div className="floating-blob bg-yellow-300/40 w-80 h-80 -top-10 -left-16"></div>
      <div className="floating-blob bg-pink-400/40 w-72 h-72 bottom-0 -right-10"></div>

      <main className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8 relative">
        <button onClick={() => navigate("/dashboard")} data-testid="report-back-btn" className="text-sm font-bold text-muted-foreground hover:text-foreground flex items-center gap-1 mb-4">
          <ChevronLeft className="w-4 h-4" /> Back to dashboard
        </button>

        {/* Free-tier banner */}
        {!canAccessDetailed && (
          <Card className="glass-card rounded-3xl border-0 p-5 mb-5 flex items-center gap-4 border-2 border-dashed border-purple-400/40" data-testid="free-tier-banner">
            <div className="w-12 h-12 rounded-3xl bg-gradient-to-br from-purple-500 to-pink-500 grid place-items-center shrink-0">
              <Crown className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <p className="font-black">You're viewing the summary report</p>
              <p className="text-xs text-muted-foreground">Upgrade to Premium to unlock personalized tips, weekly goals, parent guidance, PDF download and more.</p>
            </div>
            <Link to="/pricing">
              <Button className="pill-btn bg-gradient-to-r from-purple-500 to-pink-500 text-white font-black" data-testid="report-upgrade-btn">
                <Crown className="w-4 h-4 mr-1.5" /> Upgrade
              </Button>
            </Link>
          </Card>
        )}

        {/* ===== HERO: Overall Brain Skills Score ===== */}
        <Card className="glass-card rounded-[2rem] border-0 p-8 sm:p-10 relative overflow-hidden animate-pop" data-testid="report-hero">
          <div className="floating-blob bg-purple-400/40 w-64 h-64 -top-16 -right-10"></div>
          <div className="relative flex flex-col md:flex-row md:items-center gap-6">
            <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-yellow-300 to-orange-400 grid place-items-center shadow-xl animate-float">
              <Award className="w-11 h-11 text-white" strokeWidth={2.2} />
            </div>
            <div className="flex-1">
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Brain Skills Report</p>
              <h1 className="text-3xl sm:text-4xl font-display font-black tracking-tight mt-1" data-testid="report-title">
                Great job, {child?.name}!
              </h1>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <Badge className="rounded-full text-sm bg-blue-100 text-blue-800 hover:bg-blue-100 border-0 font-bold" data-testid="report-score-badge">
                  {assessment.total_correct}/{assessment.total_questions} correct
                </Badge>
                <Badge className="rounded-full text-sm bg-purple-100 text-purple-800 hover:bg-purple-100 border-0 font-bold" data-testid="report-overall-badge">
                  {overall}% overall
                </Badge>
                <Badge className="rounded-full text-sm bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-0 font-bold">
                  <Zap className="w-3.5 h-3.5 mr-1" /> +{assessment.xp_earned} XP
                </Badge>
                <Badge className="rounded-full text-sm bg-yellow-100 text-yellow-800 hover:bg-yellow-100 border-0 font-bold">
                  <Star className="w-3.5 h-3.5 mr-1 fill-yellow-500 text-yellow-500" /> {assessment.stars_earned} stars
                </Badge>
              </div>
            </div>
            <div className="text-center md:text-right">
              <p className="text-xs font-bold uppercase text-muted-foreground">Estimated cognitive index</p>
              <p className="text-5xl font-display font-black brand-gradient-text" data-testid="report-estimated-score">{estimated}</p>
              <p className="text-[10px] text-muted-foreground max-w-[180px] mt-1">Educational estimate — not a clinical IQ diagnosis.</p>
            </div>
          </div>
        </Card>

        {/* KPIs row */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-5">
          <MiniStat icon={Gauge} label="Accuracy" value={`${assessment.accuracy ?? 0}%`} color="from-blue-500 to-cyan-500" testid="kpi-accuracy" />
          <MiniStat icon={Zap} label="Speed" value={`${assessment.speed_score ?? 0}%`} color="from-orange-500 to-red-500" testid="kpi-speed" />
          <MiniStat icon={TrendingUp} label="Consistency" value={`${assessment.consistency ?? 0}%`} color="from-emerald-500 to-teal-500" testid="kpi-consistency" />
          <MiniStat icon={Focus} label="Attention" value={`${assessment.attention ?? 0}%`} color="from-purple-500 to-pink-500" testid="kpi-attention" />
        </div>

        {/* ===== Category-wise Scores ===== */}
        <div className="grid lg:grid-cols-2 gap-5 mt-6">
          <Card className="glass-card rounded-3xl border-0 p-6" data-testid="skills-chart-card">
            <h3 className="font-display font-black text-xl">Brain-skill map</h3>
            <div className="h-72 mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData}>
                  <PolarGrid stroke="hsl(var(--border))" />
                  <PolarAngleAxis dataKey="skill" tick={{ fontSize: 11, fontWeight: 700 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10 }} />
                  <Radar name="Score" dataKey="value" stroke="hsl(217 91% 60%)" fill="hsl(217 91% 60%)" fillOpacity={0.5} strokeWidth={2} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </Card>
          <Card className="glass-card rounded-3xl border-0 p-6" data-testid="category-breakdown-card">
            <h3 className="font-display font-black text-xl">Category-wise Scores</h3>
            <div className="mt-4 space-y-3 max-h-72 overflow-y-auto pr-2">
              {Object.entries(categoryScores).map(([k, v]) => {
                const pct = v.score ?? (v.total > 0 ? Math.round((v.correct / v.total) * 100) : 0);
                return (
                  <div key={k} data-testid={`skill-row-${k}`}>
                    <div className="flex justify-between items-center text-sm font-bold">
                      <span>{CATEGORY_LABELS[k] || k}</span>
                      <span className="text-muted-foreground">{v.correct}/{v.total} · {pct}%</span>
                    </div>
                    <div className="h-3 mt-1 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-purple-600" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        {/* ===== Strengths / Areas for Improvement ===== */}
        {((assessment.strengths?.length || 0) + (assessment.growth_areas?.length || 0) > 0) && (
          <div className="grid md:grid-cols-2 gap-5 mt-5">
            {assessment.strengths?.length > 0 && (
              <Card className="glass-card rounded-3xl border-0 p-6" data-testid="strengths-card">
                <h4 className="font-display font-black text-lg flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-500" /> Strengths
                </h4>
                <div className="mt-3 flex flex-wrap gap-2">
                  {assessment.strengths.map(s => (
                    <Badge key={s} className="rounded-full bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-0 font-bold">
                      {CATEGORY_LABELS[s] || s}
                    </Badge>
                  ))}
                </div>
              </Card>
            )}
            {assessment.growth_areas?.length > 0 && (
              <Card className="glass-card rounded-3xl border-0 p-6" data-testid="growth-card">
                <h4 className="font-display font-black text-lg flex items-center gap-2">
                  <Target className="w-4 h-4 text-orange-500" /> Areas for Improvement
                </h4>
                <div className="mt-3 flex flex-wrap gap-2">
                  {assessment.growth_areas.map(g => (
                    <Badge key={g} className="rounded-full bg-orange-100 text-orange-800 hover:bg-orange-100 border-0 font-bold">
                      {CATEGORY_LABELS[g] || g}
                    </Badge>
                  ))}
                </div>
              </Card>
            )}
          </div>
        )}

        {/* ===== PREMIUM-ONLY DETAILED SECTIONS ===== */}
        {canAccessDetailed ? (
          <>
            {/* Personalized Tips + Daily Practice */}
            <div className="grid md:grid-cols-2 gap-5 mt-6">
              <Card className="glass-card rounded-3xl border-0 p-6" data-testid="tips-card">
                <h4 className="font-display font-black text-lg flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-500" /> Personalized Tips
                </h4>
                <ul className="mt-3 space-y-2.5 text-sm">
                  {(assessment.growth_areas?.length ? assessment.growth_areas : assessment.strengths || []).slice(0, 3).map(cat => (
                    <li key={cat} className="flex gap-2">
                      <span className="text-purple-500 font-black">•</span>
                      <span><span className="font-bold">{CATEGORY_LABELS[cat] || cat}:</span> {TIPS[cat] || "Keep exploring and stay curious!"}</span>
                    </li>
                  ))}
                </ul>
              </Card>
              <Card className="glass-card rounded-3xl border-0 p-6" data-testid="daily-practice-card">
                <h4 className="font-display font-black text-lg flex items-center gap-2">
                  <Rocket className="w-4 h-4 text-blue-500" /> Daily Practice Suggestions
                </h4>
                <ul className="mt-3 space-y-2 text-sm">
                  <li>🌅 <span className="font-bold">Morning:</span> Solve 3 quick riddles or brain teasers</li>
                  <li>📚 <span className="font-bold">Afternoon:</span> Read for 15-20 minutes and note 2 new words</li>
                  <li>🎮 <span className="font-bold">Evening:</span> Play a Brain Skills game for 5-10 minutes</li>
                  <li>🌙 <span className="font-bold">Before bed:</span> Reflect on 1 thing learned today</li>
                </ul>
              </Card>
            </div>

            {/* Weekly Goals + Parent Guidance */}
            <div className="grid md:grid-cols-2 gap-5 mt-5">
              <Card className="glass-card rounded-3xl border-0 p-6" data-testid="weekly-goals-card">
                <h4 className="font-display font-black text-lg flex items-center gap-2">
                  <CalendarClock className="w-4 h-4 text-teal-500" /> Weekly Goals
                </h4>
                <ul className="mt-3 space-y-2 text-sm">
                  {weeklyGoals.map((g, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="text-teal-500 font-black">✓</span>
                      <span><span className="font-bold">{g.area}:</span> {g.goal}</span>
                    </li>
                  ))}
                </ul>
              </Card>
              <Card className="glass-card rounded-3xl border-0 p-6" data-testid="parent-guidance-card">
                <h4 className="font-display font-black text-lg flex items-center gap-2">
                  <HandHeart className="w-4 h-4 text-rose-500" /> Parent Guidance
                </h4>
                <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                  {(assessment.growth_areas?.length ? assessment.growth_areas : assessment.strengths || []).slice(0, 3).map(cat => (
                    <li key={cat}><span className="font-bold text-foreground">{CATEGORY_LABELS[cat] || cat}:</span> {PARENT_ADVICE[cat] || "Encourage curiosity and celebrate every small win."}</li>
                  ))}
                </ul>
              </Card>
            </div>

            {/* Recommended Brain Games */}
            {recommendedGames.length > 0 && (
              <section className="mt-6" data-testid="recommended-games-section">
                <h3 className="font-display font-black text-xl flex items-center gap-2 mb-3">
                  <Gamepad2 className="w-5 h-5 text-pink-500" /> Recommended Brain Games
                </h3>
                <div className="grid sm:grid-cols-3 gap-4">
                  {recommendedGames.map(g => (
                    <Card key={g.key} data-testid={`recommended-game-${g.key}`}
                      className={`relative overflow-hidden rounded-3xl border-0 lift-shadow p-5 text-white bg-gradient-to-br ${g.color} hover:-translate-y-1 transition-transform`}>
                      <div className="flex items-start justify-between">
                        <p className="text-xs font-bold uppercase tracking-wider text-white/90">{CATEGORY_LABELS[g.category] || g.category}</p>
                        <Badge className="rounded-full bg-white/25 backdrop-blur text-white border-0 font-bold text-xs">{g.difficulty_label}</Badge>
                      </div>
                      <p className="mt-3 font-display font-black text-lg">{g.name}</p>
                      <p className="text-xs text-white/80 line-clamp-2 mt-1">{g.description}</p>
                      <button
                        onClick={() => navigate(`/dashboard/games/${g.key}?child=${child?.id}`)}
                        data-testid={`play-recommended-${g.key}`}
                        className="pill-btn mt-3 w-full h-9 rounded-full font-black text-xs bg-white text-slate-900 hover:bg-white/90 flex items-center justify-center"
                      >
                        <Play className="w-3 h-3 mr-1" /> Play now
                      </button>
                    </Card>
                  ))}
                </div>
              </section>
            )}

            {/* AI Insights */}
            {assessment.ai_report && (
              <Card className="glass-card rounded-3xl border-0 p-6 sm:p-8 mt-6" data-testid="ai-report-card">
                <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-muted-foreground">
                  <Sparkles className="w-4 h-4 text-purple-500" /> AI Insights
                </div>
                <div className="prose prose-slate dark:prose-invert max-w-none mt-3">
                  {(assessment.ai_report || "").split("\n").map((line, i) => {
                    if (line.startsWith("## ")) return <h3 key={i} className="font-display font-black text-xl mt-4">{line.slice(3)}</h3>;
                    if (line.startsWith("- ")) return <li key={i} className="ml-6 list-disc">{line.slice(2)}</li>;
                    if (line.trim() === "") return <br key={i} />;
                    return <p key={i} className="text-sm leading-relaxed text-muted-foreground mt-2">{line}</p>;
                  })}
                </div>
              </Card>
            )}
          </>
        ) : (
          /* Free-tier locked content teaser */
          <Card className="glass-card rounded-3xl border-0 p-6 sm:p-8 mt-6 text-center relative overflow-hidden" data-testid="locked-detailed-section">
            <div className="floating-blob bg-purple-400/20 w-72 h-72 -top-20 -right-20"></div>
            <div className="relative">
              <div className="w-14 h-14 rounded-3xl bg-gradient-to-br from-purple-500 to-pink-500 grid place-items-center mx-auto">
                <Lock className="w-7 h-7 text-white" />
              </div>
              <h3 className="font-display font-black text-xl mt-4">Detailed report is Premium</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-lg mx-auto">
                Unlock personalized tips, daily practice, weekly goals, parent guidance, recommended games,
                full AI insights, and downloadable PDF.
              </p>
              <Link to="/pricing">
                <Button className="mt-5 pill-btn bg-gradient-to-r from-purple-500 to-pink-500 text-white font-black" data-testid="upgrade-detailed-btn">
                  <Crown className="w-4 h-4 mr-1.5" /> See Premium plans
                </Button>
              </Link>
            </div>
          </Card>
        )}

        {/* ===== Recommended Next Assessment ===== */}
        <Card className="glass-card rounded-3xl border-0 p-6 mt-6" data-testid="next-assessment-card">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="w-12 h-12 rounded-3xl bg-gradient-to-br from-blue-500 to-purple-500 grid place-items-center shrink-0">
              <CalendarClock className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <p className="font-display font-black text-lg">Recommended Next Assessment</p>
              <p className="text-sm text-muted-foreground">
                We suggest taking another assessment in about <span className="font-bold text-foreground">{nextRetryDays} days</span> to see progress.
                Difficulty will adapt automatically based on this attempt.
              </p>
            </div>
            <Link to={`/dashboard/child/${child?.id}/assessment`}>
              <Button className="pill-btn bg-gradient-to-r from-blue-500 to-purple-600 text-white font-black" data-testid="next-assessment-btn">
                <TrendingUp className="w-4 h-4 mr-2" /> Try again
              </Button>
            </Link>
          </div>
        </Card>

        {/* ===== XP, Levels, Badges, Progress ===== */}
        {child && (
          <Card className="glass-card rounded-3xl border-0 p-6 mt-5" data-testid="progress-summary-card">
            <h4 className="font-display font-black text-lg flex items-center gap-2 mb-3">
              <TrendingUp className="w-4 h-4 text-emerald-500" /> XP · Levels · Badges
            </h4>
            <div className="grid sm:grid-cols-4 gap-3">
              <div className="rounded-2xl bg-muted p-3 text-center">
                <p className="text-[10px] font-bold uppercase text-muted-foreground">XP earned</p>
                <p className="text-2xl font-display font-black">+{assessment.xp_earned}</p>
              </div>
              <div className="rounded-2xl bg-muted p-3 text-center">
                <p className="text-[10px] font-bold uppercase text-muted-foreground">Stars</p>
                <p className="text-2xl font-display font-black">{assessment.stars_earned} ⭐</p>
              </div>
              <div className="rounded-2xl bg-muted p-3 text-center">
                <p className="text-[10px] font-bold uppercase text-muted-foreground">Total XP</p>
                <p className="text-2xl font-display font-black">{child.xp ?? 0}</p>
              </div>
              <div className="rounded-2xl bg-muted p-3 text-center">
                <p className="text-[10px] font-bold uppercase text-muted-foreground">Badges</p>
                <p className="text-2xl font-display font-black">{(child.badges || []).length}</p>
              </div>
            </div>
            {(child.badges || []).length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {child.badges.map(b => (
                  <Badge key={b} className="rounded-full bg-gradient-to-r from-yellow-400 to-orange-400 text-white border-0 hover:opacity-90 font-bold">
                    <Award className="w-3.5 h-3.5 mr-1" /> {b.replace(/_/g, " ")}
                  </Badge>
                ))}
              </div>
            )}
          </Card>
        )}

        {/* ===== Actions: PDF + certificate + retry ===== */}
        <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-end">
          <Button
            variant="outline"
            className="pill-btn font-bold"
            onClick={handleDownloadPdf}
            data-testid="download-pdf-btn"
          >
            {canAccessDetailed ? <Download className="w-4 h-4 mr-2" /> : <Lock className="w-4 h-4 mr-2" />}
            {canAccessDetailed ? "Download PDF report" : "PDF (Premium only)"}
          </Button>
          <Link to="/dashboard/certificates">
            <Button variant="outline" className="pill-btn font-bold" data-testid="view-certificate-btn">
              <Award className="w-4 h-4 mr-2" /> View certificate
            </Button>
          </Link>
          <Link to={`/dashboard/child/${child?.id}/assessment`}>
            <Button className="pill-btn bg-gradient-to-r from-blue-500 to-purple-600 text-white font-black" data-testid="try-again-btn">
              <TrendingUp className="w-4 h-4 mr-2" /> Try again
            </Button>
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}

function MiniStat({ icon: Icon, label, value, color, testid }) {
  return (
    <Card className="glass-card rounded-3xl border-0 p-4 flex items-center gap-3" data-testid={testid}>
      <div className={`w-11 h-11 rounded-2xl grid place-items-center bg-gradient-to-br ${color}`}>
        <Icon className="w-5 h-5 text-white" strokeWidth={2.5} />
      </div>
      <div>
        <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">{label}</p>
        <p className="font-display font-black text-lg">{value}</p>
      </div>
    </Card>
  );
}

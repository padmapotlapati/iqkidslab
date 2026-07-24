import { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import api, { API } from "@/lib/api";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Award, Sparkles, Zap, Star, TrendingUp, ChevronLeft, Download, Gauge, Focus, Timer } from "lucide-react";
import Confetti from "@/components/Confetti";
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer } from "recharts";

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

export default function Report() {
  const { assessmentId } = useParams();
  const navigate = useNavigate();
  const [assessment, setAssessment] = useState(null);
  const [child, setChild] = useState(null);
  const [confetti, setConfetti] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { data: a } = await api.get(`/assessments/${assessmentId}`);
        setAssessment(a);
        const { data: c } = await api.get(`/children/${a.child_id}`);
        setChild(c);
        if ((a.overall_score || a.percentage || 0) >= 60) setConfetti(true);
      } catch { navigate("/dashboard"); }
    })();
  }, [assessmentId, navigate]);

  if (!assessment) {
    return <div className="min-h-screen"><Navbar /><div className="text-center mt-40 text-muted-foreground">Loading report...</div></div>;
  }

  const overall = assessment.overall_score ?? assessment.percentage ?? 0;
  const estimated = assessment.estimated_index ?? assessment.estimated_score ?? 0;
  const categoryScores = assessment.category_scores || {};

  const radarData = Object.entries(categoryScores).map(([k, v]) => ({
    skill: CATEGORY_LABELS[k] || k,
    value: v.score ?? (v.total > 0 ? Math.round((v.correct / v.total) * 100) : 0),
  }));

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

        <Card className="glass-card rounded-[2rem] border-0 p-8 sm:p-10 relative overflow-hidden animate-pop" data-testid="report-hero">
          <div className="floating-blob bg-purple-400/40 w-64 h-64 -top-16 -right-10"></div>
          <div className="relative flex flex-col md:flex-row md:items-center gap-6">
            <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-yellow-300 to-orange-400 grid place-items-center shadow-xl animate-float">
              <Award className="w-11 h-11 text-white" strokeWidth={2.2} />
            </div>
            <div className="flex-1">
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Brain-Skills Report</p>
              <h1 className="text-3xl sm:text-4xl font-display font-black tracking-tight mt-1" data-testid="report-title">
                Great job, {child?.name}!
              </h1>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <Badge className="rounded-full text-sm bg-blue-100 text-blue-800 hover:bg-blue-100 border-0 font-bold" data-testid="report-score-badge">
                  {assessment.total_correct}/{assessment.total_questions} correct
                </Badge>
                <Badge className="rounded-full text-sm bg-purple-100 text-purple-800 hover:bg-purple-100 border-0 font-bold">{overall}% overall</Badge>
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

        {/* Chart + breakdown */}
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
          <Card className="glass-card rounded-3xl border-0 p-6">
            <h3 className="font-display font-black text-xl">Category breakdown</h3>
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

        {/* Strengths / Growth */}
        {(assessment.strengths?.length || assessment.growth_areas?.length) && (
          <div className="grid md:grid-cols-2 gap-5 mt-5">
            {assessment.strengths?.length > 0 && (
              <Card className="glass-card rounded-3xl border-0 p-6" data-testid="strengths-card">
                <h4 className="font-display font-black text-lg">Top strengths</h4>
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
                <h4 className="font-display font-black text-lg">Growth opportunities</h4>
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

        {/* AI Report */}
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

        <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-end">
          <a href={`${API}/assessments/${assessmentId}/pdf`} target="_blank" rel="noreferrer">
            <Button variant="outline" className="pill-btn font-bold" data-testid="download-pdf-btn">
              <Download className="w-4 h-4 mr-2" /> Download PDF report
            </Button>
          </a>
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

import { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import api from "@/lib/api";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Award, Sparkles, Zap, Star, TrendingUp, ChevronLeft, Download } from "lucide-react";
import Confetti from "@/components/Confetti";
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, Legend } from "recharts";

const SKILL_LABELS = {
  memory: "Memory",
  logic: "Logic",
  attention: "Attention",
  pattern: "Pattern",
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
        if (a.percentage >= 60) setConfetti(true);
      } catch { navigate("/dashboard"); }
    })();
  }, [assessmentId, navigate]);

  if (!assessment) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="text-center mt-40 text-muted-foreground">Loading report...</div>
      </div>
    );
  }

  const radarData = Object.entries(assessment.skill_scores).map(([k, v]) => ({
    skill: SKILL_LABELS[k] || k,
    value: v.total > 0 ? Math.round((v.correct / v.total) * 100) : 0,
  }));

  const printReport = () => window.print();

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

        {/* Hero */}
        <Card className="glass-card rounded-[2rem] border-0 p-8 sm:p-10 relative overflow-hidden animate-pop" data-testid="report-hero">
          <div className="floating-blob bg-purple-400/40 w-64 h-64 -top-16 -right-10"></div>
          <div className="relative flex flex-col md:flex-row md:items-center gap-6">
            <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-yellow-300 to-orange-400 grid place-items-center shadow-xl animate-float">
              <Award className="w-11 h-11 text-white" strokeWidth={2.2} />
            </div>
            <div className="flex-1">
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Personalized Brain-Skills Report</p>
              <h1 className="text-3xl sm:text-4xl font-display font-black tracking-tight mt-1" data-testid="report-title">
                Great job, {child?.name}!
              </h1>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <Badge className="rounded-full text-sm bg-blue-100 text-blue-800 hover:bg-blue-100 border-0 font-bold" data-testid="report-score-badge">
                  {assessment.total_correct}/{assessment.total_questions} correct
                </Badge>
                <Badge className="rounded-full text-sm bg-purple-100 text-purple-800 hover:bg-purple-100 border-0 font-bold">
                  {assessment.percentage}% overall
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
              <p className="text-5xl font-display font-black brand-gradient-text" data-testid="report-estimated-score">{assessment.estimated_score}</p>
              <p className="text-[10px] text-muted-foreground max-w-[180px] mt-1">Educational estimate — not a clinical IQ diagnosis.</p>
            </div>
          </div>
        </Card>

        {/* Skills chart + breakdown */}
        <div className="grid lg:grid-cols-2 gap-5 mt-6">
          <Card className="glass-card rounded-3xl border-0 p-6" data-testid="skills-chart-card">
            <h3 className="font-display font-black text-xl">Brain-skill map</h3>
            <div className="h-72 mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData}>
                  <PolarGrid stroke="hsl(var(--border))" />
                  <PolarAngleAxis dataKey="skill" tick={{ fontSize: 12, fontWeight: 700 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10 }} />
                  <Radar name="Score" dataKey="value" stroke="hsl(217 91% 60%)" fill="hsl(217 91% 60%)" fillOpacity={0.5} strokeWidth={2} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </Card>
          <Card className="glass-card rounded-3xl border-0 p-6">
            <h3 className="font-display font-black text-xl">Skill breakdown</h3>
            <div className="mt-4 space-y-3">
              {Object.entries(assessment.skill_scores).map(([k, v]) => {
                const pct = v.total > 0 ? Math.round((v.correct / v.total) * 100) : 0;
                return (
                  <div key={k} data-testid={`skill-row-${k}`}>
                    <div className="flex justify-between items-center text-sm font-bold">
                      <span>{SKILL_LABELS[k] || k}</span>
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

        {/* AI Report */}
        <Card className="glass-card rounded-3xl border-0 p-6 sm:p-8 mt-6" data-testid="ai-report-card">
          <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-muted-foreground">
            <Sparkles className="w-4 h-4 text-purple-500" /> AI Insights
          </div>
          <div className="prose prose-slate dark:prose-invert max-w-none mt-3">
            {assessment.ai_report.split("\n").map((line, i) => {
              if (line.startsWith("## ")) return <h3 key={i} className="font-display font-black text-xl mt-4">{line.slice(3)}</h3>;
              if (line.startsWith("- ")) return <li key={i} className="ml-6 list-disc">{line.slice(2)}</li>;
              if (line.trim() === "") return <br key={i} />;
              return <p key={i} className="text-sm leading-relaxed text-muted-foreground mt-2">{line}</p>;
            })}
          </div>
        </Card>

        <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-end">
          <Button variant="outline" onClick={printReport} className="pill-btn font-bold" data-testid="print-report-btn">
            <Download className="w-4 h-4 mr-2" /> Print / Save PDF
          </Button>
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

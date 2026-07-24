import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import api from "@/lib/api";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Play, Zap, Star, Award, ChevronLeft, TrendingUp } from "lucide-react";

export default function ChildProfile() {
  const { childId } = useParams();
  const navigate = useNavigate();
  const [child, setChild] = useState(null);
  const [assessments, setAssessments] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const [c, a] = await Promise.all([api.get(`/children/${childId}`), api.get(`/assessments/child/${childId}`)]);
        setChild(c.data);
        setAssessments(a.data);
      } catch { navigate("/dashboard"); }
    })();
  }, [childId, navigate]);

  if (!child) return <div className="min-h-screen"><Navbar /><div className="text-center mt-40 text-muted-foreground">Loading...</div></div>;

  return (
    <div className="min-h-screen relative overflow-hidden">
      <Navbar />
      <div className="floating-blob bg-blue-400/30 w-80 h-80 -top-10 -left-16"></div>
      <div className="floating-blob bg-purple-400/30 w-72 h-72 bottom-0 -right-10"></div>

      <main className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8 relative">
        <button onClick={() => navigate("/dashboard")} className="text-sm font-bold text-muted-foreground hover:text-foreground flex items-center gap-1 mb-4" data-testid="child-back-btn">
          <ChevronLeft className="w-4 h-4" /> Back
        </button>

        <Card className="glass-card rounded-[2rem] border-0 p-8">
          <div className="flex flex-col sm:flex-row items-start gap-5">
            <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-pink-400 via-purple-500 to-blue-500 grid place-items-center text-4xl font-display font-black text-white shadow-xl">
              {child.name?.[0]?.toUpperCase()}
            </div>
            <div className="flex-1">
              <h1 className="text-3xl font-display font-black" data-testid="child-name-heading">{child.name}</h1>
              <p className="text-muted-foreground text-sm">Age {child.age} · Age group {child.age_group} · {child.grade || "—"}</p>
              <div className="flex flex-wrap gap-2 mt-3">
                <Badge className="rounded-full bg-blue-100 text-blue-800 border-0 hover:bg-blue-100 font-bold"><Zap className="w-3.5 h-3.5 mr-1" /> {child.xp || 0} XP</Badge>
                <Badge className="rounded-full bg-yellow-100 text-yellow-800 border-0 hover:bg-yellow-100 font-bold"><Star className="w-3.5 h-3.5 mr-1 fill-yellow-500 text-yellow-500" /> {child.stars || 0}</Badge>
                {(child.badges || []).map((b) => (
                  <Badge key={b} className="rounded-full bg-purple-100 text-purple-800 border-0 hover:bg-purple-100 font-bold"><Award className="w-3.5 h-3.5 mr-1" /> {b.replace("_", " ")}</Badge>
                ))}
              </div>
              <div className="mt-5">
                <Link to={`/dashboard/child/${child.id}/assessment`}>
                  <Button className="pill-btn bg-gradient-to-r from-blue-500 to-purple-600 text-white font-black" data-testid="start-new-assessment-btn">
                    <Play className="w-4 h-4 mr-2" /> Start new assessment
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </Card>

        <section className="mt-8">
          <h2 className="text-2xl font-display font-black tracking-tight">Assessment history</h2>
          {assessments.length === 0 ? (
            <p className="mt-3 text-muted-foreground text-sm">No assessments completed yet.</p>
          ) : (
            <div className="grid md:grid-cols-2 gap-4 mt-4">
              {assessments.map(a => (
                <Card key={a.id} onClick={() => navigate(`/dashboard/report/${a.id}`)} data-testid={`history-${a.id}`}
                  className="glass-card rounded-3xl border-0 p-5 cursor-pointer hover:-translate-y-1 transition-transform">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-xs font-bold uppercase text-muted-foreground">{new Date(a.created_at).toLocaleDateString()}</p>
                      <p className="mt-1 font-display font-black text-xl">{a.total_correct} / {a.total_questions}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-display font-black brand-gradient-text">{a.percentage}%</div>
                      <div className="text-xs font-bold text-emerald-500 flex items-center gap-1 justify-end"><TrendingUp className="w-3 h-3" /> +{a.xp_earned} XP</div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
}

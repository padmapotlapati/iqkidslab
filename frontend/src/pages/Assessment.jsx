import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "@/lib/api";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { formatApiError } from "@/lib/api";
import { ChevronRight, Brain, Sparkles, Timer } from "lucide-react";
import Confetti from "@/components/Confetti";

const SKILL_EMOJI = {
  memory: "🧩", logic: "💡", attention: "🎯", pattern: "🔷", problem_solving: "🚀",
};

export default function Assessment() {
  const { childId } = useParams();
  const navigate = useNavigate();
  const [child, setChild] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [startTime] = useState(Date.now());
  const [submitting, setSubmitting] = useState(false);
  const [confetti, setConfetti] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { data: c } = await api.get(`/children/${childId}`);
        setChild(c);
        const { data: qs } = await api.get(`/assessment/questions/${c.age_group}`);
        setQuestions(qs);
      } catch { toast.error("Could not load assessment."); navigate("/dashboard"); }
      setLoading(false);
    })();
  }, [childId, navigate]);

  const currentQ = questions[currentIdx];
  const progress = questions.length > 0 ? ((currentIdx) / questions.length) * 100 : 0;

  const next = () => {
    if (selected === null) return;
    const newAnswers = [...answers, selected];
    setAnswers(newAnswers);
    setSelected(null);
    if (currentIdx + 1 < questions.length) {
      setCurrentIdx(currentIdx + 1);
    } else {
      submit(newAnswers);
    }
  };

  const submit = async (finalAnswers) => {
    setSubmitting(true);
    try {
      const { data } = await api.post("/assessment/submit", {
        child_id: childId,
        age_group: child.age_group,
        answers: finalAnswers,
        duration_seconds: Math.round((Date.now() - startTime) / 1000),
      });
      setConfetti(true);
      setTimeout(() => navigate(`/dashboard/report/${data.id}`), 900);
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || "Could not submit.");
    }
    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="text-center mt-40 text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (submitting) {
    return (
      <div className="min-h-screen relative overflow-hidden">
        <Navbar />
        <Confetti trigger={confetti} />
        <div className="floating-blob bg-purple-400/40 w-80 h-80 top-20 -left-16"></div>
        <div className="floating-blob bg-orange-400/40 w-72 h-72 bottom-0 -right-10"></div>
        <div className="max-w-md mx-auto text-center mt-32 relative animate-pop">
          <div className="w-20 h-20 rounded-3xl mx-auto bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 grid place-items-center animate-float">
            <Sparkles className="w-9 h-9 text-white" />
          </div>
          <h2 className="text-3xl font-display font-black mt-6">Amazing work!</h2>
          <p className="text-muted-foreground mt-2">Generating your personalized report...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      <Navbar />
      <div className="floating-blob bg-blue-400/30 w-80 h-80 -top-10 -left-16"></div>
      <div className="floating-blob bg-pink-400/30 w-72 h-72 bottom-0 -right-10"></div>

      <main className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-8 relative">
        <div className="flex items-center justify-between text-sm text-muted-foreground font-bold">
          <span data-testid="assessment-progress-text">Question {currentIdx + 1} of {questions.length}</span>
          <span className="flex items-center gap-1.5"><Timer className="w-4 h-4" /> {child?.name} · Age {child?.age}</span>
        </div>
        <Progress value={progress} className="mt-2 h-2 rounded-full" data-testid="assessment-progress-bar" />

        <Card key={currentQ.id} className="glass-card rounded-[2rem] border-0 p-6 sm:p-10 mt-6 animate-pop" data-testid="assessment-card">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 grid place-items-center text-2xl shadow-lg">
              <span>{SKILL_EMOJI[currentQ.skill] || "🧠"}</span>
            </div>
            <div>
              <p className="text-xs font-bold uppercase text-muted-foreground tracking-widest">Skill · {currentQ.skill.replace("_", " ")}</p>
            </div>
          </div>
          <h2 className="mt-5 text-xl sm:text-2xl font-display font-black leading-snug" data-testid="assessment-question">
            {currentQ.prompt}
          </h2>

          <div className="mt-6 grid sm:grid-cols-2 gap-3">
            {currentQ.options.map((opt, i) => {
              const isSelected = selected === i;
              return (
                <button
                  key={i}
                  onClick={() => setSelected(i)}
                  data-testid={`answer-option-${i}`}
                  className={`text-left px-5 py-4 rounded-2xl border-2 font-bold transition-all
                    ${isSelected
                      ? "border-primary bg-primary/10 text-foreground shadow-lg scale-[1.02]"
                      : "border-border bg-card hover:border-primary/40 hover:-translate-y-0.5"}
                  `}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-xl grid place-items-center font-black text-sm
                      ${isSelected ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                      {String.fromCharCode(65 + i)}
                    </div>
                    <span className="text-sm sm:text-base">{opt}</span>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="mt-8 flex justify-end">
            <Button
              onClick={next}
              disabled={selected === null}
              data-testid="assessment-next-btn"
              className="pill-btn h-12 px-8 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-black disabled:opacity-40"
            >
              {currentIdx + 1 === questions.length ? "Finish" : "Next"} <ChevronRight className="w-5 h-5 ml-1" />
            </Button>
          </div>
        </Card>
      </main>
    </div>
  );
}

import { useEffect, useState, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "@/lib/api";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { formatApiError } from "@/lib/api";
import { ChevronRight, Sparkles, Timer } from "lucide-react";
import Confetti from "@/components/Confetti";

const CATEGORY_EMOJI = {
  memory: "🧩", logical_reasoning: "💡", attention: "🎯", pattern_recognition: "🔷",
  problem_solving: "🚀", visual_intelligence: "👁️", processing_speed: "⚡",
  mathematical_thinking: "🔢", language_skills: "🔤", creativity: "🎨",
};

export default function Assessment() {
  const { childId } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [durations, setDurations] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [confetti, setConfetti] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const questionStartRef = useRef(Date.now());

  // Start session on mount
  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.post("/sessions/start", { child_id: childId });
        setSession(data);
        setQuestions(data.questions);
        setTimeLeft(data.time_per_question);
      } catch (e) {
        toast.error(formatApiError(e.response?.data?.detail) || "Could not start assessment");
        navigate("/dashboard");
      }
      setLoading(false);
    })();
  }, [childId, navigate]);

  // Timer per question
  useEffect(() => {
    if (!session || questions.length === 0 || submitting) return;
    questionStartRef.current = Date.now();
    setTimeLeft(session.time_per_question);
    const interval = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { clearInterval(interval); handleTimeout(); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIdx, session]);

  const handleTimeout = () => {
    recordAndAdvance(-1); // -1 = no answer selected
  };

  const recordAndAdvance = (answerIdx) => {
    const dur = Math.max(1, Math.round((Date.now() - questionStartRef.current) / 1000));
    const newAnswers = [...answers, answerIdx];
    const newDurations = [...durations, dur];
    setAnswers(newAnswers);
    setDurations(newDurations);
    setSelected(null);
    if (currentIdx + 1 < questions.length) {
      setCurrentIdx(currentIdx + 1);
    } else {
      submit(newAnswers, newDurations);
    }
  };

  const next = () => {
    if (selected === null) return;
    recordAndAdvance(selected);
  };

  const submit = async (finalAnswers, finalDurations) => {
    setSubmitting(true);
    try {
      const { data } = await api.post("/sessions/submit", {
        session_id: session.session_id,
        answers: finalAnswers,
        durations: finalDurations,
      });
      setConfetti(true);
      setTimeout(() => navigate(`/dashboard/report/${data.id}`), 1000);
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || "Could not submit");
    }
    setSubmitting(false);
  };

  if (loading) {
    return <div className="min-h-screen"><Navbar /><div className="text-center mt-40 text-muted-foreground">Loading...</div></div>;
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
          <p className="text-muted-foreground mt-2">Analyzing brain skills & generating your report...</p>
        </div>
      </div>
    );
  }

  const currentQ = questions[currentIdx];
  const progress = ((currentIdx) / questions.length) * 100;
  const timerPct = (timeLeft / (session?.time_per_question || 20)) * 100;

  return (
    <div className="min-h-screen relative overflow-hidden">
      <Navbar />
      <div className="floating-blob bg-blue-400/30 w-80 h-80 -top-10 -left-16"></div>
      <div className="floating-blob bg-pink-400/30 w-72 h-72 bottom-0 -right-10"></div>

      <main className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-8 relative">
        <div className="flex items-center justify-between text-sm text-muted-foreground font-bold">
          <span data-testid="assessment-progress-text">Question {currentIdx + 1} of {questions.length}</span>
          <span className="flex items-center gap-1.5" data-testid="assessment-timer">
            <Timer className={`w-4 h-4 ${timeLeft <= 5 ? "text-destructive" : ""}`} />
            <span className={timeLeft <= 5 ? "text-destructive" : ""}>{timeLeft}s</span>
          </span>
        </div>
        <Progress value={progress} className="mt-2 h-2 rounded-full" data-testid="assessment-progress-bar" />
        <div className="mt-1 h-1 rounded-full bg-muted overflow-hidden">
          <div className={`h-full rounded-full transition-all ${timeLeft <= 5 ? "bg-red-500" : "bg-orange-400"}`} style={{ width: `${timerPct}%` }} />
        </div>

        <Card key={currentQ.id} className="glass-card rounded-[2rem] border-0 p-6 sm:p-10 mt-6 animate-pop" data-testid="assessment-card">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 grid place-items-center text-2xl shadow-lg">
              <span>{CATEGORY_EMOJI[currentQ.category] || "🧠"}</span>
            </div>
            <div>
              <p className="text-xs font-bold uppercase text-muted-foreground tracking-widest">
                {currentQ.category.replace(/_/g, " ")} · Difficulty {currentQ.difficulty}
              </p>
            </div>
          </div>
          {currentQ.image && (
            <div className="mt-4 text-5xl text-center py-4">{currentQ.image}</div>
          )}
          <h2 className="mt-2 text-xl sm:text-2xl font-display font-black leading-snug" data-testid="assessment-question">
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
                      : "border-border bg-card hover:border-primary/40 hover:-translate-y-0.5"}`}
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

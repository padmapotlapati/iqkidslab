import { useEffect, useState, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import api from "@/lib/api";
import Navbar from "@/components/Navbar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ChevronRight, Sparkles, Target, Trophy } from "lucide-react";
import Confetti from "@/components/Confetti";
import { formatApiError } from "@/lib/api";

export default function DailyChallenge() {
  const [sp] = useSearchParams();
  const childId = sp.get("child");
  const navigate = useNavigate();
  const [state, setState] = useState({ loading: true, done: false });
  const [questions, setQuestions] = useState([]);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [selected, setSelected] = useState(null);
  const [result, setResult] = useState(null);
  const [confetti, setConfetti] = useState(false);

  useEffect(() => {
    if (!childId) { navigate("/dashboard/rewards"); return; }
    (async () => {
      try {
        const { data } = await api.get(`/daily-challenge/${childId}`);
        if (data.completed) {
          setResult({ score: data.score, total: data.questions.length, already: true });
        } else {
          setQuestions(data.questions);
        }
      } catch { toast.error("Could not load challenge"); }
      setState({ loading: false, done: false });
    })();
  }, [childId, navigate]);

  const submit = async (finalAnswers) => {
    try {
      const { data } = await api.post("/daily-challenge/submit", { child_id: childId, answers: finalAnswers });
      setResult(data);
      if (data.score >= 3) setConfetti(true);
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  };

  const next = () => {
    if (selected === null) return;
    const newAns = [...answers, selected];
    setAnswers(newAns);
    setSelected(null);
    if (current + 1 < questions.length) setCurrent(current + 1);
    else submit(newAns);
  };

  if (state.loading) return <div className="min-h-screen"><Navbar /><div className="text-center mt-40 text-muted-foreground">Loading...</div></div>;

  if (result) {
    return (
      <div className="min-h-screen relative overflow-hidden">
        <Navbar />
        <Confetti trigger={confetti} />
        <main className="mx-auto max-w-2xl px-4 py-14 relative">
          <Card className="glass-card rounded-[2rem] border-0 p-10 text-center animate-pop" data-testid="daily-result-card">
            <div className="w-20 h-20 rounded-3xl mx-auto bg-gradient-to-br from-yellow-300 to-orange-400 grid place-items-center animate-float">
              <Trophy className="w-10 h-10 text-white" />
            </div>
            <h1 className="mt-6 text-3xl font-display font-black" data-testid="daily-result-title">{result.already ? "You already played today!" : "Nice work!"}</h1>
            <p className="text-muted-foreground mt-2">Score: <span className="font-black text-foreground" data-testid="daily-score">{result.score}/{result.total || questions.length}</span></p>
            {!result.already && <p className="mt-2 text-sm text-emerald-600 font-bold">+{result.xp} XP · +{result.coins} coins · Streak {result.streak}!</p>}
            <Button onClick={() => navigate("/dashboard/rewards")} className="pill-btn mt-6 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-black" data-testid="back-to-rewards-btn">
              <Sparkles className="w-4 h-4 mr-2" /> Back to rewards
            </Button>
          </Card>
        </main>
      </div>
    );
  }

  const q = questions[current];
  const progress = (current / questions.length) * 100;

  return (
    <div className="min-h-screen relative overflow-hidden">
      <Navbar />
      <div className="floating-blob bg-blue-400/30 w-72 h-72 -top-10 -left-16"></div>
      <main className="mx-auto max-w-3xl px-4 py-8 relative">
        <div className="flex items-center gap-2 text-sm font-bold text-muted-foreground">
          <Target className="w-4 h-4 text-primary" />
          Daily Brain Challenge · Q{current + 1} of {questions.length}
        </div>
        <div className="h-2 mt-2 rounded-full bg-muted overflow-hidden">
          <div className="h-full bg-gradient-to-r from-blue-500 to-purple-600 transition-all" style={{ width: `${progress}%` }} />
        </div>

        <Card className="glass-card rounded-[2rem] border-0 p-6 sm:p-10 mt-6 animate-pop" data-testid="daily-question-card">
          {q.image && <div className="text-center text-5xl py-3">{q.image}</div>}
          <h2 className="text-xl sm:text-2xl font-display font-black leading-snug" data-testid="daily-question-prompt">{q.prompt}</h2>
          <div className="mt-6 grid sm:grid-cols-2 gap-3">
            {q.options.map((opt, i) => (
              <button key={i} onClick={() => setSelected(i)} data-testid={`daily-opt-${i}`}
                className={`text-left px-5 py-4 rounded-2xl border-2 font-bold transition-all
                  ${selected === i ? "border-primary bg-primary/10 shadow-lg scale-[1.02]" : "border-border bg-card hover:border-primary/40 hover:-translate-y-0.5"}`}>
                <span className={`inline-flex w-8 h-8 rounded-xl items-center justify-center font-black text-sm mr-3
                  ${selected === i ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                  {String.fromCharCode(65 + i)}
                </span>
                {opt}
              </button>
            ))}
          </div>
          <div className="mt-8 flex justify-end">
            <Button onClick={next} disabled={selected === null} data-testid="daily-next-btn"
              className="pill-btn h-12 px-8 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-black disabled:opacity-40">
              {current + 1 === questions.length ? "Finish" : "Next"} <ChevronRight className="w-5 h-5 ml-1" />
            </Button>
          </div>
        </Card>
      </main>
    </div>
  );
}

import { useEffect, useState, useMemo } from "react";
import { useNavigate, useParams, useSearchParams, Link } from "react-router-dom";
import api from "@/lib/api";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import Confetti from "@/components/Confetti";
import { Timer, RotateCcw, ChevronLeft, Trophy, Zap } from "lucide-react";

// -------- Individual Games --------

function MemoryMatch({ onFinish }) {
  const emojis = useMemo(() => ["🎈","🚀","🧩","🎨","⭐","🌈","🎯","🎮"], []);
  const [cards, setCards] = useState([]);
  const [flipped, setFlipped] = useState([]);
  const [matched, setMatched] = useState([]);
  const [moves, setMoves] = useState(0);
  const [start] = useState(Date.now());

  useEffect(() => {
    const doubled = [...emojis, ...emojis].map((e, i) => ({ id: i, emoji: e }));
    setCards(doubled.sort(() => Math.random() - 0.5));
  }, [emojis]);

  useEffect(() => {
    if (flipped.length === 2) {
      const [a, b] = flipped;
      if (cards[a].emoji === cards[b].emoji) {
        setMatched(m => [...m, a, b]);
        setFlipped([]);
      } else {
        const t = setTimeout(() => setFlipped([]), 700);
        return () => clearTimeout(t);
      }
      setMoves(m => m + 1);
    }
  }, [flipped, cards]);

  useEffect(() => {
    if (matched.length === cards.length && cards.length > 0) {
      const duration = Math.round((Date.now() - start) / 1000);
      const score = Math.max(20, 200 - moves * 5 - duration);
      setTimeout(() => onFinish({ score, duration, moves }), 400);
    }
  }, [matched, cards, moves, start, onFinish]);

  const flip = (i) => {
    if (flipped.length === 2 || flipped.includes(i) || matched.includes(i)) return;
    setFlipped(f => [...f, i]);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <span className="text-sm font-bold text-muted-foreground">Moves: <span className="text-foreground" data-testid="mm-moves">{moves}</span></span>
        <span className="text-sm font-bold text-muted-foreground">Matched: {matched.length / 2} / {cards.length / 2}</span>
      </div>
      <div className="grid grid-cols-4 gap-3">
        {cards.map((c, i) => {
          const isShown = flipped.includes(i) || matched.includes(i);
          return (
            <button key={c.id} onClick={() => flip(i)} data-testid={`mm-card-${i}`}
              className={`aspect-square rounded-2xl text-4xl grid place-items-center font-black transition-all
                ${isShown ? "bg-gradient-to-br from-blue-500 to-purple-600 text-white scale-105" : "bg-muted hover:bg-muted-foreground/20"}`}>
              {isShown ? c.emoji : "?"}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ReactionTap({ onFinish }) {
  const [state, setState] = useState("waiting"); // waiting|ready|clicked|too-early
  const [startAt, setStartAt] = useState(0);
  const [results, setResults] = useState([]);
  const round = results.length + 1;

  const begin = () => {
    setState("waiting");
    const delay = 1500 + Math.random() * 2500;
    const t = setTimeout(() => { setState("ready"); setStartAt(Date.now()); }, delay);
    return () => clearTimeout(t);
  };

  useEffect(() => { const cleanup = begin(); return cleanup; }, []); // eslint-disable-line

  const handleClick = () => {
    if (state === "waiting") { setState("too-early"); setTimeout(begin, 1200); return; }
    if (state === "ready") {
      const ms = Date.now() - startAt;
      const newRes = [...results, ms];
      setResults(newRes);
      if (newRes.length >= 5) {
        const avg = Math.round(newRes.reduce((a,b)=>a+b,0) / newRes.length);
        const score = Math.max(20, 400 - Math.round(avg / 5));
        setTimeout(() => onFinish({ score, duration: 0, avg_ms: avg }), 300);
      } else {
        setTimeout(begin, 800);
      }
    }
  };

  const color = state === "ready" ? "from-emerald-500 to-green-500" : state === "too-early" ? "from-red-500 to-orange-500" : "from-slate-400 to-slate-500";
  const label = state === "ready" ? "TAP NOW!" : state === "too-early" ? "Too early! Restarting..." : "Wait for green...";

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <span className="text-sm font-bold text-muted-foreground">Round: <span className="text-foreground" data-testid="rt-round">{round}</span> / 5</span>
        {results.length > 0 && <span className="text-sm font-bold text-muted-foreground">Last: {results[results.length - 1]}ms</span>}
      </div>
      <button onClick={handleClick} data-testid="rt-tap-area"
        className={`w-full h-64 rounded-3xl bg-gradient-to-br ${color} text-white text-3xl font-display font-black shadow-xl transition-all active:scale-95`}>
        {label}
      </button>
      <p className="text-xs text-muted-foreground mt-3 text-center">When the box turns green, tap as fast as you can.</p>
    </div>
  );
}

function FocusFind({ onFinish }) {
  const [round, setRound] = useState(0);
  const [score, setScore] = useState(0);
  const [start] = useState(Date.now());
  const items = ["🍎","🍎","🍎","🍎","🍎","🍎","🍎","🍏","🍎","🍎","🍎","🍎"];

  const options = useMemo(() => {
    const arr = [...items];
    // random position for odd one out already set
    return arr.sort(() => Math.random() - 0.5);
  }, [round]); // eslint-disable-line

  const oddIndex = options.findIndex(x => x === "🍏");

  const pick = (i) => {
    const isCorrect = i === oddIndex;
    if (isCorrect) setScore(s => s + 20);
    if (round + 1 >= 5) {
      const duration = Math.round((Date.now() - start) / 1000);
      const final = score + (isCorrect ? 20 : 0);
      setTimeout(() => onFinish({ score: final, duration }), 200);
    } else {
      setRound(r => r + 1);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <span className="text-sm font-bold text-muted-foreground">Round: <span className="text-foreground" data-testid="ff-round">{round + 1}</span> / 5</span>
        <span className="text-sm font-bold text-muted-foreground">Score: {score}</span>
      </div>
      <p className="text-center font-bold mb-4">Tap the one that&apos;s different!</p>
      <div className="grid grid-cols-4 gap-3">
        {options.map((emoji, i) => (
          <button key={i} onClick={() => pick(i)} data-testid={`ff-item-${i}`}
            className="aspect-square rounded-2xl text-4xl grid place-items-center bg-muted hover:bg-muted-foreground/20 transition-all">
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
}

const GAMES = {
  memory_match: { name: "Memory Match", Component: MemoryMatch, color: "from-pink-500 to-rose-500" },
  reaction_tap: { name: "Reaction Tap", Component: ReactionTap, color: "from-orange-500 to-red-500" },
  focus_find: { name: "Focus Find", Component: FocusFind, color: "from-blue-500 to-cyan-500" },
  pattern_hunt: { name: "Pattern Hunt", Component: PatternHunt, color: "from-purple-500 to-fuchsia-500" },
  math_dash: { name: "Math Dash", Component: MathDash, color: "from-emerald-500 to-teal-500" },
  word_link: { name: "Word Link", Component: WordLink, color: "from-yellow-500 to-orange-500" },
  logic_flow: { name: "Logic Flow", Component: LogicFlow, color: "from-indigo-500 to-purple-500" },
};

function PatternHunt({ onFinish }) {
  const [round, setRound] = useState(0);
  const [score, setScore] = useState(0);
  const [start] = useState(Date.now());
  const puzzles = useMemo(() => [
    { seq: [2, 4, 6, 8], options: [9, 10, 11, 12], answer: 1 },
    { seq: [1, 4, 9, 16], options: [20, 25, 30, 36], answer: 1 },
    { seq: [3, 6, 12, 24], options: [36, 42, 48, 50], answer: 2 },
    { seq: [1, 1, 2, 3, 5], options: [7, 8, 9, 10], answer: 1 },
    { seq: [5, 10, 20, 40], options: [60, 70, 80, 100], answer: 2 },
  ], []);
  const p = puzzles[round];
  const pick = (i) => {
    const newScore = score + (i === p.answer ? 20 : 0);
    setScore(newScore);
    if (round + 1 >= puzzles.length) setTimeout(() => onFinish({ score: newScore, duration: Math.round((Date.now() - start) / 1000) }), 200);
    else setRound(r => r + 1);
  };
  return (
    <div>
      <div className="flex justify-between mb-4 text-sm font-bold text-muted-foreground">
        <span>Round: <span className="text-foreground" data-testid="ph-round">{round + 1}</span>/{puzzles.length}</span>
        <span>Score: {score}</span>
      </div>
      <div className="rounded-2xl bg-muted p-6 text-center">
        <p className="text-xs font-bold uppercase text-muted-foreground">Which number comes next?</p>
        <p className="text-3xl sm:text-4xl font-display font-black mt-2">{p.seq.join(", ")}, ?</p>
      </div>
      <div className="grid grid-cols-2 gap-3 mt-4">
        {p.options.map((o, i) => (
          <button key={i} onClick={() => pick(i)} data-testid={`ph-option-${i}`}
            className="px-5 py-4 rounded-2xl border-2 font-black text-lg bg-card hover:border-primary hover:-translate-y-0.5 transition-all">{o}</button>
        ))}
      </div>
    </div>
  );
}

function MathDash({ onFinish }) {
  const [q, setQ] = useState(null);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);

  const genQ = () => {
    const ops = ["+", "-", "×"];
    const op = ops[Math.floor(Math.random() * ops.length)];
    let a = Math.floor(Math.random() * 12) + 1, b = Math.floor(Math.random() * 12) + 1;
    let ans;
    if (op === "+") ans = a + b;
    else if (op === "-") { if (b > a) [a, b] = [b, a]; ans = a - b; }
    else ans = a * b;
    const opts = new Set([ans]);
    while (opts.size < 4) opts.add(Math.max(0, ans + Math.floor(Math.random() * 10) - 5));
    return { text: `${a} ${op} ${b}`, ans, opts: Array.from(opts).sort(() => Math.random() - 0.5) };
  };

  useEffect(() => { setQ(genQ()); }, []);
  useEffect(() => {
    const t = setInterval(() => setTimeLeft(v => v <= 1 ? 0 : v - 1), 1000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    if (timeLeft === 0) onFinish({ score, duration: 30 });
  }, [timeLeft, score, onFinish]);

  const pick = (n) => {
    if (n === q.ans) setScore(s => s + 15);
    setQ(genQ());
  };

  if (!q) return null;
  return (
    <div>
      <div className="flex justify-between mb-4 text-sm font-bold">
        <span className="text-muted-foreground">Score: <span className="text-foreground" data-testid="md-score">{score}</span></span>
        <span className={timeLeft <= 5 ? "text-red-500" : "text-muted-foreground"}>Time: {timeLeft}s</span>
      </div>
      <div className="rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 text-white p-8 text-center">
        <p className="text-xs font-bold uppercase text-white/70">Solve it!</p>
        <p className="text-5xl font-display font-black mt-2">{q.text} = ?</p>
      </div>
      <div className="grid grid-cols-2 gap-3 mt-4">
        {q.opts.map((o, i) => (
          <button key={i} onClick={() => pick(o)} data-testid={`md-opt-${i}`}
            className="px-5 py-4 rounded-2xl border-2 font-black text-2xl bg-card hover:border-emerald-500 hover:-translate-y-0.5 transition-all">{o}</button>
        ))}
      </div>
    </div>
  );
}

function WordLink({ onFinish }) {
  const [round, setRound] = useState(0);
  const [score, setScore] = useState(0);
  const [start] = useState(Date.now());
  const puzzles = useMemo(() => [
    { q: "Which word rhymes with CAT?", opts: ["Dog", "Bat", "Fish", "Sun"], a: 1 },
    { q: "Synonym of BIG:", opts: ["Small", "Huge", "Tiny", "Thin"], a: 1 },
    { q: "Opposite of HAPPY:", opts: ["Joyful", "Sad", "Excited", "Sleepy"], a: 1 },
    { q: "Which word rhymes with STAR?", opts: ["Sun", "Moon", "Jar", "Sky"], a: 2 },
    { q: "Synonym of QUICK:", opts: ["Slow", "Fast", "Late", "Old"], a: 1 },
  ], []);
  const p = puzzles[round];
  const pick = (i) => {
    const newScore = score + (i === p.a ? 20 : 0);
    setScore(newScore);
    if (round + 1 >= puzzles.length) setTimeout(() => onFinish({ score: newScore, duration: Math.round((Date.now() - start) / 1000) }), 200);
    else setRound(r => r + 1);
  };
  return (
    <div>
      <div className="flex justify-between mb-4 text-sm font-bold text-muted-foreground">
        <span>Round: <span className="text-foreground" data-testid="wl-round">{round + 1}</span>/{puzzles.length}</span>
        <span>Score: {score}</span>
      </div>
      <div className="rounded-2xl bg-gradient-to-br from-yellow-500 to-orange-500 text-white p-6 text-center">
        <p className="text-xl sm:text-2xl font-display font-black">{p.q}</p>
      </div>
      <div className="grid grid-cols-2 gap-3 mt-4">
        {p.opts.map((o, i) => (
          <button key={i} onClick={() => pick(i)} data-testid={`wl-opt-${i}`}
            className="px-5 py-4 rounded-2xl border-2 font-black text-lg bg-card hover:border-yellow-500 hover:-translate-y-0.5 transition-all">{o}</button>
        ))}
      </div>
    </div>
  );
}

function LogicFlow({ onFinish }) {
  const [round, setRound] = useState(0);
  const [score, setScore] = useState(0);
  const [start] = useState(Date.now());
  const puzzles = useMemo(() => [
    { q: "If all cats are animals, and Milo is a cat, Milo is:", opts: ["A plant", "An animal", "A car", "Cannot say"], a: 1 },
    { q: "A > B, B > C. So:", opts: ["A < C", "A = C", "A > C", "Cannot say"], a: 2 },
    { q: "Today is Wednesday. Two days later is:", opts: ["Thursday", "Friday", "Saturday", "Sunday"], a: 1 },
    { q: "12 apples split equally among 3 kids. Each gets:", opts: ["3", "4", "5", "6"], a: 1 },
    { q: "If 5 pens cost $10, one pen costs:", opts: ["$1", "$2", "$3", "$5"], a: 1 },
  ], []);
  const p = puzzles[round];
  const pick = (i) => {
    const newScore = score + (i === p.a ? 20 : 0);
    setScore(newScore);
    if (round + 1 >= puzzles.length) setTimeout(() => onFinish({ score: newScore, duration: Math.round((Date.now() - start) / 1000) }), 200);
    else setRound(r => r + 1);
  };
  return (
    <div>
      <div className="flex justify-between mb-4 text-sm font-bold text-muted-foreground">
        <span>Round: <span className="text-foreground" data-testid="lf-round">{round + 1}</span>/{puzzles.length}</span>
        <span>Score: {score}</span>
      </div>
      <div className="rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-500 text-white p-6">
        <p className="text-lg sm:text-xl font-display font-black">{p.q}</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
        {p.opts.map((o, i) => (
          <button key={i} onClick={() => pick(i)} data-testid={`lf-opt-${i}`}
            className="px-5 py-4 rounded-2xl border-2 font-black text-left bg-card hover:border-indigo-500 hover:-translate-y-0.5 transition-all">
            <span className="inline-flex w-7 h-7 rounded-lg bg-muted items-center justify-center text-sm mr-3 font-black">{String.fromCharCode(65 + i)}</span>
            {o}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function BrainGamePlay() {
  const { gameKey } = useParams();
  const [sp] = useSearchParams();
  const navigate = useNavigate();
  const childId = sp.get("child");
  const [done, setDone] = useState(null);
  const [confetti, setConfetti] = useState(false);
  const [replayKey, setReplayKey] = useState(0);

  const game = GAMES[gameKey];
  if (!game) return <div className="min-h-screen"><Navbar /><div className="text-center mt-40 text-muted-foreground">Game not found</div></div>;

  const handleFinish = async (result) => {
    setDone(result);
    setConfetti(true);
    try {
      await api.post("/games/score", {
        child_id: childId, game_key: gameKey,
        score: result.score, duration_seconds: result.duration || 0, metadata: result,
      });
    } catch { toast.error("Could not save score"); }
  };

  const restart = () => { setDone(null); setConfetti(false); setReplayKey(k => k + 1); };

  return (
    <div className="min-h-screen relative overflow-hidden">
      <Navbar />
      <Confetti trigger={confetti} />
      <div className="floating-blob bg-purple-400/30 w-72 h-72 -top-10 -left-16"></div>
      <div className="floating-blob bg-pink-400/30 w-72 h-72 bottom-0 -right-16"></div>

      <main className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8 py-8 relative">
        <button onClick={() => navigate("/dashboard/games")} data-testid="game-back-btn" className="text-sm font-bold text-muted-foreground hover:text-foreground flex items-center gap-1 mb-4">
          <ChevronLeft className="w-4 h-4" /> Back to games
        </button>
        <div className={`rounded-[2rem] p-6 sm:p-8 bg-gradient-to-br ${game.color} text-white lift-shadow relative overflow-hidden`}>
          <div className="floating-blob bg-white/20 w-40 h-40 -top-10 -right-10"></div>
          <h1 className="text-3xl font-display font-black relative" data-testid="game-title">{game.name}</h1>
        </div>

        <Card className="glass-card rounded-3xl border-0 p-6 sm:p-8 mt-5" data-testid="game-play-area">
          {done ? (
            <div className="text-center animate-pop">
              <div className="w-20 h-20 rounded-3xl mx-auto bg-gradient-to-br from-yellow-300 to-orange-400 grid place-items-center animate-float">
                <Trophy className="w-9 h-9 text-white" />
              </div>
              <h2 className="text-3xl font-display font-black mt-5">You scored {done.score}!</h2>
              <p className="text-muted-foreground mt-1 text-sm">Great job — XP added to your profile.</p>
              <div className="mt-6 flex gap-3 justify-center">
                <Button onClick={restart} className="pill-btn bg-gradient-to-r from-blue-500 to-purple-600 text-white font-black" data-testid="game-play-again-btn">
                  <RotateCcw className="w-4 h-4 mr-2" /> Play again
                </Button>
                <Link to="/dashboard/games"><Button variant="outline" className="pill-btn font-bold">Back to games</Button></Link>
              </div>
            </div>
          ) : (
            <game.Component key={replayKey} onFinish={handleFinish} />
          )}
        </Card>
      </main>
    </div>
  );
}

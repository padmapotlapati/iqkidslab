import { useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate, useParams, useSearchParams, Link } from "react-router-dom";
import api from "@/lib/api";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import Confetti from "@/components/Confetti";
import { RotateCcw, ChevronLeft, Trophy, Zap, Coins } from "lucide-react";

// ================= Utilities =================
const shuffle = (arr) => [...arr].sort(() => Math.random() - 0.5);
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

// ================= 1. MemoryMatch =================
function MemoryMatch({ onFinish, meta }) {
  const pairCount = meta?.variant === "pairs4" ? 4 : meta?.variant === "pairs6" ? 6 : 8;
  const emojis = useMemo(() => ["🎈","🚀","🧩","🎨","⭐","🌈","🎯","🎮","🐶","🦄"].slice(0, pairCount), [pairCount]);
  const [cards, setCards] = useState([]);
  const [flipped, setFlipped] = useState([]);
  const [matched, setMatched] = useState([]);
  const [moves, setMoves] = useState(0);
  const [start] = useState(Date.now());

  useEffect(() => {
    setCards(shuffle([...emojis, ...emojis].map((e, i) => ({ id: i, emoji: e }))));
  }, [emojis]);

  useEffect(() => {
    if (flipped.length === 2) {
      const [a, b] = flipped;
      if (cards[a]?.emoji === cards[b]?.emoji) {
        setMatched(m => [...m, a, b]); setFlipped([]);
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

  const cols = pairCount <= 4 ? "grid-cols-4" : pairCount <= 6 ? "grid-cols-4" : "grid-cols-4 sm:grid-cols-4";
  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <span className="text-sm font-bold text-muted-foreground">Moves: <span className="text-foreground" data-testid="mm-moves">{moves}</span></span>
        <span className="text-sm font-bold text-muted-foreground">Matched: {matched.length / 2} / {cards.length / 2}</span>
      </div>
      <div className={`grid ${cols} gap-3`}>
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

// ================= 2. ReactionTap =================
function ReactionTap({ onFinish }) {
  const [state, setState] = useState("waiting");
  const [startAt, setStartAt] = useState(0);
  const [results, setResults] = useState([]);
  const round = results.length + 1;

  const begin = useCallback(() => {
    setState("waiting");
    const delay = 1500 + Math.random() * 2500;
    const t = setTimeout(() => { setState("ready"); setStartAt(Date.now()); }, delay);
    return () => clearTimeout(t);
  }, []);
  useEffect(() => { const cleanup = begin(); return cleanup; }, [begin]);

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
      } else { setTimeout(begin, 800); }
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

// ================= 3. FocusFind =================
function FocusFind({ onFinish }) {
  const [round, setRound] = useState(0);
  const [score, setScore] = useState(0);
  const [start] = useState(Date.now());
  const options = useMemo(() => shuffle(["🍎","🍎","🍎","🍎","🍎","🍎","🍎","🍏","🍎","🍎","🍎","🍎"]), [round]);
  const oddIndex = options.findIndex(x => x === "🍏");

  const pick = (i) => {
    const isCorrect = i === oddIndex;
    if (isCorrect) setScore(s => s + 20);
    if (round + 1 >= 5) {
      const duration = Math.round((Date.now() - start) / 1000);
      const final = score + (isCorrect ? 20 : 0);
      setTimeout(() => onFinish({ score: final, duration }), 200);
    } else { setRound(r => r + 1); }
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

// ================= 4. PatternHunt =================
function PatternHunt({ onFinish, meta }) {
  const puzzles = useMemo(() => {
    const easy = [
      { seq: [1, 2, 3, 4], options: [5, 6, 7, 8], answer: 0 },
      { seq: [2, 4, 6, 8], options: [9, 10, 11, 12], answer: 1 },
      { seq: [10, 20, 30, 40], options: [45, 50, 55, 60], answer: 1 },
      { seq: [1, 3, 5, 7], options: [8, 9, 10, 11], answer: 1 },
      { seq: [5, 10, 15, 20], options: [22, 23, 24, 25], answer: 3 },
    ];
    const medium = [
      { seq: [2, 4, 6, 8], options: [9, 10, 11, 12], answer: 1 },
      { seq: [1, 4, 9, 16], options: [20, 25, 30, 36], answer: 1 },
      { seq: [3, 6, 12, 24], options: [36, 42, 48, 50], answer: 2 },
      { seq: [1, 1, 2, 3, 5], options: [7, 8, 9, 10], answer: 1 },
      { seq: [5, 10, 20, 40], options: [60, 70, 80, 100], answer: 2 },
    ];
    const hard = [
      { seq: [1, 1, 2, 3, 5, 8], options: [11, 12, 13, 14], answer: 2 },
      { seq: [2, 3, 5, 7, 11], options: [12, 13, 14, 15], answer: 1 },
      { seq: [1, 4, 9, 16, 25], options: [30, 32, 36, 42], answer: 2 },
      { seq: [2, 6, 12, 20, 30], options: [40, 42, 44, 46], answer: 1 },
      { seq: [1, 8, 27, 64], options: [100, 125, 150, 216], answer: 1 },
    ];
    return meta?.variant === "easy" ? easy : meta?.variant === "hard" ? hard : medium;
  }, [meta]);
  const [round, setRound] = useState(0);
  const [score, setScore] = useState(0);
  const [start] = useState(Date.now());
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

// ================= 5. MathDash =================
function MathDash({ onFinish, meta }) {
  const [q, setQ] = useState(null);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);

  const genQ = useCallback(() => {
    const variant = meta?.variant || "mixed";
    const ops = variant === "add_sub" ? ["+", "-"] : variant === "hard" ? ["+","-","×","÷"] : ["+","-","×"];
    const op = ops[Math.floor(Math.random() * ops.length)];
    const maxN = variant === "add_sub" ? 12 : variant === "hard" ? 20 : 15;
    let a = randInt(1, maxN), b = randInt(1, maxN);
    let ans;
    if (op === "+") ans = a + b;
    else if (op === "-") { if (b > a) [a, b] = [b, a]; ans = a - b; }
    else if (op === "×") ans = a * b;
    else { ans = a; a = a * b; }
    const opts = new Set([ans]);
    while (opts.size < 4) opts.add(Math.max(0, ans + randInt(-5, 5) || 1));
    return { text: `${a} ${op} ${b}`, ans, opts: shuffle([...opts]) };
  }, [meta]);

  useEffect(() => { setQ(genQ()); }, [genQ]);
  useEffect(() => {
    const t = setInterval(() => setTimeLeft(v => v <= 1 ? 0 : v - 1), 1000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => { if (timeLeft === 0) onFinish({ score, duration: 30 }); }, [timeLeft, score, onFinish]);

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

// ================= 6. WordLink =================
function WordLink({ onFinish }) {
  const puzzles = useMemo(() => [
    { q: "Which word rhymes with CAT?", opts: ["Dog", "Bat", "Fish", "Sun"], a: 1 },
    { q: "Synonym of BIG:", opts: ["Small", "Huge", "Tiny", "Thin"], a: 1 },
    { q: "Opposite of HAPPY:", opts: ["Joyful", "Sad", "Excited", "Sleepy"], a: 1 },
    { q: "Which word rhymes with STAR?", opts: ["Sun", "Moon", "Jar", "Sky"], a: 2 },
    { q: "Synonym of QUICK:", opts: ["Slow", "Fast", "Late", "Old"], a: 1 },
  ], []);
  const [round, setRound] = useState(0);
  const [score, setScore] = useState(0);
  const [start] = useState(Date.now());
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

// ================= 7. LogicFlow =================
function LogicFlow({ onFinish, meta }) {
  const puzzles = useMemo(() => {
    const std = [
      { q: "If all cats are animals, and Milo is a cat, Milo is:", opts: ["A plant", "An animal", "A car", "Cannot say"], a: 1 },
      { q: "A > B, B > C. So:", opts: ["A < C", "A = C", "A > C", "Cannot say"], a: 2 },
      { q: "Today is Wednesday. Two days later is:", opts: ["Thursday", "Friday", "Saturday", "Sunday"], a: 1 },
      { q: "12 apples split equally among 3 kids. Each gets:", opts: ["3", "4", "5", "6"], a: 1 },
      { q: "If 5 pens cost $10, one pen costs:", opts: ["$1", "$2", "$3", "$5"], a: 1 },
    ];
    const hard = [
      { q: "All roses are flowers. Some flowers fade quickly. So:", opts: ["All roses fade quickly", "No roses fade quickly", "Some roses may fade quickly", "Cannot conclude"], a: 3 },
      { q: "If P → Q and ¬Q, then:", opts: ["P is true", "P is false", "Q is true", "Cannot say"], a: 1 },
      { q: "A train leaves at 3pm going 60km/h. At 5pm it has traveled:", opts: ["60 km", "90 km", "120 km", "150 km"], a: 2 },
      { q: "A cube has how many edges?", opts: ["6", "8", "12", "14"], a: 2 },
      { q: "Which does NOT belong: Triangle, Square, Circle, Cylinder?", opts: ["Triangle", "Square", "Circle", "Cylinder"], a: 3 },
    ];
    return meta?.variant === "hard" ? hard : std;
  }, [meta]);
  const [round, setRound] = useState(0);
  const [score, setScore] = useState(0);
  const [start] = useState(Date.now());
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

// ================= 8. ColorMatch (NEW) =================
// Easy: tap the swatch matching the color WORD (word text = ink color).
// Stroop (hard): tap the INK color, ignore the word text.
function ColorMatch({ onFinish, meta }) {
  const stroop = meta?.variant === "stroop";
  const colors = useMemo(() => [
    { name: "Red",    hex: "#ef4444" },
    { name: "Green",  hex: "#22c55e" },
    { name: "Blue",   hex: "#3b82f6" },
    { name: "Yellow", hex: "#f59e0b" },
    { name: "Purple", hex: "#a855f7" },
    { name: "Pink",   hex: "#ec4899" },
  ], []);
  const [round, setRound] = useState(0);
  const [score, setScore] = useState(0);
  const [start] = useState(Date.now());
  const TOTAL = 8;

  const puzzle = useMemo(() => {
    const wordColor = colors[randInt(0, colors.length - 1)];
    const inkColor = stroop
      ? colors.filter(c => c.name !== wordColor.name)[randInt(0, colors.length - 2)]
      : wordColor;
    const target = stroop ? inkColor : wordColor;
    const distractors = shuffle(colors.filter(c => c.name !== target.name)).slice(0, 3);
    const opts = shuffle([target, ...distractors]);
    return { wordColor, inkColor, target, opts };
  }, [round, colors, stroop]);

  const pick = (c) => {
    const correct = c.name === puzzle.target.name;
    const newScore = score + (correct ? 25 : 0);
    setScore(newScore);
    if (round + 1 >= TOTAL) setTimeout(() => onFinish({ score: newScore, duration: Math.round((Date.now() - start) / 1000) }), 200);
    else setRound(r => r + 1);
  };

  return (
    <div>
      <div className="flex justify-between mb-4 text-sm font-bold text-muted-foreground">
        <span>Round: <span className="text-foreground" data-testid="cm-round">{round + 1}</span>/{TOTAL}</span>
        <span>Score: {score}</span>
      </div>
      <p className="text-center text-sm text-muted-foreground mb-2">
        {stroop ? "Tap the INK color (ignore the word)" : "Tap the color that matches"}
      </p>
      <div className="rounded-2xl bg-muted p-8 text-center">
        <p className="text-5xl sm:text-6xl font-display font-black" style={{ color: puzzle.inkColor.hex }} data-testid="cm-word">
          {puzzle.wordColor.name.toUpperCase()}
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3 mt-4">
        {puzzle.opts.map((c, i) => (
          <button key={i} onClick={() => pick(c)} data-testid={`cm-opt-${i}`}
            className="h-16 rounded-2xl font-black text-white text-lg shadow-lg hover:scale-105 transition-transform"
            style={{ backgroundColor: c.hex }}>
            {c.name}
          </button>
        ))}
      </div>
    </div>
  );
}

// ================= 9. SequenceRecall (NEW) =================
// Watch a growing sequence of colored buttons, then tap them in order.
function SequenceRecall({ onFinish, meta }) {
  const startLen = meta?.variant === "length3" ? 3 : meta?.variant === "length5" ? 5 : 4;
  const PALETTE = useMemo(() => [
    { id: 0, name: "red",    bg: "bg-red-500",    ring: "ring-red-300" },
    { id: 1, name: "green",  bg: "bg-emerald-500",ring: "ring-emerald-300" },
    { id: 2, name: "blue",   bg: "bg-blue-500",   ring: "ring-blue-300" },
    { id: 3, name: "yellow", bg: "bg-yellow-400", ring: "ring-yellow-200" },
  ], []);
  const [phase, setPhase] = useState("show"); // show|input|done
  const [sequence, setSequence] = useState([]);
  const [litIdx, setLitIdx] = useState(-1);
  const [userIdx, setUserIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [round, setRound] = useState(0);
  const [start] = useState(Date.now());
  const MAX_ROUNDS = 5;

  // build sequence for current round
  useEffect(() => {
    const len = startLen + round;
    const seq = Array.from({ length: len }, () => randInt(0, PALETTE.length - 1));
    setSequence(seq);
    setUserIdx(0);
    setPhase("show");
  }, [round, startLen, PALETTE.length]);

  // Play back the sequence
  useEffect(() => {
    if (phase !== "show" || sequence.length === 0) return;
    let i = 0;
    setLitIdx(-1);
    const step = () => {
      if (i >= sequence.length) {
        setLitIdx(-1);
        setPhase("input");
        return;
      }
      setLitIdx(sequence[i]);
      setTimeout(() => { setLitIdx(-1); i++; setTimeout(step, 220); }, 550);
    };
    const t = setTimeout(step, 500);
    return () => clearTimeout(t);
  }, [phase, sequence]);

  const tap = (btnId) => {
    if (phase !== "input") return;
    const expected = sequence[userIdx];
    if (btnId !== expected) {
      // wrong: end game
      const dur = Math.round((Date.now() - start) / 1000);
      onFinish({ score, duration: dur, rounds: round });
      return;
    }
    const nextIdx = userIdx + 1;
    if (nextIdx >= sequence.length) {
      const gained = 20 + round * 10;
      const newScore = score + gained;
      setScore(newScore);
      if (round + 1 >= MAX_ROUNDS) {
        const dur = Math.round((Date.now() - start) / 1000);
        setTimeout(() => onFinish({ score: newScore, duration: dur, rounds: round + 1 }), 250);
      } else {
        setTimeout(() => setRound(r => r + 1), 400);
      }
    } else {
      setUserIdx(nextIdx);
    }
  };

  return (
    <div>
      <div className="flex justify-between mb-4 text-sm font-bold text-muted-foreground">
        <span>Round: <span className="text-foreground" data-testid="sr-round">{round + 1}</span>/{MAX_ROUNDS}</span>
        <span>Length: {sequence.length}</span>
        <span>Score: {score}</span>
      </div>
      <p className="text-center text-sm text-muted-foreground mb-4">
        {phase === "show" ? "Watch carefully…" : phase === "input" ? "Your turn — tap in order!" : ""}
      </p>
      <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
        {PALETTE.map((c) => {
          const lit = litIdx === c.id;
          return (
            <button
              key={c.id}
              disabled={phase !== "input"}
              onClick={() => tap(c.id)}
              data-testid={`sr-btn-${c.id}`}
              className={`h-28 sm:h-32 rounded-3xl ${c.bg} transition-all
                ${lit ? "opacity-100 ring-8 " + c.ring + " scale-105" : "opacity-70"}
                ${phase === "input" ? "hover:opacity-100 hover:scale-105 cursor-pointer" : "cursor-default"}`}
            />
          );
        })}
      </div>
    </div>
  );
}

// ================= 10. OddOneOut (NEW) =================
function OddOneOut({ onFinish, meta }) {
  const variant = meta?.variant || "shapes";
  const rounds = useMemo(() => {
    if (variant === "big_small") {
      return [
        { items: ["🐘","🐘","🐘","🐭","🐘","🐘"], answer: 3 },
        { items: ["🍉","🍉","🍇","🍉","🍉","🍉"], answer: 2 },
        { items: ["🚗","🚗","🚗","🚗","🚲","🚗"], answer: 4 },
        { items: ["🌳","🌱","🌳","🌳","🌳","🌳"], answer: 1 },
        { items: ["🐳","🐟","🐳","🐳","🐳","🐳"], answer: 1 },
      ];
    }
    if (variant === "numbers") {
      return [
        { items: [2, 4, 6, 8, 9, 12], answer: 4 },   // odd number among evens
        { items: [5, 10, 15, 20, 22, 25], answer: 4 },
        { items: [3, 9, 27, 81, 100, 243], answer: 4 },
        { items: [2, 3, 5, 7, 9, 11], answer: 4 },   // 9 not prime
        { items: [1, 4, 9, 16, 20, 25], answer: 4 }, // not a square
      ];
    }
    // default: shapes
    return [
      { items: ["🔴","🔴","🔴","🔵","🔴","🔴"], answer: 3 },
      { items: ["⭐","⭐","🔶","⭐","⭐","⭐"], answer: 2 },
      { items: ["🟩","🟩","🟩","🟩","🟪","🟩"], answer: 4 },
      { items: ["🍎","🍎","🍎","🍎","🍎","🍌"], answer: 5 },
      { items: ["🐶","🐱","🐶","🐶","🐶","🐶"], answer: 1 },
    ];
  }, [variant]);
  const [round, setRound] = useState(0);
  const [score, setScore] = useState(0);
  const [start] = useState(Date.now());
  const r = rounds[round];

  const pick = (i) => {
    const correct = i === r.answer;
    const newScore = score + (correct ? 20 : 0);
    setScore(newScore);
    if (round + 1 >= rounds.length) setTimeout(() => onFinish({ score: newScore, duration: Math.round((Date.now() - start) / 1000) }), 200);
    else setRound(x => x + 1);
  };
  return (
    <div>
      <div className="flex justify-between mb-4 text-sm font-bold text-muted-foreground">
        <span>Round: <span className="text-foreground" data-testid="oo-round">{round + 1}</span>/{rounds.length}</span>
        <span>Score: {score}</span>
      </div>
      <p className="text-center font-bold mb-4">Tap the one that doesn&apos;t belong</p>
      <div className="grid grid-cols-3 gap-3">
        {r.items.map((item, i) => (
          <button key={i} onClick={() => pick(i)} data-testid={`oo-item-${i}`}
            className="aspect-square rounded-2xl text-4xl sm:text-5xl grid place-items-center bg-muted hover:bg-muted-foreground/20 hover:scale-105 transition-all font-black">
            {item}
          </button>
        ))}
      </div>
    </div>
  );
}

// ================= 11. WordScramble (NEW) =================
function WordScramble({ onFinish, meta }) {
  const bank = useMemo(() => {
    const medium = ["apple","house","music","water","happy","brain","light","paper","dream","cloud"];
    const hard = ["algorithm","evidence","universe","paradigm","symphony","harmony","integral","logical","abstract","gravity"];
    return meta?.variant === "hard" ? hard : medium;
  }, [meta]);

  const puzzles = useMemo(() => {
    const chosen = shuffle(bank).slice(0, 5);
    return chosen.map(w => {
      // Ensure scramble differs from original
      let s = w;
      while (s === w) s = shuffle(w.split("")).join("");
      const wrong = shuffle(bank.filter(x => x !== w)).slice(0, 3);
      const opts = shuffle([w, ...wrong]);
      return { word: w, scrambled: s, opts, answer: opts.indexOf(w) };
    });
  }, [bank]);

  const [round, setRound] = useState(0);
  const [score, setScore] = useState(0);
  const [start] = useState(Date.now());
  const p = puzzles[round];

  const pick = (i) => {
    const correct = i === p.answer;
    const newScore = score + (correct ? 25 : 0);
    setScore(newScore);
    if (round + 1 >= puzzles.length) setTimeout(() => onFinish({ score: newScore, duration: Math.round((Date.now() - start) / 1000) }), 200);
    else setRound(r => r + 1);
  };

  return (
    <div>
      <div className="flex justify-between mb-4 text-sm font-bold text-muted-foreground">
        <span>Round: <span className="text-foreground" data-testid="ws-round">{round + 1}</span>/{puzzles.length}</span>
        <span>Score: {score}</span>
      </div>
      <div className="rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 text-white p-8 text-center">
        <p className="text-xs font-bold uppercase text-white/70">Unscramble the word</p>
        <p className="text-4xl sm:text-5xl font-display font-black mt-2 tracking-widest uppercase" data-testid="ws-scrambled">{p.scrambled}</p>
      </div>
      <div className="grid grid-cols-2 gap-3 mt-4">
        {p.opts.map((o, i) => (
          <button key={i} onClick={() => pick(i)} data-testid={`ws-opt-${i}`}
            className="px-5 py-4 rounded-2xl border-2 font-black text-lg bg-card hover:border-amber-500 hover:-translate-y-0.5 transition-all uppercase">
            {o}
          </button>
        ))}
      </div>
    </div>
  );
}

// ================= Engine dispatch =================
const ENGINES = {
  memory_match: MemoryMatch,
  reaction_tap: ReactionTap,
  focus_find: FocusFind,
  pattern_hunt: PatternHunt,
  math_dash: MathDash,
  word_link: WordLink,
  logic_flow: LogicFlow,
  color_match: ColorMatch,
  sequence_recall: SequenceRecall,
  odd_one_out: OddOneOut,
  word_scramble: WordScramble,
};

// ================= Page =================
export default function BrainGamePlay() {
  const { gameKey } = useParams();
  const [sp] = useSearchParams();
  const navigate = useNavigate();
  const childId = sp.get("child");
  const [meta, setMeta] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [done, setDone] = useState(null);
  const [reward, setReward] = useState(null);
  const [confetti, setConfetti] = useState(false);
  const [replayKey, setReplayKey] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        const r = await api.get(`/games/detail/${gameKey}`);
        setMeta(r.data);
      } catch {
        setNotFound(true);
      }
    })();
  }, [gameKey]);

  const handleFinish = useCallback(async (result) => {
    setDone(result);
    setConfetti(true);
    try {
      const r = await api.post("/games/score", {
        child_id: childId, game_key: gameKey,
        score: result.score, duration_seconds: result.duration || 0, metadata: result,
      });
      setReward(r.data);
    } catch { toast.error("Could not save score"); }
  }, [childId, gameKey]);

  const restart = () => { setDone(null); setReward(null); setConfetti(false); setReplayKey(k => k + 1); };

  if (notFound) return <div className="min-h-screen"><Navbar /><div className="text-center mt-40 text-muted-foreground" data-testid="game-not-found">Game not found</div></div>;
  if (!meta) return <div className="min-h-screen"><Navbar /><div className="text-center mt-40 text-muted-foreground">Loading…</div></div>;

  const Engine = ENGINES[meta.engine];
  if (!Engine) return <div className="min-h-screen"><Navbar /><div className="text-center mt-40 text-muted-foreground">Coming soon</div></div>;

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
        <div className={`rounded-[2rem] p-6 sm:p-8 bg-gradient-to-br ${meta.color} text-white lift-shadow relative overflow-hidden`}>
          <div className="floating-blob bg-white/20 w-40 h-40 -top-10 -right-10"></div>
          <div className="flex items-start justify-between relative">
            <h1 className="text-3xl font-display font-black" data-testid="game-title">{meta.name}</h1>
            <span className="rounded-full bg-white/20 backdrop-blur px-3 py-1 text-xs font-black uppercase tracking-wider">
              {meta.difficulty_label || "Medium"}
            </span>
          </div>
          <p className="text-white/90 text-sm mt-2 relative">{meta.description}</p>
        </div>

        <Card className="glass-card rounded-3xl border-0 p-6 sm:p-8 mt-5" data-testid="game-play-area">
          {done ? (
            <div className="text-center animate-pop">
              <div className="w-20 h-20 rounded-3xl mx-auto bg-gradient-to-br from-yellow-300 to-orange-400 grid place-items-center animate-float">
                <Trophy className="w-9 h-9 text-white" />
              </div>
              <h2 className="text-3xl font-display font-black mt-5" data-testid="game-result-score">You scored {done.score}!</h2>
              <p className="text-muted-foreground mt-1 text-sm">Great job — rewards added to your profile.</p>
              {reward && (
                <div className="flex items-center justify-center gap-3 mt-4 flex-wrap">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 text-blue-700 px-3 py-1.5 font-black text-sm" data-testid="reward-xp">
                    <Zap className="w-4 h-4" /> +{reward.xp_earned} XP
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 text-amber-700 px-3 py-1.5 font-black text-sm" data-testid="reward-coins">
                    <Coins className="w-4 h-4" /> +{reward.coins_earned} Coins
                  </span>
                  {reward.streak > 0 && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-100 text-rose-700 px-3 py-1.5 font-black text-sm" data-testid="reward-streak">
                      🔥 {reward.streak}-day streak
                    </span>
                  )}
                </div>
              )}
              <div className="mt-6 flex gap-3 justify-center">
                <Button onClick={restart} className="pill-btn bg-gradient-to-r from-blue-500 to-purple-600 text-white font-black" data-testid="game-play-again-btn">
                  <RotateCcw className="w-4 h-4 mr-2" /> Play again
                </Button>
                <Link to="/dashboard/games"><Button variant="outline" className="pill-btn font-bold" data-testid="game-back-to-games-btn">Back to games</Button></Link>
              </div>
            </div>
          ) : (
            <Engine key={replayKey} onFinish={handleFinish} meta={meta} />
          )}
        </Card>
      </main>
    </div>
  );
}

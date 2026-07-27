import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "@/lib/api";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { toast } from "sonner";
import Confetti from "@/components/Confetti";
import { Star, Share2, Volume2, Mic, PartyPopper, Home, RotateCcw, Play } from "lucide-react";

/**
 * Phonics Fun — 5 tabs matching the Canva design:
 *   Home · Sound Game · Speak & Say · Letter Journey · My Stars
 * Uses Web Speech API (SpeechSynthesis) to play letter sounds — no backend needed.
 * Uses webkitSpeechRecognition when available for the speak challenge; otherwise falls
 * back to "you tried!" optimistic stars.
 */

const TABS = [
  { key: "home",    label: "Home",        bg: "bg-white",       text: "text-slate-900" },
  { key: "sound",   label: "Sound\nGame", bg: "bg-sky-100",     text: "text-slate-900" },
  { key: "speak",   label: "Speak\n& Say",bg: "bg-emerald-100", text: "text-slate-900" },
  { key: "letter",  label: "Letter\nJourney", bg: "bg-violet-100", text: "text-slate-900" },
  { key: "stars",   label: "My\nStars",   bg: "bg-amber-100",   text: "text-slate-900" },
];

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const LETTER_TRIOS = [
  ["S","A","C"], ["B","M","D"], ["T","G","H"], ["P","N","R"], ["F","L","K"],
  ["V","W","J"], ["Y","Q","X"], ["Z","O","E"], ["U","I","A"], ["C","B","D"],
];

// Letter-tile pastel palette (matches Canva)
const TILE_PALETTE = [
  { bg: "bg-rose-300",     shadow: "bg-rose-400/70" },
  { bg: "bg-sky-300",      shadow: "bg-sky-400/70" },
  { bg: "bg-emerald-300",  shadow: "bg-emerald-400/70" },
  { bg: "bg-amber-300",    shadow: "bg-amber-400/70" },
  { bg: "bg-violet-300",   shadow: "bg-violet-400/70" },
];

function speak(text, opts = {}) {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.rate = opts.rate ?? 0.85;
  u.pitch = opts.pitch ?? 1.15;
  u.lang = "en-US";
  window.speechSynthesis.speak(u);
}

/** Big pill-shaped tab (like the Canva top nav). */
function TabPill({ tab, active, onClick }) {
  return (
    <button
      onClick={onClick}
      data-testid={`phonics-tab-${tab.key}`}
      className={`relative shrink-0 rounded-full ${tab.bg} ${tab.text} px-6 py-4 min-w-[110px]
        font-display font-black text-sm text-center whitespace-pre-line leading-tight
        transition-transform hover:-translate-y-0.5
        ${active ? "ring-2 ring-slate-900 shadow-[0_6px_0_-1px_rgba(15,23,42,0.85)]" : "shadow-[0_2px_0_rgba(15,23,42,0.15)]"}`}
    >
      {tab.label}
      {active && (
        <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-14 h-1 rounded-full bg-slate-900"></span>
      )}
    </button>
  );
}

/** 3D pill button with dark shadow directly beneath (matches Canva "Play Sound Game" / mic style). */
function LiftButton({ children, onClick, colorFrom = "bg-rose-400", colorShadow = "bg-rose-600", testid, className = "", disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      data-testid={testid}
      className={`relative inline-block w-full ${className}`}
    >
      <span className={`absolute inset-x-0 top-1.5 h-full rounded-3xl ${colorShadow} opacity-90`}></span>
      <span className={`relative flex items-center justify-center gap-2 rounded-3xl ${colorFrom} text-slate-900 font-display font-black text-lg py-3.5 px-5
        active:translate-y-1 transition-transform`}>
        {children}
      </span>
    </button>
  );
}

export default function PhonicsFun() {
  const { childId } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("home");
  const [state, setState] = useState({ stars: 0, max_stars: 10, correct_answers: 0, badges: [], badges_earned: 0, child_name: "" });
  const [confetti, setConfetti] = useState(false);

  const refresh = async () => {
    try {
      const { data } = await api.get(`/phonics/state/${childId}`);
      setState(data);
    } catch { /* silent */ }
  };
  useEffect(() => { if (childId) refresh(); }, [childId]);

  const recordAnswer = async (kind, letter, correct) => {
    try {
      const { data } = await api.post("/phonics/answer", { child_id: childId, kind, letter, correct });
      setState((s) => ({ ...s, stars: data.stars, correct_answers: data.correct_answers }));
      if (correct) {
        setConfetti(true);
        setTimeout(() => setConfetti(false), 900);
      }
      if (data.stars >= 10 && correct) setTimeout(() => setActiveTab("stars"), 700);
    } catch { /* silent */ }
  };

  const awardBadge = async (letter) => {
    try {
      const { data } = await api.post("/phonics/badge", { child_id: childId, letter });
      setState((s) => ({ ...s, badges: data.badges, badges_earned: data.badges_earned }));
    } catch { /* silent */ }
  };

  return (
    <div className="min-h-screen relative overflow-x-hidden bg-gradient-to-b from-amber-50 via-orange-50 to-yellow-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-950">
      <Navbar />
      <Confetti trigger={confetti} />

      <main className="mx-auto max-w-2xl px-4 py-6 relative" data-testid="phonics-page">
        {/* ===== Header pill bar (matches Canva top card) ===== */}
        <div className="rounded-full bg-white dark:bg-slate-800 shadow-[0_8px_20px_-8px_rgba(15,23,42,0.15)] px-4 py-3 flex items-center gap-3 border border-slate-200/60 dark:border-slate-700" data-testid="phonics-header-bar">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-yellow-300 to-orange-400 grid place-items-center shrink-0 shadow-inner">
            <PartyPopper className="w-5 h-5 text-white" strokeWidth={2.5} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-display font-black text-slate-900 dark:text-white text-base sm:text-lg truncate">Phonics Fun!</p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
            <span className="hidden sm:inline text-slate-700 dark:text-slate-200 font-bold text-sm">My stars:</span>
            <span className="font-display font-black text-orange-500" data-testid="phonics-star-count">{state.stars}</span>
            <span className="text-slate-400 font-bold text-sm">/ {state.max_stars}</span>
          </div>
          <button onClick={() => { navigator.share?.({ title: "Phonics Fun!", url: window.location.href }).catch(() => {}); }} data-testid="phonics-share-btn"
            className="hidden sm:inline-flex items-center gap-1 rounded-full px-3 py-1.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 font-bold text-xs">
            <Share2 className="w-3.5 h-3.5" /> Share
          </button>
        </div>

        {/* ===== Tab row ===== */}
        <div className="mt-5 -mx-4 px-4 flex gap-3 overflow-x-auto no-scrollbar pb-3" data-testid="phonics-tabs">
          {TABS.map((t) => (
            <TabPill key={t.key} tab={t} active={activeTab === t.key} onClick={() => setActiveTab(t.key)} />
          ))}
        </div>
        <div className="h-px bg-slate-300/80 dark:bg-slate-700 -mx-4"></div>

        {/* ===== Panels ===== */}
        <div className="mt-5">
          {activeTab === "home"   && <HomePanel state={state} onGo={setActiveTab} />}
          {activeTab === "sound"  && <SoundGamePanel onAnswer={recordAnswer} />}
          {activeTab === "speak"  && <SpeakPanel onAnswer={recordAnswer} onBadge={awardBadge} />}
          {activeTab === "letter" && <LetterJourneyPanel state={state} onAnswer={recordAnswer} onBadge={awardBadge} />}
          {activeTab === "stars"  && <MyStarsPanel state={state} onReplay={() => setActiveTab("sound")} onSpeak={() => setActiveTab("speak")} />}
        </div>
      </main>
      <Footer />
    </div>
  );
}

// ===== HOME PANEL (screenshot 1) =====
function HomePanel({ state, onGo }) {
  return (
    <div className="relative overflow-hidden rounded-[2rem] bg-rose-50 dark:bg-slate-800 shadow-[0_10px_30px_-12px_rgba(15,23,42,0.2)] p-6 sm:p-8" data-testid="phonics-panel-home">
      <span className="absolute left-4 top-8 text-slate-300 text-5xl font-display font-black opacity-60 select-none">A</span>
      <span className="absolute right-6 top-6 text-slate-300 text-5xl font-display font-black opacity-60 select-none">B</span>

      <div className="relative">
        <span className="inline-block rounded-full bg-amber-300 text-slate-900 font-display font-black text-xs tracking-wider px-4 py-1.5">
          LEARN • PLAY • SMILE
        </span>
        <h2 className="mt-4 font-display font-black text-3xl sm:text-4xl text-slate-900 dark:text-white leading-tight">
          Let&apos;s make letter sounds!
        </h2>
        <p className="mt-3 text-slate-600 dark:text-slate-300 font-medium text-base">
          Listen, tap, speak, and collect stars while you learn your ABC sounds.
        </p>

        <div className="mt-6 space-y-3">
          <LiftButton onClick={() => onGo("sound")} colorFrom="bg-rose-400" colorShadow="bg-rose-500" testid="phonics-cta-sound">
            <Volume2 className="w-5 h-5" /> Play Sound Game
          </LiftButton>
          <LiftButton onClick={() => onGo("speak")} colorFrom="bg-emerald-400" colorShadow="bg-emerald-500" testid="phonics-cta-speak">
            <Mic className="w-5 h-5" /> Practise Speaking
          </LiftButton>
        </div>

        {/* ABC visual (styled placeholder — matches the beads/whiteboard photo card) */}
        <div className="mt-6 rounded-3xl bg-white dark:bg-slate-700 border border-slate-200/60 dark:border-slate-600 p-4 relative">
          <div className="absolute -top-3 left-4 bg-white dark:bg-slate-700 rounded-full px-3 py-1 shadow text-pink-400 font-display font-black text-sm">a b c!</div>
          <div className="grid grid-cols-6 sm:grid-cols-8 gap-2">
            {"ABCDEFGHIJKLMNOP".split("").map((L, i) => {
              const p = TILE_PALETTE[i % TILE_PALETTE.length];
              return (
                <div key={L} className={`relative rounded-xl ${p.bg} h-10 grid place-items-center font-display font-black text-white text-lg shadow`}>
                  {L}
                </div>
              );
            })}
          </div>
          <div className="mt-3 flex justify-end">
            <div className="rounded-2xl bg-yellow-300 px-3 py-1.5 font-bold text-xl">🌈 ✨</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ===== SOUND GAME PANEL (screenshot 2) =====
function SoundGamePanel({ onAnswer }) {
  const [round, setRound] = useState(0);
  const trio = LETTER_TRIOS[round % LETTER_TRIOS.length];
  const target = trio[0];
  const options = useMemo(() => [...trio].sort(() => Math.random() - 0.5), [round, trio]);

  const play = () => speak(target.toLowerCase(), { rate: 0.75 });
  useEffect(() => { const t = setTimeout(play, 350); return () => clearTimeout(t); /* eslint-disable-next-line */ }, [round]);

  const pick = (letter) => {
    const correct = letter === target;
    onAnswer("sound", letter, correct);
    if (correct) {
      toast.success(`Yes! That was the letter ${target}!`);
      setTimeout(() => setRound((r) => r + 1), 700);
    } else {
      toast.error("Try again!");
    }
  };

  return (
    <div className="rounded-[2rem] bg-sky-50 dark:bg-slate-800 shadow-[0_10px_30px_-12px_rgba(15,23,42,0.2)] p-6 sm:p-8 text-center" data-testid="phonics-panel-sound">
      <p className="font-display font-black text-sky-500 tracking-widest">LISTENING GAME</p>
      <h2 className="mt-1 font-display font-black text-3xl sm:text-4xl text-slate-900 dark:text-white">Which letter makes this sound?</h2>
      <p className="mt-3 text-slate-600 dark:text-slate-300 font-medium">
        Tap the blue sound button, listen carefully, then choose a big letter!
      </p>

      <div className="mt-8 grid place-items-center">
        <button onClick={play} data-testid="phonics-play-sound-btn"
          className="relative w-28 h-28 rounded-full active:translate-y-1 transition-transform">
          <span className="absolute inset-0 rounded-full bg-blue-600 translate-y-2"></span>
          <span className="relative w-28 h-28 rounded-full bg-sky-400 border-4 border-white grid place-items-center shadow-xl">
            <Volume2 className="w-12 h-12 text-white" strokeWidth={2.5} />
          </span>
        </button>
        <p className="mt-4 font-display font-black text-sky-500">Tap to hear the sound again</p>
      </div>

      <div className="mt-8 grid grid-cols-3 gap-4" data-testid="phonics-letter-options">
        {options.map((L, i) => {
          const p = TILE_PALETTE[i % TILE_PALETTE.length];
          return (
            <button key={`${round}-${L}`} onClick={() => pick(L)} data-testid={`phonics-letter-option-${L}`}
              className="relative active:translate-y-1 transition-transform">
              <span className={`absolute inset-x-0 top-1.5 h-full rounded-3xl ${p.shadow}`}></span>
              <span className={`relative block rounded-3xl ${p.bg} py-8 sm:py-10 font-display font-black text-white text-5xl sm:text-6xl shadow-lg`}>
                {L}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ===== SPEAK & SAY PANEL (screenshot 3) =====
function SpeakPanel({ onAnswer, onBadge }) {
  const [idx, setIdx] = useState(0);
  const letter = LETTERS[idx % LETTERS.length];
  const [listening, setListening] = useState(false);
  const recogRef = useRef(null);

  const startListening = () => {
    // Optimistic + best-effort speech recognition
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SR) {
      try {
        const r = new SR();
        r.lang = "en-US";
        r.interimResults = false;
        r.maxAlternatives = 3;
        r.onresult = (e) => {
          const heard = Array.from(e.results?.[0] || []).map((x) => x.transcript || "").join(" ").toLowerCase();
          const matched = heard.includes(letter.toLowerCase()) || heard.charAt(0) === letter.toLowerCase();
          finish(matched);
        };
        r.onerror = () => finish(true); // be encouraging — if mic fails, still reward the try
        r.onend = () => setListening(false);
        r.start();
        recogRef.current = r;
        setListening(true);
        return;
      } catch {}
    }
    // Fallback: reward for trying
    setListening(true);
    setTimeout(() => finish(true), 1200);
  };

  const finish = (correct) => {
    setListening(false);
    onAnswer("speak", letter, correct);
    if (correct) {
      onBadge(letter);
      toast.success(`Great job on the letter ${letter}!`);
      setTimeout(() => setIdx((i) => i + 1), 900);
    } else {
      toast("Nice try — say it a little louder!");
    }
  };

  useEffect(() => () => { try { recogRef.current?.stop(); } catch {} }, []);

  return (
    <div className="rounded-[2rem] bg-emerald-50 dark:bg-slate-800 shadow-[0_10px_30px_-12px_rgba(15,23,42,0.2)] p-6 sm:p-8 text-center" data-testid="phonics-panel-speak">
      <p className="font-display font-black text-violet-500 tracking-widest">SPEAKING PRACTICE</p>
      <h2 className="mt-1 font-display font-black text-3xl sm:text-4xl text-slate-900 dark:text-white">Can you say this sound?</h2>
      <p className="mt-3 text-slate-600 dark:text-slate-300 font-medium">
        Look at the letter, make its sound, then tap the microphone.
      </p>

      <button onClick={() => speak(letter.toLowerCase())} className="mt-6 inline-block" data-testid="phonics-speak-letter-tile">
        <div className="relative">
          <span className="absolute inset-0 top-2 rounded-[2rem] bg-yellow-400 opacity-80"></span>
          <div className="relative w-36 h-36 sm:w-40 sm:h-40 rounded-[2rem] bg-yellow-300 grid place-items-center shadow-lg">
            <span className="font-display font-black text-orange-500 text-7xl sm:text-8xl leading-none">{letter}</span>
          </div>
        </div>
      </button>
      <p className="mt-4 font-display font-black text-orange-400">Say the letter sound out loud!</p>

      <div className="mt-8 grid place-items-center">
        <button onClick={startListening} disabled={listening} data-testid="phonics-mic-btn"
          className="relative w-28 h-28 rounded-full active:translate-y-1 transition-transform disabled:opacity-80">
          <span className="absolute inset-0 rounded-full bg-rose-600 translate-y-2"></span>
          <span className={`relative w-28 h-28 rounded-full ${listening ? "bg-rose-500 animate-pulse" : "bg-rose-400"} border-4 border-white grid place-items-center shadow-xl`}>
            <Mic className="w-12 h-12 text-white" strokeWidth={2.5} />
          </span>
        </button>
        <p className="mt-4 font-display font-black text-rose-400">
          {listening ? "Listening…" : "Tap the microphone when you are ready"}
        </p>
      </div>
    </div>
  );
}

// ===== LETTER JOURNEY PANEL (screenshot 4) =====
function LetterJourneyPanel({ state, onAnswer, onBadge }) {
  const badges = new Set(state.badges || []);
  const currentIdx = LETTERS.findIndex((L) => !badges.has(L));
  const current = LETTERS[currentIdx === -1 ? 0 : currentIdx];

  const learn = async () => {
    speak(current.toLowerCase(), { rate: 0.7 });
    onBadge(current);
    onAnswer("letter", current, true);
    toast.success(`Badge earned for the letter ${current}!`);
  };

  return (
    <div className="relative overflow-hidden rounded-[2rem] bg-violet-50 dark:bg-slate-800 shadow-[0_10px_30px_-12px_rgba(15,23,42,0.2)] p-6 sm:p-8" data-testid="phonics-panel-letter">
      <span className="absolute left-3 top-10 text-slate-300 text-5xl font-display font-black opacity-60 select-none">A</span>
      <span className="absolute right-3 top-8 text-slate-300 text-5xl font-display font-black opacity-60 select-none">Z</span>

      <div className="relative">
        <span className="inline-block rounded-full bg-amber-300 text-slate-900 font-display font-black text-xs tracking-wider px-4 py-1.5">
          A TO Z ADVENTURE
        </span>
        <h2 className="mt-4 font-display font-black text-3xl sm:text-4xl text-slate-900 dark:text-white leading-tight">
          Letter Learning Journey
        </h2>
        <p className="mt-3 text-slate-600 dark:text-slate-300 font-medium">
          Learn one letter at a time, play phonics activities, and unlock the whole alphabet!
        </p>

        <div className="mt-5 inline-block rounded-2xl bg-white dark:bg-slate-700 border border-slate-200/60 dark:border-slate-600 px-5 py-3 shadow-sm" data-testid="phonics-badges-earned">
          <p className="font-display font-black text-sm text-slate-800 dark:text-slate-200">Badges earned</p>
          <p className="mt-0.5 font-display font-black text-3xl">
            <span className="text-sky-400">{state.badges_earned}</span>
            <span className="text-slate-400"> / 26</span>
          </p>
        </div>

        <div className="mt-6 rounded-3xl bg-white/70 dark:bg-slate-700/70 border border-slate-200/60 dark:border-slate-600 p-5">
          <p className="font-display font-black text-2xl text-slate-900 dark:text-white">My Alphabet Path</p>
          <div className="mt-4 grid grid-cols-7 gap-2.5" data-testid="phonics-alphabet-grid">
            {LETTERS.map((L) => {
              const unlocked = badges.has(L);
              const isCurrent = L === current && !unlocked;
              return (
                <button
                  key={L}
                  onClick={() => { if (L === current) learn(); }}
                  data-testid={`phonics-letter-${L}`}
                  className={`relative aspect-square rounded-xl font-display font-black text-lg
                    ${isCurrent ? "bg-rose-400 text-white shadow-[0_3px_0_rgba(190,18,60,0.6)]"
                      : unlocked ? "bg-emerald-300 text-white shadow-[0_2px_0_rgba(5,150,105,0.5)]"
                      : "bg-slate-200 dark:bg-slate-600 text-slate-500 dark:text-slate-400"}
                    ${L === current ? "hover:-translate-y-0.5 active:translate-y-0" : "cursor-default"}
                    transition-transform`}
                >
                  {L}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-6 flex items-end justify-center">
          <div className="relative w-32 h-32">
            <div className="absolute inset-0 rounded-[2rem] bg-yellow-300 opacity-90 blur-md scale-90"></div>
            <div className="relative w-32 h-32 rounded-[2rem] bg-yellow-300 grid place-items-center shadow-xl">
              <span className="font-display font-black text-orange-500 text-6xl leading-none">{current}</span>
            </div>
          </div>
        </div>
        <div className="mt-4 flex justify-center">
          <LiftButton onClick={learn} colorFrom="bg-emerald-400" colorShadow="bg-emerald-500" testid="phonics-learn-letter-btn" className="max-w-xs">
            <Play className="w-5 h-5" /> Play &amp; earn {current} badge
          </LiftButton>
        </div>
      </div>
    </div>
  );
}

// ===== MY STARS PANEL (screenshot 5) =====
function MyStarsPanel({ state, onReplay, onSpeak }) {
  const [confetti, setConfetti] = useState(false);
  useEffect(() => { setConfetti(true); const t = setTimeout(() => setConfetti(false), 1500); return () => clearTimeout(t); }, []);
  const resetProgress = async () => {
    try {
      await api.post(`/phonics/reset/${state.child_id || ""}`);
    } catch {}
  };
  return (
    <div className="relative overflow-hidden rounded-[2rem] bg-amber-50 dark:bg-slate-800 shadow-[0_10px_30px_-12px_rgba(15,23,42,0.2)] p-6 sm:p-8 text-center" data-testid="phonics-panel-stars">
      <Confetti trigger={confetti} />
      <div className="text-4xl">🎉</div>
      <p className="font-display font-black text-rose-400 tracking-widest mt-1">YOU DID IT!</p>
      <h2 className="mt-1 font-display font-black text-3xl sm:text-4xl text-slate-900 dark:text-white">Super Star Results!</h2>
      <p className="mt-3 text-slate-600 dark:text-slate-300 font-medium">
        Every sound you try helps your reading grow stronger. Keep shining!
      </p>

      <div className="mt-6 grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-white dark:bg-slate-700 border border-slate-200/60 dark:border-slate-600 p-4 shadow-sm" data-testid="phonics-stat-correct">
          <p className="font-display font-black text-4xl text-sky-400">{state.correct_answers}</p>
          <p className="mt-1 font-display font-black text-slate-800 dark:text-slate-200 text-sm">Correct answers</p>
        </div>
        <div className="rounded-2xl bg-white dark:bg-slate-700 border border-slate-200/60 dark:border-slate-600 p-4 shadow-sm" data-testid="phonics-stat-stars">
          <p className="font-display font-black text-4xl text-amber-400">{state.stars}</p>
          <p className="mt-1 font-display font-black text-slate-800 dark:text-slate-200 text-sm">Stars collected</p>
        </div>
      </div>

      <div className="text-4xl mt-6">🌈</div>

      <div className="mt-6 grid grid-cols-2 gap-3">
        <LiftButton onClick={() => { resetProgress(); onReplay(); }} colorFrom="bg-rose-400" colorShadow="bg-rose-500" testid="phonics-play-again-btn">
          <Volume2 className="w-5 h-5" /> Play Again
        </LiftButton>
        <LiftButton onClick={onSpeak} colorFrom="bg-emerald-400" colorShadow="bg-emerald-500" testid="phonics-speak-more-btn">
          <Mic className="w-5 h-5" /> Speak More
        </LiftButton>
      </div>
    </div>
  );
}

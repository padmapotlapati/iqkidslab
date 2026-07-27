import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "@/lib/api";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { toast } from "sonner";
import Confetti from "@/components/Confetti";
import { Star, Share2, Volume2, Mic, PartyPopper, Home, RotateCcw, Play, Lock, Check } from "lucide-react";
import LetterLesson from "@/components/phonics/LetterLesson";
import { LETTER_LESSONS, LETTER_ORDER } from "@/data/letterLessons";

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

/**
 * Phonics data — pure sound (IPA), example word, and a TTS-friendly phrase.
 * The `tts` phrase is what the browser speaks: it approximates the phoneme +
 * the example word (never the alphabet name), so a child hears the sound-word
 * pair used in phonics teaching (e.g., "sss, sun"), not the letter name.
 * `accept` = space-separated accepted spoken tokens for validation.
 */
const PHONICS = {
  A: { ipa: "/æ/",  word: "Apple",    tts: "ahh, apple",     accept: "apple ah aa ahh a" },
  B: { ipa: "/b/",  word: "Ball",     tts: "buh, ball",      accept: "ball buh b" },
  C: { ipa: "/k/",  word: "Cat",      tts: "kuh, cat",       accept: "cat kuh k c" },
  D: { ipa: "/d/",  word: "Dog",      tts: "duh, dog",       accept: "dog duh d" },
  E: { ipa: "/e/",  word: "Elephant", tts: "eh, elephant",   accept: "elephant eh e" },
  F: { ipa: "/f/",  word: "Fish",     tts: "fff, fish",      accept: "fish ff f" },
  G: { ipa: "/g/",  word: "Goat",     tts: "guh, goat",      accept: "goat guh g" },
  H: { ipa: "/h/",  word: "Hat",      tts: "huh, hat",       accept: "hat huh h" },
  I: { ipa: "/ɪ/",  word: "Igloo",    tts: "ih, igloo",      accept: "igloo ih i" },
  J: { ipa: "/dʒ/", word: "Jam",      tts: "juh, jam",       accept: "jam juh j" },
  K: { ipa: "/k/",  word: "Kite",     tts: "kuh, kite",      accept: "kite kuh k" },
  L: { ipa: "/l/",  word: "Lion",     tts: "lll, lion",      accept: "lion ll l" },
  M: { ipa: "/m/",  word: "Monkey",   tts: "mmm, monkey",    accept: "monkey mm m" },
  N: { ipa: "/n/",  word: "Nest",     tts: "nnn, nest",      accept: "nest nn n" },
  O: { ipa: "/ɒ/",  word: "Orange",   tts: "ah, orange",     accept: "orange ah o" },
  P: { ipa: "/p/",  word: "Pig",      tts: "puh, pig",       accept: "pig puh p" },
  Q: { ipa: "/kw/", word: "Queen",    tts: "kwuh, queen",    accept: "queen kw q" },
  R: { ipa: "/r/",  word: "Rabbit",   tts: "rrr, rabbit",    accept: "rabbit rr r" },
  S: { ipa: "/s/",  word: "Sun",      tts: "sss, sun",       accept: "sun ss s" },
  T: { ipa: "/t/",  word: "Tap",      tts: "tuh, tap",       accept: "tap tuh t" },
  U: { ipa: "/ʌ/",  word: "Umbrella", tts: "uh, umbrella",   accept: "umbrella uh u" },
  V: { ipa: "/v/",  word: "Van",      tts: "vvv, van",       accept: "van vv v" },
  W: { ipa: "/w/",  word: "Water",    tts: "wuh, water",     accept: "water wuh w" },
  X: { ipa: "/ks/", word: "Box",      tts: "ks, box",        accept: "box ks x" },
  Y: { ipa: "/j/",  word: "Yellow",   tts: "yuh, yellow",    accept: "yellow yuh y" },
  Z: { ipa: "/z/",  word: "Zebra",    tts: "zzz, zebra",     accept: "zebra zz z" },
};

const PRAISE_PHRASES = ["Excellent!", "Great Job!", "Correct!", "Well done!", "Super!"];

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

/** Web Audio API chimes — no external assets. */
function playChime(kind = "success") {
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    const g = ctx.createGain();
    g.gain.value = 0.0001;
    g.connect(ctx.destination);
    const notes = kind === "success" ? [523.25, 659.25, 783.99] // C-E-G major triad
                : kind === "fail"    ? [349.23, 293.66]           // F → D descending
                : [523.25];
    let t = ctx.currentTime;
    notes.forEach((f, i) => {
      const o = ctx.createOscillator();
      o.type = "sine";
      o.frequency.setValueAtTime(f, t);
      o.connect(g);
      g.gain.exponentialRampToValueAtTime(0.25, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
      o.start(t);
      o.stop(t + 0.24);
      t += 0.18;
    });
    setTimeout(() => ctx.close(), 900);
  } catch { /* ignore */ }
}

/** Normalize a spoken transcript for phonics matching. */
function transcriptMatches(heard, letter) {
  const spec = PHONICS[letter];
  if (!spec) return false;
  const clean = (heard || "").toLowerCase().replace(/[^a-z\s]/g, "").trim();
  if (!clean) return false;
  const tokens = clean.split(/\s+/);
  const acceptList = spec.accept.toLowerCase().split(/\s+/);
  // Direct token match
  if (tokens.some((t) => acceptList.includes(t))) return true;
  // Word containment (e.g., "the apple is red" contains "apple")
  if (acceptList.some((a) => a.length >= 2 && clean.includes(a))) return true;
  // Starts-with the letter's sound approximation
  const firstChar = spec.word[0].toLowerCase();
  return tokens[0]?.[0] === firstChar;
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
          {activeTab === "letter" && <LetterJourneyPanel state={state} onAnswer={recordAnswer} onBadge={awardBadge} onRefresh={refresh} />}
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

  const play = () => speak(PHONICS[target]?.tts || target, { rate: 0.75 });
  useEffect(() => { const t = setTimeout(play, 350); return () => clearTimeout(t); /* eslint-disable-next-line */ }, [round]);

  const pick = (letter) => {
    const correct = letter === target;
    onAnswer("sound", letter, correct);
    if (correct) {
      playChime("success");
      const praise = PRAISE_PHRASES[Math.floor(Math.random() * PRAISE_PHRASES.length)];
      toast.success(`${praise} That was ${PHONICS[target].ipa} for ${PHONICS[target].word}.`);
      setTimeout(() => setRound((r) => r + 1), 900);
    } else {
      playChime("fail");
      toast.error("Try again — listen carefully!");
    }
  };

  return (
    <div className="rounded-[2rem] bg-sky-50 dark:bg-slate-800 shadow-[0_10px_30px_-12px_rgba(15,23,42,0.2)] p-6 sm:p-8 text-center" data-testid="phonics-panel-sound">
      <p className="font-display font-black text-sky-500 tracking-widest">LISTENING GAME</p>
      <h2 className="mt-1 font-display font-black text-3xl sm:text-4xl text-slate-900 dark:text-white">Which letter makes this sound?</h2>
      <p className="mt-3 text-slate-600 dark:text-slate-300 font-medium">
        Tap the blue sound button, listen to the <b>phonics sound</b>, then choose the letter!
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

// ===== SPEAK & SAY PANEL (screenshot 3) — full phonics validation =====
function SpeakPanel({ onAnswer, onBadge }) {
  const [idx, setIdx] = useState(0);
  const letter = LETTERS[idx % LETTERS.length];
  const spec = PHONICS[letter];
  const [listening, setListening] = useState(false);
  const [heard, setHeard] = useState("");                 // recognized transcript
  const [status, setStatus] = useState("idle");           // idle | listening | success | try_again
  const [praise, setPraise] = useState("");
  const recogRef = useRef(null);
  const nextEnabled = status === "success";

  useEffect(() => {
    // Reset transient state on letter change
    setHeard(""); setStatus("idle"); setPraise("");
  }, [idx]);

  const teach = () => speak(spec.tts, { rate: 0.75 });

  const startListening = () => {
    setHeard(""); setStatus("listening");
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      // Encouraging fallback if browser has no SR (Firefox, etc.)
      setTimeout(() => finish(true, "(mic not supported — nice try!)"), 1200);
      return;
    }
    try {
      const r = new SR();
      r.lang = "en-US";
      r.interimResults = true;
      r.maxAlternatives = 3;
      let finalTranscript = "";
      r.onresult = (e) => {
        let interim = "";
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const res = e.results[i];
          if (res.isFinal) finalTranscript += res[0].transcript + " ";
          else interim += res[0].transcript + " ";
        }
        setHeard((finalTranscript || interim).trim());
      };
      r.onerror = () => finish(false, "");
      r.onend = () => {
        setListening(false);
        // Evaluate whatever we captured
        finish(null, "");
      };
      r.onspeechend = () => { try { r.stop(); } catch {} };
      r.start();
      recogRef.current = r;
      setListening(true);
      // Auto-stop after 4s max
      setTimeout(() => { try { r.stop(); } catch {} }, 4000);
    } catch {
      setTimeout(() => finish(true, ""), 800);
    }
  };

  const finish = (forcedResult, note) => {
    setListening(false);
    setHeard((prev) => {
      const transcript = (prev || note || "").trim();
      let correct = forcedResult;
      if (correct === null) correct = transcriptMatches(transcript, letter);
      if (correct) {
        const p = PRAISE_PHRASES[Math.floor(Math.random() * PRAISE_PHRASES.length)];
        setPraise(p);
        setStatus("success");
        playChime("success");
        onAnswer("speak", letter, true);
        onBadge(letter);
      } else {
        setStatus("try_again");
        playChime("fail");
        onAnswer("speak", letter, false);
      }
      return transcript;
    });
  };

  const next = () => setIdx((i) => i + 1);
  useEffect(() => () => { try { recogRef.current?.stop(); } catch {} }, []);

  const successGlow = status === "success";
  const failShake = status === "try_again";

  return (
    <div className={`relative rounded-[2rem] shadow-[0_10px_30px_-12px_rgba(15,23,42,0.2)] p-6 sm:p-8 text-center transition-colors duration-500
      ${successGlow ? "bg-emerald-100" : "bg-emerald-50 dark:bg-slate-800"}`} data-testid="phonics-panel-speak">
      {successGlow && (
        <div className="absolute inset-0 rounded-[2rem] ring-4 ring-emerald-400 animate-pulse pointer-events-none" aria-hidden="true"></div>
      )}
      <div className="relative">
        <p className="font-display font-black text-violet-500 tracking-widest">SPEAKING PRACTICE</p>
        <h2 className="mt-1 font-display font-black text-3xl sm:text-4xl text-slate-900 dark:text-white">Can you say this sound?</h2>
        <p className="mt-3 text-slate-600 dark:text-slate-300 font-medium">
          Say the <b>phonics sound</b> and the example word out loud.
        </p>

        {/* Big yellow letter tile — tap to hear the phonics sound + word */}
        <button onClick={teach} className={`mt-6 inline-block ${failShake ? "animate-shake" : ""}`} data-testid="phonics-speak-letter-tile">
          <div className="relative">
            <span className="absolute inset-0 top-2 rounded-[2rem] bg-yellow-400 opacity-80"></span>
            <div className="relative w-36 h-36 sm:w-40 sm:h-40 rounded-[2rem] bg-yellow-300 grid place-items-center shadow-lg">
              <span className="font-display font-black text-orange-500 text-7xl sm:text-8xl leading-none">{letter}</span>
            </div>
          </div>
        </button>
        {/* Phonics label under the letter */}
        <div className="mt-3 space-y-0.5">
          <p className="font-display font-black text-orange-500 text-2xl" data-testid="phonics-ipa">{spec.ipa}</p>
          <p className="font-display font-black text-slate-700 dark:text-slate-200">as in <span className="text-emerald-600">{spec.word}</span></p>
          <p className="text-xs text-slate-500 mt-1">Tap the letter to hear the sound again</p>
        </div>

        {/* Microphone */}
        <div className="mt-6 grid place-items-center">
          <button onClick={startListening} disabled={listening} data-testid="phonics-mic-btn"
            className="relative w-28 h-28 rounded-full active:translate-y-1 transition-transform disabled:opacity-80">
            <span className="absolute inset-0 rounded-full bg-rose-600 translate-y-2"></span>
            <span className={`relative w-28 h-28 rounded-full ${listening ? "bg-rose-500 animate-pulse" : "bg-rose-400"} border-4 border-white grid place-items-center shadow-xl`}>
              <Mic className="w-12 h-12 text-white" strokeWidth={2.5} />
            </span>
          </button>
          <p className="mt-4 font-display font-black text-rose-400" data-testid="phonics-mic-hint">
            {listening ? "Listening…" : status === "success" ? "🎉" : "Tap the microphone when you are ready"}
          </p>
        </div>

        {/* Recognized speech display */}
        {heard && (
          <div className="mt-5 rounded-2xl bg-white dark:bg-slate-700 border border-slate-200/60 dark:border-slate-600 px-4 py-3 text-left" data-testid="phonics-heard-box">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">You said</p>
            <p className="font-display font-black text-slate-900 dark:text-white mt-0.5" data-testid="phonics-heard-text">"{heard}"</p>
          </div>
        )}

        {/* Feedback */}
        {status === "success" && (
          <div className="mt-5 rounded-2xl bg-emerald-500 text-white p-4 flex items-center gap-3 justify-center animate-pop" data-testid="phonics-success-banner">
            <span className="w-9 h-9 rounded-full bg-white/25 grid place-items-center">✓</span>
            <div className="text-left">
              <p className="font-display font-black text-xl">{praise}</p>
              <p className="text-xs opacity-90">You said "{spec.word}" correctly. Star earned!</p>
            </div>
          </div>
        )}
        {status === "try_again" && (
          <div className="mt-5 rounded-2xl bg-amber-100 text-amber-900 p-4 flex items-center gap-3 justify-center" data-testid="phonics-try-again-banner">
            <span className="w-9 h-9 rounded-full bg-amber-300 grid place-items-center">↺</span>
            <div className="text-left">
              <p className="font-display font-black">Try again!</p>
              <p className="text-xs">Say "<b>{spec.word}</b>" or the sound {spec.ipa} clearly into the mic.</p>
            </div>
          </div>
        )}

        {/* Retry + Next controls */}
        <div className="mt-5 grid grid-cols-2 gap-3">
          <LiftButton onClick={startListening} colorFrom="bg-rose-400" colorShadow="bg-rose-500" testid="phonics-retry-btn" disabled={listening}>
            <Mic className="w-5 h-5" /> {status === "try_again" ? "Try again" : "Say it"}
          </LiftButton>
          <LiftButton onClick={next} colorFrom={nextEnabled ? "bg-emerald-400" : "bg-slate-300"} colorShadow={nextEnabled ? "bg-emerald-500" : "bg-slate-400"} testid="phonics-next-btn" disabled={!nextEnabled}>
            Next <Play className="w-5 h-5" />
          </LiftButton>
        </div>
      </div>
    </div>
  );
}

// ===== LETTER JOURNEY PANEL — A–Z map + full 5-activity lesson flow =====
function LetterJourneyPanel({ state, onAnswer, onBadge, onRefresh }) {
  const badges = new Set(state.badges || []);
  // Completed letters = badges. The next letter in order is "unlocked" (current).
  // Everything after that is locked. Completed letters are revisitable.
  const nextIdx = LETTER_ORDER.findIndex((L) => !badges.has(L));
  const currentLetter = nextIdx === -1 ? null : LETTER_ORDER[nextIdx];
  const [activeLetter, setActiveLetter] = useState(null);

  const openLetter = (L) => {
    const isCompleted = badges.has(L);
    const isCurrent = L === currentLetter;
    if (!isCompleted && !isCurrent) {
      toast.error(`${L} is locked — finish the earlier letters first!`);
      return;
    }
    setActiveLetter(L);
  };

  const completeLetter = async (L) => {
    await onBadge(L);
    await onAnswer("letter", L, true);
    if (onRefresh) await onRefresh();
    toast.success(`${LETTER_LESSONS[L].ipa} for ${LETTER_LESSONS[L].vocab[0].word} — badge earned!`);
  };

  const goToNextLetter = (fromLetter) => {
    const idx = LETTER_ORDER.indexOf(fromLetter);
    const next = LETTER_ORDER[idx + 1];
    if (next) setActiveLetter(next);
    else setActiveLetter(null);
  };

  // Lesson view
  if (activeLetter) {
    const idx = LETTER_ORDER.indexOf(activeLetter);
    return (
      <div data-testid="phonics-panel-letter">
        <LetterLesson
          letter={activeLetter}
          onExit={() => setActiveLetter(null)}
          onAnswer={onAnswer}
          onComplete={completeLetter}
          onNextLetter={goToNextLetter}
          isLastLetter={idx === LETTER_ORDER.length - 1}
        />
      </div>
    );
  }

  const progressPct = Math.round((state.badges_earned / 26) * 100);

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

        {/* Progress + Badges */}
        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-white dark:bg-slate-700 border border-slate-200/60 dark:border-slate-600 px-4 py-3 shadow-sm" data-testid="phonics-badges-earned">
            <p className="font-display font-black text-xs text-slate-500 uppercase tracking-widest">Badges</p>
            <p className="mt-0.5 font-display font-black text-2xl">
              <span className="text-sky-400">{state.badges_earned}</span>
              <span className="text-slate-400"> / 26</span>
            </p>
          </div>
          <div className="rounded-2xl bg-white dark:bg-slate-700 border border-slate-200/60 dark:border-slate-600 px-4 py-3 shadow-sm" data-testid="phonics-progress-card">
            <p className="font-display font-black text-xs text-slate-500 uppercase tracking-widest">Progress</p>
            <p className="mt-0.5 font-display font-black text-2xl text-emerald-500">{progressPct}%</p>
            <div className="mt-1.5 h-1.5 rounded-full bg-slate-200 dark:bg-slate-600 overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-sky-400 transition-all" style={{ width: `${progressPct}%` }}></div>
            </div>
          </div>
        </div>

        {/* Alphabet Map (completed / current / locked) */}
        <div className="mt-6 rounded-3xl bg-white/70 dark:bg-slate-700/70 border border-slate-200/60 dark:border-slate-600 p-5">
          <div className="flex items-center justify-between">
            <p className="font-display font-black text-2xl text-slate-900 dark:text-white">My Alphabet Path</p>
            <div className="flex items-center gap-2 text-[10px] font-black tracking-wider">
              <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>DONE</span>
              <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-rose-400"></span>NOW</span>
              <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-slate-300"></span>LOCK</span>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-7 gap-2.5" data-testid="phonics-alphabet-grid">
            {LETTER_ORDER.map((L) => {
              const completed = badges.has(L);
              const isCurrent = L === currentLetter;
              const locked = !completed && !isCurrent;
              return (
                <button
                  key={L}
                  onClick={() => openLetter(L)}
                  data-testid={`phonics-letter-${L}`}
                  disabled={locked}
                  className={`relative aspect-square rounded-xl font-display font-black text-lg
                    ${isCurrent ? "bg-rose-400 text-white shadow-[0_3px_0_rgba(190,18,60,0.6)] animate-pulse"
                      : completed ? "bg-emerald-300 text-white shadow-[0_2px_0_rgba(5,150,105,0.5)]"
                      : "bg-slate-200 dark:bg-slate-600 text-slate-500 dark:text-slate-400 cursor-not-allowed"}
                    ${(isCurrent || completed) ? "hover:-translate-y-0.5 active:translate-y-0" : ""}
                    transition-transform`}
                >
                  {L}
                  {completed && (
                    <span className="absolute -top-1 -right-1 bg-white rounded-full p-0.5 shadow">
                      <Check className="w-2.5 h-2.5 text-emerald-500" strokeWidth={4} />
                    </span>
                  )}
                  {locked && (
                    <span className="absolute inset-0 grid place-items-center rounded-xl">
                      <Lock className="w-4 h-4 text-slate-400" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Current letter callout */}
        {currentLetter && (
          <>
            <div className="mt-6 flex items-end justify-center">
              <div className="relative w-32 h-32">
                <div className="absolute inset-0 rounded-[2rem] bg-yellow-300 opacity-90 blur-md scale-90"></div>
                <div className="relative w-32 h-32 rounded-[2rem] bg-yellow-300 grid place-items-center shadow-xl">
                  <span className="font-display font-black text-orange-500 text-6xl leading-none">{currentLetter}</span>
                </div>
              </div>
            </div>
            <div className="mt-2 text-center">
              <p className="font-display font-black text-orange-500 text-xl">{LETTER_LESSONS[currentLetter].ipa}</p>
              <p className="font-display font-black text-slate-700 dark:text-slate-200 text-sm">
                as in <span className="text-emerald-600">{LETTER_LESSONS[currentLetter].vocab[0].word}</span>
              </p>
            </div>
            <div className="mt-4 flex justify-center">
              <LiftButton onClick={() => setActiveLetter(currentLetter)} colorFrom="bg-emerald-400" colorShadow="bg-emerald-500" testid="phonics-learn-letter-btn" className="max-w-xs">
                <Play className="w-5 h-5" /> Start Letter {currentLetter}
              </LiftButton>
            </div>
          </>
        )}
        {!currentLetter && (
          <div className="mt-6 rounded-2xl bg-emerald-100 text-emerald-900 p-4 text-center" data-testid="phonics-journey-complete">
            <p className="font-display font-black text-lg">🎊 You unlocked the whole alphabet!</p>
            <p className="text-sm">Tap any completed letter above to revisit its lesson.</p>
          </div>
        )}
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

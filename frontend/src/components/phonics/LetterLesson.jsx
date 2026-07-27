import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Volume2, Mic, Play, ArrowLeft, RotateCcw, Check, X, Sparkles, Star } from "lucide-react";
import Confetti from "@/components/Confetti";
import {
  LETTER_LESSONS,
  buildListeningOptions,
  buildWordRecOptions,
} from "@/data/letterLessons";

/**
 * LetterLesson — reusable 5-activity flow for a single letter.
 *
 * Activities (each rendered as a step):
 *   1. Meet the Letter
 *   2. Listening Game
 *   3. Word Recognition
 *   4. Build The Word
 *   5. Speaking Activity
 *   6. Completion Screen
 *
 * Props:
 *   letter: uppercase single letter A–Z
 *   onExit: () => void                    — go back to Alphabet Map
 *   onAnswer: (kind, letter, correct)     — records a phonics answer
 *   onComplete: (letter) => Promise<void> — award badge + unlock next letter
 *   onNextLetter: (letter) => void        — jump to the next letter's lesson
 *   isLastLetter: boolean
 */
export default function LetterLesson({ letter, onExit, onAnswer, onComplete, onNextLetter, isLastLetter }) {
  const spec = LETTER_LESSONS[letter];
  const [step, setStep] = useState(1);
  const [starsEarned, setStarsEarned] = useState(0);

  const goNext = () => setStep((s) => s + 1);
  const addStar = () => setStarsEarned((s) => s + 1);

  return (
    <div data-testid={`letter-lesson-${letter}`}>
      {/* Sticky mini progress + back */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={onExit} data-testid="lesson-back-btn"
          className="inline-flex items-center gap-1.5 rounded-full bg-white dark:bg-slate-700 px-3 py-1.5 text-sm font-bold shadow border border-slate-200/60 dark:border-slate-600">
          <ArrowLeft className="w-4 h-4" /> Map
        </button>
        <div className="flex items-center gap-1.5">
          {[1,2,3,4,5].map((n) => (
            <span key={n} data-testid={`lesson-step-dot-${n}`}
              className={`w-2.5 h-2.5 rounded-full ${step >= n ? "bg-emerald-400" : "bg-slate-300 dark:bg-slate-600"}`} />
          ))}
        </div>
        <div className="flex items-center gap-1 text-amber-500 font-display font-black text-sm">
          <Star className="w-4 h-4 fill-amber-400" /> {starsEarned}
        </div>
      </div>

      {step === 1 && <MeetTheLetter spec={spec} letter={letter} onReady={goNext} />}
      {step === 2 && <ListeningGame spec={spec} letter={letter} onAnswer={onAnswer} onWin={() => { addStar(); goNext(); }} />}
      {step === 3 && <WordRecognition spec={spec} letter={letter} onAnswer={onAnswer} onWin={() => { addStar(); goNext(); }} />}
      {step === 4 && <BuildTheWord spec={spec} letter={letter} onAnswer={onAnswer} onWin={() => { addStar(); goNext(); }} />}
      {step === 5 && <SpeakingActivity spec={spec} letter={letter} onAnswer={onAnswer} onWin={() => { addStar(); goNext(); }} />}
      {step === 6 && (
        <CompletionScreen
          letter={letter}
          stars={starsEarned}
          isLastLetter={isLastLetter}
          onComplete={onComplete}
          onNextLetter={onNextLetter}
          onExit={onExit}
        />
      )}
    </div>
  );
}

// -----------------------------------------------------------------------
// Shared helpers
// -----------------------------------------------------------------------
function speak(text, opts = {}) {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.rate = opts.rate ?? 0.75;
  u.pitch = opts.pitch ?? 1.15;
  u.lang = "en-US";
  window.speechSynthesis.speak(u);
}

function playChime(kind = "success") {
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    const g = ctx.createGain();
    g.gain.value = 0.0001;
    g.connect(ctx.destination);
    const notes = kind === "success" ? [523.25, 659.25, 783.99]
                : kind === "fail"    ? [349.23, 293.66]
                : [523.25];
    let t = ctx.currentTime;
    notes.forEach((f) => {
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

function LiftButton({ children, onClick, colorFrom = "bg-rose-400", colorShadow = "bg-rose-600", testid, className = "", disabled }) {
  return (
    <button onClick={onClick} disabled={disabled} data-testid={testid}
      className={`relative inline-block w-full ${className} ${disabled ? "opacity-70" : ""}`}>
      <span className={`absolute inset-x-0 top-1.5 h-full rounded-3xl ${colorShadow} opacity-90`}></span>
      <span className={`relative flex items-center justify-center gap-2 rounded-3xl ${colorFrom} text-slate-900 font-display font-black text-base sm:text-lg py-3 sm:py-3.5 px-5
        active:translate-y-1 transition-transform`}>
        {children}
      </span>
    </button>
  );
}

// Little animated wrapper for correct/wrong states
function StatusBanner({ status, correctText, wrongText }) {
  if (status === "correct") {
    return (
      <div className="mt-5 rounded-2xl bg-emerald-500 text-white p-4 flex items-center gap-3 animate-pop" data-testid="banner-correct">
        <span className="w-9 h-9 rounded-full bg-white/25 grid place-items-center"><Check className="w-5 h-5" /></span>
        <p className="font-display font-black text-lg">{correctText}</p>
      </div>
    );
  }
  if (status === "wrong") {
    return (
      <div className="mt-5 rounded-2xl bg-amber-100 text-amber-900 p-4 flex items-center gap-3" data-testid="banner-wrong">
        <span className="w-9 h-9 rounded-full bg-amber-300 grid place-items-center"><X className="w-5 h-5" /></span>
        <p className="font-display font-black">{wrongText}</p>
      </div>
    );
  }
  return null;
}

// -----------------------------------------------------------------------
// Activity 1 — Meet the Letter
// -----------------------------------------------------------------------
function MeetTheLetter({ spec, letter, onReady }) {
  const playSound = () => speak(spec.tts, { rate: 0.7 });
  useEffect(() => { const t = setTimeout(playSound, 400); return () => clearTimeout(t); /* eslint-disable-next-line */ }, [letter]);

  const CARD_TONES = [
    { bg: "bg-rose-100",    ring: "ring-rose-300" },
    { bg: "bg-sky-100",     ring: "ring-sky-300" },
    { bg: "bg-emerald-100", ring: "ring-emerald-300" },
    { bg: "bg-amber-100",   ring: "ring-amber-300" },
  ];

  return (
    <div className="relative overflow-hidden rounded-[2rem] bg-violet-50 dark:bg-slate-800 shadow-[0_10px_30px_-12px_rgba(15,23,42,0.2)] p-6 sm:p-8 text-center" data-testid="activity-meet">
      <p className="font-display font-black text-violet-500 tracking-widest text-sm">MEET THE LETTER</p>
      <h2 className="mt-1 font-display font-black text-2xl sm:text-3xl text-slate-900 dark:text-white">Say hello to <span className="text-rose-500">{spec.upper}{spec.lower}</span></h2>

      {/* Upper + Lower case tiles */}
      <div className="mt-5 grid grid-cols-2 gap-3 max-w-sm mx-auto">
        <div className="relative">
          <span className="absolute inset-0 top-2 rounded-[1.75rem] bg-yellow-400 opacity-80"></span>
          <div className="relative rounded-[1.75rem] bg-yellow-300 h-32 grid place-items-center shadow">
            <span className="font-display font-black text-orange-500 text-7xl leading-none">{spec.upper}</span>
          </div>
        </div>
        <div className="relative">
          <span className="absolute inset-0 top-2 rounded-[1.75rem] bg-rose-400 opacity-80"></span>
          <div className="relative rounded-[1.75rem] bg-rose-300 h-32 grid place-items-center shadow">
            <span className="font-display font-black text-white text-7xl leading-none">{spec.lower}</span>
          </div>
        </div>
      </div>

      {/* Phonics IPA + label */}
      <div className="mt-4">
        <p className="font-display font-black text-orange-500 text-2xl" data-testid="meet-ipa">{spec.ipa}</p>
        <p className="text-slate-600 dark:text-slate-300 font-medium text-sm">as in <b className="text-emerald-600">{spec.vocab[0].word}</b></p>
      </div>

      {/* Play Sound */}
      <div className="mt-5 max-w-xs mx-auto">
        <LiftButton onClick={playSound} colorFrom="bg-sky-400" colorShadow="bg-sky-600" testid="meet-play-sound-btn">
          <Volume2 className="w-5 h-5" /> Play Sound
        </LiftButton>
      </div>

      {/* Vocabulary picture cards */}
      <div className="mt-6 grid grid-cols-2 gap-3" data-testid="meet-vocab-grid">
        {spec.vocab.map((v, i) => {
          const t = CARD_TONES[i % CARD_TONES.length];
          return (
            <button key={v.word} onClick={() => speak(v.word, { rate: 0.85 })}
              data-testid={`meet-vocab-${v.word}`}
              className={`rounded-2xl ${t.bg} p-3 flex flex-col items-center gap-1.5 ring-1 ${t.ring} shadow-sm active:translate-y-0.5 transition-transform`}>
              <div className="text-4xl leading-none">{v.emoji}</div>
              <p className="font-display font-black text-slate-800 dark:text-slate-100 text-sm">{v.word}</p>
            </button>
          );
        })}
      </div>

      {/* Ready to Play */}
      <div className="mt-6 max-w-xs mx-auto">
        <LiftButton onClick={onReady} colorFrom="bg-emerald-400" colorShadow="bg-emerald-500" testid="meet-ready-btn">
          <Play className="w-5 h-5" /> Ready to Play!
        </LiftButton>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------
// Activity 2 — Listening Game
// -----------------------------------------------------------------------
function ListeningGame({ spec, letter, onAnswer, onWin }) {
  const [status, setStatus] = useState("idle");
  const options = useMemo(() => buildListeningOptions(letter), [letter]);
  const play = () => speak(spec.tts, { rate: 0.7 });
  useEffect(() => { const t = setTimeout(play, 400); return () => clearTimeout(t); /* eslint-disable-next-line */ }, [letter]);

  const TILE_PALETTE = [
    { bg: "bg-rose-400", shadow: "bg-rose-500" },
    { bg: "bg-sky-400",  shadow: "bg-sky-500" },
    { bg: "bg-emerald-400", shadow: "bg-emerald-500" },
  ];

  const pick = (L) => {
    if (status === "correct") return;
    const correct = L === letter;
    onAnswer("sound", letter, correct);
    if (correct) {
      setStatus("correct");
      playChime("success");
      setTimeout(onWin, 900);
    } else {
      setStatus("wrong");
      playChime("fail");
      setTimeout(() => setStatus("idle"), 900);
    }
  };

  return (
    <div className="rounded-[2rem] bg-sky-50 dark:bg-slate-800 shadow-[0_10px_30px_-12px_rgba(15,23,42,0.2)] p-6 sm:p-8 text-center" data-testid="activity-listening">
      <p className="font-display font-black text-sky-500 tracking-widest text-sm">LISTENING GAME</p>
      <h2 className="mt-1 font-display font-black text-2xl sm:text-3xl text-slate-900 dark:text-white">Which letter makes this sound?</h2>

      <div className="mt-6 grid place-items-center">
        <button onClick={play} data-testid="listening-play-sound"
          className="relative w-24 h-24 rounded-full active:translate-y-1 transition-transform">
          <span className="absolute inset-0 rounded-full bg-blue-600 translate-y-2"></span>
          <span className="relative w-24 h-24 rounded-full bg-sky-400 border-4 border-white grid place-items-center shadow-xl">
            <Volume2 className="w-10 h-10 text-white" strokeWidth={2.5} />
          </span>
        </button>
        <p className="mt-3 font-display font-black text-sky-500 text-sm">Tap to hear the sound again</p>
      </div>

      <div className={`mt-6 grid grid-cols-3 gap-3 ${status === "wrong" ? "animate-shake" : ""}`} data-testid="listening-options">
        {options.map((L, i) => {
          const t = TILE_PALETTE[i % TILE_PALETTE.length];
          return (
            <button key={L} onClick={() => pick(L)} data-testid={`listening-option-${L}`}
              className="relative active:translate-y-1 transition-transform">
              <span className={`absolute inset-x-0 top-1.5 h-full rounded-3xl ${t.shadow}`}></span>
              <span className={`relative block rounded-3xl ${t.bg} py-6 sm:py-8 font-display font-black text-white text-4xl sm:text-5xl shadow-lg`}>
                {L}
              </span>
            </button>
          );
        })}
      </div>

      <StatusBanner status={status} correctText="Excellent! Correct sound!" wrongText="Not quite — try again!" />
    </div>
  );
}

// -----------------------------------------------------------------------
// Activity 3 — Word Recognition
// -----------------------------------------------------------------------
function WordRecognition({ spec, letter, onAnswer, onWin }) {
  const [status, setStatus] = useState("idle");
  const options = useMemo(() => buildWordRecOptions(letter), [letter]);
  const correctWord = spec.vocab[0].word;
  const playWord = () => speak(correctWord, { rate: 0.8 });
  useEffect(() => { const t = setTimeout(playWord, 400); return () => clearTimeout(t); /* eslint-disable-next-line */ }, [letter]);

  const pick = (word) => {
    if (status === "correct") return;
    const correct = word === correctWord;
    onAnswer("sound", letter, correct);
    if (correct) {
      setStatus("correct");
      playChime("success");
      setTimeout(onWin, 900);
    } else {
      setStatus("wrong");
      playChime("fail");
      setTimeout(() => setStatus("idle"), 900);
    }
  };

  return (
    <div className="rounded-[2rem] bg-rose-50 dark:bg-slate-800 shadow-[0_10px_30px_-12px_rgba(15,23,42,0.2)] p-6 sm:p-8 text-center" data-testid="activity-wordrec">
      <p className="font-display font-black text-rose-500 tracking-widest text-sm">WORD RECOGNITION</p>
      <h2 className="mt-1 font-display font-black text-2xl sm:text-3xl text-slate-900 dark:text-white">Which word starts with <span className="text-orange-500">{spec.ipa}</span>?</h2>

      <div className="mt-6 grid place-items-center">
        <button onClick={playWord} data-testid="wordrec-play-word"
          className="relative w-24 h-24 rounded-full active:translate-y-1 transition-transform">
          <span className="absolute inset-0 rounded-full bg-rose-600 translate-y-2"></span>
          <span className="relative w-24 h-24 rounded-full bg-rose-400 border-4 border-white grid place-items-center shadow-xl">
            <Volume2 className="w-10 h-10 text-white" strokeWidth={2.5} />
          </span>
        </button>
        <p className="mt-3 font-display font-black text-rose-500 text-sm">Play Word</p>
      </div>

      <div className={`mt-6 grid grid-cols-3 gap-3 ${status === "wrong" ? "animate-shake" : ""}`} data-testid="wordrec-options">
        {options.map((v) => (
          <button key={v.word} onClick={() => pick(v.word)} data-testid={`wordrec-option-${v.word}`}
            className="rounded-2xl bg-white dark:bg-slate-700 p-3 flex flex-col items-center gap-1.5 shadow ring-1 ring-slate-200/60 dark:ring-slate-600 active:translate-y-0.5 transition-transform">
            <div className="text-4xl leading-none">{v.emoji}</div>
            <p className="font-display font-black text-slate-800 dark:text-slate-100 text-xs">{v.word}</p>
          </button>
        ))}
      </div>

      <StatusBanner status={status} correctText={`Great! "${correctWord}" starts with ${spec.ipa}.`} wrongText="Listen carefully and try again!" />
    </div>
  );
}

// -----------------------------------------------------------------------
// Activity 4 — Build The Word
// -----------------------------------------------------------------------
function BuildTheWord({ spec, letter, onAnswer, onWin }) {
  const target = spec.target;                     // e.g., "APPLE"
  const emoji = spec.vocab[0].emoji;
  const [slots, setSlots] = useState(Array(target.length).fill(null));
  const [tiles, setTiles] = useState([]);
  const [status, setStatus] = useState("idle");

  const shuffle = () => {
    const chars = target.split("").sort(() => Math.random() - 0.5);
    setTiles(chars.map((ch, i) => ({ id: `${ch}-${i}`, ch, used: false })));
    setSlots(Array(target.length).fill(null));
    setStatus("idle");
  };

  useEffect(() => { shuffle(); /* eslint-disable-next-line */ }, [letter]);

  const placeTile = (tile) => {
    if (tile.used || status === "correct") return;
    const nextIdx = slots.findIndex((s) => s === null);
    if (nextIdx === -1) return;
    const nextSlots = [...slots];
    nextSlots[nextIdx] = tile;
    setSlots(nextSlots);
    setTiles((prev) => prev.map((t) => t.id === tile.id ? { ...t, used: true } : t));
  };

  const removeSlot = (idx) => {
    if (status === "correct" || slots[idx] === null) return;
    const tile = slots[idx];
    const nextSlots = [...slots];
    nextSlots[idx] = null;
    setSlots(nextSlots);
    setTiles((prev) => prev.map((t) => t.id === tile.id ? { ...t, used: false } : t));
  };

  const check = () => {
    if (slots.some((s) => s === null)) {
      toast.error("Fill in every slot first!");
      return;
    }
    const guess = slots.map((s) => s.ch).join("");
    const correct = guess === target;
    onAnswer("sound", letter, correct);
    if (correct) {
      setStatus("correct");
      playChime("success");
      speak(spec.vocab[0].word, { rate: 0.85 });
      setTimeout(onWin, 1100);
    } else {
      setStatus("wrong");
      playChime("fail");
      setTimeout(() => setStatus("idle"), 900);
    }
  };

  return (
    <div className="rounded-[2rem] bg-amber-50 dark:bg-slate-800 shadow-[0_10px_30px_-12px_rgba(15,23,42,0.2)] p-6 sm:p-8 text-center" data-testid="activity-build">
      <p className="font-display font-black text-amber-500 tracking-widest text-sm">BUILD THE WORD</p>
      <h2 className="mt-1 font-display font-black text-2xl sm:text-3xl text-slate-900 dark:text-white">Arrange the letters</h2>

      {/* Picture */}
      <div className="mt-4 grid place-items-center">
        <div className="relative w-28 h-28">
          <div className="absolute inset-0 rounded-[2rem] bg-yellow-300 opacity-90 blur-md scale-90"></div>
          <div className="relative w-28 h-28 rounded-[2rem] bg-yellow-300 grid place-items-center shadow-lg">
            <span className="text-6xl leading-none">{emoji}</span>
          </div>
        </div>
        <p className="mt-2 font-display font-black text-slate-700 dark:text-slate-200 text-sm">
          Spell: <span className="text-emerald-600">{spec.vocab[0].word.toLowerCase()}</span>
        </p>
      </div>

      {/* Slots */}
      <div className={`mt-4 flex justify-center gap-2 flex-wrap ${status === "wrong" ? "animate-shake" : ""}`} data-testid="build-slots">
        {slots.map((s, i) => (
          <button key={i} onClick={() => removeSlot(i)} data-testid={`build-slot-${i}`}
            className={`w-11 h-14 rounded-xl border-2 border-dashed grid place-items-center font-display font-black text-3xl transition-colors
              ${s ? "bg-emerald-300 border-emerald-500 text-white" : "bg-white/70 dark:bg-slate-700 border-slate-300 dark:border-slate-500 text-slate-400"}`}>
            {s?.ch || ""}
          </button>
        ))}
      </div>

      {/* Shuffled tiles */}
      <div className="mt-5 flex justify-center gap-2 flex-wrap" data-testid="build-tiles">
        {tiles.map((t) => (
          <button key={t.id} onClick={() => placeTile(t)} disabled={t.used} data-testid={`build-tile-${t.id}`}
            className={`w-11 h-14 rounded-xl grid place-items-center font-display font-black text-2xl shadow transition-all
              ${t.used ? "bg-slate-200 dark:bg-slate-700 text-slate-400 opacity-50" : "bg-sky-400 text-white hover:-translate-y-0.5"}`}>
            {t.ch}
          </button>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 max-w-sm mx-auto">
        <LiftButton onClick={shuffle} colorFrom="bg-rose-300" colorShadow="bg-rose-400" testid="build-try-again">
          <RotateCcw className="w-5 h-5" /> Reset
        </LiftButton>
        <LiftButton onClick={check} colorFrom="bg-emerald-400" colorShadow="bg-emerald-500" testid="build-check-btn">
          <Check className="w-5 h-5" /> Check My Word
        </LiftButton>
      </div>

      <StatusBanner status={status} correctText="Well done! You built the word!" wrongText="Try again — check the order!" />
    </div>
  );
}

// -----------------------------------------------------------------------
// Activity 5 — Speaking Activity
// -----------------------------------------------------------------------
function transcriptMatches(heard, spec) {
  const clean = (heard || "").toLowerCase().replace(/[^a-z\s]/g, "").trim();
  if (!clean) return false;
  const tokens = clean.split(/\s+/);
  const acceptList = spec.accept.map((a) => a.toLowerCase());
  if (tokens.some((t) => acceptList.includes(t))) return true;
  if (acceptList.some((a) => a.length >= 2 && clean.includes(a))) return true;
  const firstChar = spec.vocab[0].word[0].toLowerCase();
  return tokens[0]?.[0] === firstChar;
}

function SpeakingActivity({ spec, letter, onAnswer, onWin }) {
  const [status, setStatus] = useState("idle");     // idle | listening | correct | wrong
  const [heard, setHeard] = useState("");
  const [praise, setPraise] = useState("");
  const recogRef = useRef(null);

  const teach = () => speak(spec.tts, { rate: 0.7 });

  const finish = (forcedResult) => {
    setHeard((prev) => {
      const transcript = (prev || "").trim();
      let correct = forcedResult;
      if (correct === null) correct = transcriptMatches(transcript, spec);
      if (correct) {
        const options = ["Excellent!", "Great Job!", "Well done!", "Super!"];
        setPraise(options[Math.floor(Math.random() * options.length)]);
        setStatus("correct");
        playChime("success");
        onAnswer("speak", letter, true);
      } else {
        setStatus("wrong");
        playChime("fail");
        onAnswer("speak", letter, false);
      }
      return transcript;
    });
  };

  const start = () => {
    setHeard(""); setStatus("listening");
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { setTimeout(() => finish(true), 1200); return; }
    try {
      const r = new SR();
      r.lang = "en-US";
      r.interimResults = true;
      r.maxAlternatives = 3;
      let finalT = "";
      r.onresult = (e) => {
        let interim = "";
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const res = e.results[i];
          if (res.isFinal) finalT += res[0].transcript + " ";
          else interim += res[0].transcript + " ";
        }
        setHeard((finalT || interim).trim());
      };
      r.onerror = () => finish(false);
      r.onend = () => finish(null);
      r.onspeechend = () => { try { r.stop(); } catch {} };
      r.start();
      recogRef.current = r;
      setTimeout(() => { try { r.stop(); } catch {} }, 4000);
    } catch { setTimeout(() => finish(true), 800); }
  };

  useEffect(() => () => { try { recogRef.current?.stop(); } catch {} }, []);

  return (
    <div className={`relative rounded-[2rem] shadow-[0_10px_30px_-12px_rgba(15,23,42,0.2)] p-6 sm:p-8 text-center transition-colors duration-500
      ${status === "correct" ? "bg-emerald-100" : "bg-emerald-50 dark:bg-slate-800"}`} data-testid="activity-speak">
      {status === "correct" && (
        <div className="absolute inset-0 rounded-[2rem] ring-4 ring-emerald-400 animate-pulse pointer-events-none"></div>
      )}
      <div className="relative">
        <p className="font-display font-black text-violet-500 tracking-widest text-sm">SPEAKING ACTIVITY</p>
        <h2 className="mt-1 font-display font-black text-2xl sm:text-3xl text-slate-900 dark:text-white">Say <span className="text-orange-500">{spec.ipa}</span> and <span className="text-emerald-600">{spec.vocab[0].word}</span></h2>
        <p className="mt-2 text-slate-600 dark:text-slate-300 text-sm">Say the phonics sound and the example word.</p>

        <button onClick={teach} className={`mt-5 inline-block ${status === "wrong" ? "animate-shake" : ""}`} data-testid="speak-letter-tile">
          <div className="relative">
            <span className="absolute inset-0 top-2 rounded-[2rem] bg-yellow-400 opacity-80"></span>
            <div className="relative w-32 h-32 rounded-[2rem] bg-yellow-300 grid place-items-center shadow-lg">
              <span className="font-display font-black text-orange-500 text-7xl leading-none">{spec.upper}</span>
            </div>
          </div>
        </button>

        {/* Mic */}
        <div className="mt-6 grid place-items-center">
          <button onClick={start} disabled={status === "listening"} data-testid="speak-mic-btn"
            className="relative w-24 h-24 rounded-full active:translate-y-1 transition-transform disabled:opacity-80">
            <span className="absolute inset-0 rounded-full bg-rose-600 translate-y-2"></span>
            <span className={`relative w-24 h-24 rounded-full ${status === "listening" ? "bg-rose-500 animate-pulse" : "bg-rose-400"} border-4 border-white grid place-items-center shadow-xl`}>
              <Mic className="w-10 h-10 text-white" strokeWidth={2.5} />
            </span>
          </button>
          <p className="mt-3 font-display font-black text-rose-400 text-sm" data-testid="speak-mic-hint">
            {status === "listening" ? "Listening…" : status === "correct" ? "🎉" : "Tap the mic when ready"}
          </p>
        </div>

        {heard && (
          <div className="mt-4 rounded-2xl bg-white dark:bg-slate-700 border border-slate-200/60 dark:border-slate-600 px-4 py-3 text-left" data-testid="speak-heard-box">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">You said</p>
            <p className="font-display font-black text-slate-900 dark:text-white mt-0.5" data-testid="speak-heard-text">"{heard}"</p>
          </div>
        )}

        {status === "correct" && (
          <div className="mt-4 rounded-2xl bg-emerald-500 text-white p-4 flex items-center gap-3 animate-pop" data-testid="speak-correct-banner">
            <span className="w-9 h-9 rounded-full bg-white/25 grid place-items-center"><Star className="w-5 h-5 fill-white" /></span>
            <div className="text-left">
              <p className="font-display font-black text-xl">{praise}</p>
              <p className="text-xs opacity-90">Star earned!</p>
            </div>
          </div>
        )}
        {status === "wrong" && (
          <div className="mt-4 rounded-2xl bg-amber-100 text-amber-900 p-4 flex items-center gap-3" data-testid="speak-wrong-banner">
            <span className="w-9 h-9 rounded-full bg-amber-300 grid place-items-center">↺</span>
            <div className="text-left">
              <p className="font-display font-black">Try again!</p>
              <p className="text-xs">Say "<b>{spec.vocab[0].word}</b>" or the sound {spec.ipa} clearly.</p>
            </div>
          </div>
        )}

        <div className="mt-5 grid grid-cols-2 gap-3">
          <LiftButton onClick={start} colorFrom="bg-rose-400" colorShadow="bg-rose-500" testid="speak-retry-btn" disabled={status === "listening"}>
            <Mic className="w-5 h-5" /> {status === "wrong" ? "Try Again" : "Say It"}
          </LiftButton>
          <LiftButton onClick={onWin} colorFrom={status === "correct" ? "bg-emerald-400" : "bg-slate-300"} colorShadow={status === "correct" ? "bg-emerald-500" : "bg-slate-400"} testid="speak-next-btn" disabled={status !== "correct"}>
            Next <Play className="w-5 h-5" />
          </LiftButton>
        </div>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------
// Completion Screen
// -----------------------------------------------------------------------
function CompletionScreen({ letter, stars, isLastLetter, onComplete, onNextLetter, onExit }) {
  const spec = LETTER_LESSONS[letter];
  const [confetti, setConfetti] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setConfetti(true);
    const t = setTimeout(() => setConfetti(false), 1500);
    (async () => { await onComplete(letter); setSaved(true); })();
    return () => clearTimeout(t);
    // eslint-disable-next-line
  }, []);

  const continueNext = () => {
    if (isLastLetter) onExit();
    else onNextLetter(letter);
  };

  return (
    <div className="relative overflow-hidden rounded-[2rem] bg-amber-50 dark:bg-slate-800 shadow-[0_10px_30px_-12px_rgba(15,23,42,0.2)] p-6 sm:p-8 text-center" data-testid="activity-completion">
      <Confetti trigger={confetti} />
      <div className="text-5xl">🎉</div>
      <p className="font-display font-black text-rose-400 tracking-widest mt-1 text-sm">CONGRATULATIONS!</p>
      <h2 className="mt-1 font-display font-black text-2xl sm:text-3xl text-slate-900 dark:text-white">Letter {spec.upper} completed!</h2>
      <p className="mt-2 text-slate-600 dark:text-slate-300 text-sm">You mastered <span className="text-emerald-600 font-black">{spec.ipa}</span> as in <b>{spec.vocab[0].word}</b>.</p>

      {/* Badge tile */}
      <div className="mt-5 grid place-items-center">
        <div className="relative w-28 h-28">
          <div className="absolute inset-0 rounded-full bg-amber-300 opacity-80 blur-md scale-90"></div>
          <div className="relative w-28 h-28 rounded-full bg-gradient-to-br from-amber-300 to-orange-400 grid place-items-center shadow-xl border-4 border-white">
            <span className="font-display font-black text-white text-6xl leading-none">{spec.upper}</span>
          </div>
          <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-1 shadow">
            <Sparkles className="w-5 h-5 text-amber-500" />
          </div>
        </div>
        <p className="mt-3 font-display font-black text-amber-500 text-sm">Badge Earned</p>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 max-w-sm mx-auto">
        <div className="rounded-2xl bg-white dark:bg-slate-700 border border-slate-200/60 dark:border-slate-600 p-4 shadow-sm">
          <p className="font-display font-black text-3xl text-amber-500">{stars}</p>
          <p className="mt-1 font-display font-black text-slate-800 dark:text-slate-200 text-xs">Stars Earned</p>
        </div>
        <div className="rounded-2xl bg-white dark:bg-slate-700 border border-slate-200/60 dark:border-slate-600 p-4 shadow-sm">
          <p className="font-display font-black text-3xl text-emerald-500">1</p>
          <p className="mt-1 font-display font-black text-slate-800 dark:text-slate-200 text-xs">Badge Earned</p>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 max-w-sm mx-auto">
        <LiftButton onClick={onExit} colorFrom="bg-slate-200" colorShadow="bg-slate-300" testid="completion-map-btn">
          <ArrowLeft className="w-5 h-5" /> Alphabet Map
        </LiftButton>
        <LiftButton onClick={continueNext} colorFrom="bg-emerald-400" colorShadow="bg-emerald-500" testid="completion-next-btn" disabled={!saved}>
          {isLastLetter ? "Finish" : "Next Letter"} <Play className="w-5 h-5" />
        </LiftButton>
      </div>
    </div>
  );
}

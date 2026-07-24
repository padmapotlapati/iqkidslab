import { useEffect } from "react";

export default function Confetti({ trigger, count = 60 }) {
  useEffect(() => {
    if (!trigger) return;
    const colors = ["#3B82F6", "#8B5CF6", "#F59E0B", "#10B981", "#EC4899", "#FBBF24"];
    const pieces = [];
    for (let i = 0; i < count; i++) {
      const el = document.createElement("div");
      el.className = "confetti-piece";
      el.style.left = Math.random() * 100 + "vw";
      el.style.background = colors[Math.floor(Math.random() * colors.length)];
      el.style.animationDelay = Math.random() * 0.5 + "s";
      el.style.width = 6 + Math.random() * 10 + "px";
      el.style.height = 6 + Math.random() * 10 + "px";
      document.body.appendChild(el);
      pieces.push(el);
    }
    const t = setTimeout(() => { pieces.forEach((p) => p.remove()); }, 3200);
    return () => { clearTimeout(t); pieces.forEach((p) => p.remove()); };
  }, [trigger, count]);
  return null;
}

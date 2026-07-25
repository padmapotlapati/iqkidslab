import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "@/lib/api";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Brain, Zap, Shapes, Target, Calculator, BookOpen, Puzzle, Play, Trophy } from "lucide-react";

const ICONS = { brain: Brain, zap: Zap, shapes: Shapes, target: Target, calculator: Calculator, book: BookOpen, puzzle: Puzzle };

const PLAYABLE_ENGINES = new Set([
  "memory_match", "reaction_tap", "focus_find", "pattern_hunt", "math_dash", "word_link", "logic_flow",
  "color_match", "sequence_recall", "odd_one_out", "word_scramble",
]);

const ageToGroup = (age) => {
  if (age <= 5) return "3-5";
  if (age <= 8) return "6-8";
  if (age <= 12) return "9-12";
  return "13-16";
};

const DIFF_STYLES = {
  Easy:   "bg-emerald-100 text-emerald-700 border-emerald-200",
  Medium: "bg-amber-100 text-amber-700 border-amber-200",
  Hard:   "bg-rose-100 text-rose-700 border-rose-200",
};

export default function BrainGames() {
  const navigate = useNavigate();
  const [games, setGames] = useState([]);
  const [children, setChildren] = useState([]);
  const [childId, setChildId] = useState("");

  useEffect(() => {
    (async () => {
      const c = await api.get("/children");
      setChildren(c.data);
      if (c.data[0]) setChildId(c.data[0].id);
    })();
  }, []);

  const selectedChild = useMemo(() => children.find(c => c.id === childId), [children, childId]);
  const ageGroup = selectedChild ? ageToGroup(selectedChild.age) : null;

  useEffect(() => {
    if (!ageGroup) { setGames([]); return; }
    (async () => {
      const g = await api.get(`/games?age_group=${encodeURIComponent(ageGroup)}`);
      setGames(g.data);
    })();
  }, [ageGroup]);

  const groupedByDifficulty = useMemo(() => {
    const buckets = { Easy: [], Medium: [], Hard: [] };
    games.forEach(g => {
      const label = g.difficulty_label || "Medium";
      if (buckets[label]) buckets[label].push(g);
    });
    return buckets;
  }, [games]);

  return (
    <div className="min-h-screen relative overflow-hidden">
      <Navbar />
      <div className="floating-blob bg-purple-400/30 w-72 h-72 -top-10 -left-16"></div>
      <div className="floating-blob bg-pink-400/30 w-72 h-72 bottom-0 -right-16"></div>

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 relative">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Brain games</p>
            <h1 className="text-3xl sm:text-5xl font-display font-black tracking-tight mt-1" data-testid="games-heading">Pick a game, boost a skill</h1>
            <p className="text-muted-foreground mt-1">
              {selectedChild
                ? <>Curated for <span className="font-black text-foreground">{selectedChild.name}</span> · Ages <span className="font-black text-foreground">{ageGroup}</span></>
                : <>Quick daily challenges to strengthen every brain skill.</>
              }
            </p>
          </div>
          {children.length > 0 && (
            <div className="min-w-[220px]">
              <p className="text-xs font-bold uppercase text-muted-foreground mb-1">Playing as</p>
              <Select value={childId} onValueChange={setChildId}>
                <SelectTrigger data-testid="game-child-select" className="rounded-2xl h-11"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {children.map(c => <SelectItem key={c.id} value={c.id}>{c.name} · Age {c.age}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {children.length === 0 && (
          <Card className="glass-card rounded-3xl border-0 p-8 mt-8 text-center" data-testid="games-empty-state">
            <p className="text-muted-foreground">Add a child profile first to play brain games.</p>
            <Link to="/dashboard/child/new"><button className="mt-4 pill-btn h-11 px-6 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-black rounded-full" data-testid="games-add-child-btn">Add child</button></Link>
          </Card>
        )}

        {/* Grouped by difficulty */}
        {["Easy", "Medium", "Hard"].map(label => {
          const list = groupedByDifficulty[label] || [];
          if (list.length === 0) return null;
          return (
            <section key={label} className="mt-10" data-testid={`difficulty-section-${label.toLowerCase()}`}>
              <div className="flex items-center gap-3 mb-4">
                <h2 className="text-xl sm:text-2xl font-display font-black">{label}</h2>
                <Badge className={`rounded-full border font-bold ${DIFF_STYLES[label]}`}>
                  {list.length} game{list.length > 1 ? "s" : ""}
                </Badge>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {list.map(g => {
                  const Icon = ICONS[g.icon] || Brain;
                  const enabled = PLAYABLE_ENGINES.has(g.engine) && childId;
                  return (
                    <Card key={g.key} data-testid={`game-card-${g.key}`}
                      className="relative overflow-hidden rounded-3xl border-0 lift-shadow p-6 bg-card hover:-translate-y-1 transition-transform">
                      <div className="flex items-start justify-between">
                        <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${g.color} grid place-items-center shadow-lg`}>
                          <Icon className="w-7 h-7 text-white" strokeWidth={2.3} />
                        </div>
                        <Badge className={`rounded-full border font-bold ${DIFF_STYLES[g.difficulty_label] || ""}`}>
                          {g.difficulty_label || "Medium"}
                        </Badge>
                      </div>
                      <h3 className="mt-4 font-display font-black text-xl">{g.name}</h3>
                      <p className="text-sm text-muted-foreground mt-1 min-h-[40px]">{g.description}</p>
                      <div className="mt-3">
                        <Badge className="rounded-full bg-muted text-foreground hover:bg-muted border-0 font-bold text-xs">
                          {g.category.replace(/_/g, " ")}
                        </Badge>
                      </div>
                      <button
                        disabled={!enabled}
                        onClick={() => navigate(`/dashboard/games/${g.key}?child=${childId}`)}
                        data-testid={`play-game-${g.key}`}
                        className={`pill-btn mt-5 w-full h-11 rounded-full font-black text-sm text-white
                          ${enabled ? `bg-gradient-to-r ${g.color}` : "bg-muted-foreground opacity-40 cursor-not-allowed"}`}
                      >
                        <Play className="w-4 h-4 inline-block mr-1.5" />
                        {PLAYABLE_ENGINES.has(g.engine) ? (childId ? "Play now" : "Select child") : "Coming soon"}
                      </button>
                    </Card>
                  );
                })}
              </div>
            </section>
          );
        })}

        <Card className="glass-card rounded-3xl border-0 p-6 mt-10 flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-yellow-400 to-orange-400 grid place-items-center">
            <Trophy className="w-6 h-6 text-white" />
          </div>
          <div>
            <h4 className="font-display font-black text-lg">Daily Streaks & Rewards</h4>
            <p className="text-sm text-muted-foreground">Play any game every day to earn XP + coins and build your streak. Milestones unlock avatars and mystery boxes.</p>
          </div>
        </Card>
      </main>
      <Footer />
    </div>
  );
}

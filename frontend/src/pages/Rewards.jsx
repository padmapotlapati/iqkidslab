import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Flame, Gift, Trophy, Sparkles, Target, Coins, Zap, Star, Lock, CheckCircle2, Package, Calendar, Award } from "lucide-react";
import { toast } from "sonner";
import Confetti from "@/components/Confetti";
import { formatApiError } from "@/lib/api";

export default function Rewards() {
  const navigate = useNavigate();
  const [children, setChildren] = useState([]);
  const [childId, setChildId] = useState("");
  const [streak, setStreak] = useState(null);
  const [daily, setDaily] = useState(null);
  const [missions, setMissions] = useState(null);
  const [mystery, setMystery] = useState(null);
  const [avatars, setAvatars] = useState(null);
  const [level, setLevel] = useState(null);
  const [suggestion, setSuggestion] = useState(null);
  const [confetti, setConfetti] = useState(false);
  const [openedReward, setOpenedReward] = useState(null);

  useEffect(() => {
    (async () => {
      const { data } = await api.get("/children");
      setChildren(data);
      if (data[0]) setChildId(data[0].id);
    })();
  }, []);

  const load = async () => {
    if (!childId) return;
    const [s, d, m, mb, av, lv, sug] = await Promise.all([
      api.get(`/streak/${childId}`),
      api.get(`/rewards/daily-status/${childId}`),
      api.get(`/missions/${childId}`),
      api.get(`/mystery-box/status/${childId}`),
      api.get(`/avatars/${childId}`),
      api.get(`/progress/level/${childId}`),
      api.get(`/ai/daily-suggestion/${childId}`),
    ]);
    setStreak(s.data); setDaily(d.data); setMissions(m.data);
    setMystery(mb.data); setAvatars(av.data); setLevel(lv.data); setSuggestion(sug.data);
  };
  useEffect(() => { load(); }, [childId]); // eslint-disable-line

  const claimDaily = async () => {
    try {
      const { data } = await api.post("/rewards/claim-daily", { child_id: childId });
      toast.success(`+${data.xp_awarded} XP · +${data.coins_awarded} coins!`);
      setConfetti(true); setTimeout(() => setConfetti(false), 1500);
      load();
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  };

  const openMystery = async () => {
    try {
      const { data } = await api.post("/mystery-box/open", { child_id: childId });
      setOpenedReward(data.reward);
      setConfetti(true); setTimeout(() => setConfetti(false), 1800);
      load();
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  };

  const claimMission = async (key) => {
    try {
      const { data } = await api.post(`/missions/${childId}/claim?key=${key}`);
      toast.success(`Mission complete! +${data.xp_awarded} XP · +${data.coins_awarded} coins`);
      setConfetti(true); setTimeout(() => setConfetti(false), 1500);
      load();
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  };

  const selectAvatar = async (key) => {
    try {
      await api.post(`/avatars/${childId}/select`, { avatar_key: key });
      toast.success("Avatar updated!"); load();
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  };

  if (children.length === 0) {
    return (
      <div className="min-h-screen"><Navbar />
        <main className="text-center mt-32">
          <p className="text-muted-foreground">Add a child profile to start earning rewards.</p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      <Navbar />
      <Confetti trigger={confetti} />
      <div className="floating-blob bg-yellow-300/30 w-80 h-80 -top-10 -right-16"></div>
      <div className="floating-blob bg-purple-400/30 w-72 h-72 bottom-0 -left-16"></div>

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 relative">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Rewards</p>
            <h1 className="text-3xl sm:text-5xl font-display font-black tracking-tight mt-1" data-testid="rewards-heading">Play every day. Win every day.</h1>
          </div>
          <Select value={childId} onValueChange={setChildId}>
            <SelectTrigger data-testid="rewards-child-select" className="min-w-[220px] rounded-2xl h-11"><SelectValue /></SelectTrigger>
            <SelectContent>{children.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>

        {/* LEVEL + STREAK top row */}
        <div className="grid md:grid-cols-2 gap-5 mt-8">
          {level && (
            <Card className="rounded-3xl border-0 p-6 bg-gradient-to-br from-blue-600 via-purple-600 to-pink-500 text-white relative overflow-hidden lift-shadow" data-testid="level-card">
              <div className="floating-blob bg-yellow-300/30 w-40 h-40 -top-10 -right-10"></div>
              <div className="relative">
                <p className="text-xs font-black uppercase tracking-widest opacity-80">Progress</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-5xl font-display font-black" data-testid="level-value">Lvl {level.level}</span>
                  <span className="text-sm font-bold opacity-90">{level.title}</span>
                </div>
                <div className="mt-4">
                  <Progress value={level.progress} className="h-3 rounded-full bg-white/30" />
                  <p className="text-xs mt-1 opacity-80">{level.xp} / {level.next_level_xp} XP</p>
                </div>
              </div>
            </Card>
          )}
          {streak && (
            <Card className="rounded-3xl border-0 p-6 bg-gradient-to-br from-orange-500 to-red-500 text-white relative overflow-hidden lift-shadow" data-testid="streak-card">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-3xl bg-white/20 grid place-items-center backdrop-blur">
                  <Flame className="w-8 h-8 text-white" />
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-widest opacity-80">Current streak</p>
                  <p className="text-5xl font-display font-black" data-testid="streak-current">{streak.current_streak}</p>
                  <p className="text-xs opacity-90">Longest: {streak.longest_streak} days · This week: {streak.days_this_week}/7</p>
                </div>
              </div>
              <div className="grid grid-cols-7 gap-1.5 mt-4">
                {["M","T","W","T","F","S","S"].map((d, i) => {
                  const dateFor = new Date();
                  dateFor.setDate(dateFor.getDate() - dateFor.getDay() + (i === 6 ? 0 : i + 1));
                  const ymd = dateFor.toISOString().slice(0, 10);
                  const active = (streak.active_dates || []).includes(ymd);
                  return (
                    <div key={i} className={`aspect-square rounded-xl grid place-items-center font-black text-xs ${active ? "bg-yellow-300 text-orange-900" : "bg-white/20"}`}>{d}</div>
                  );
                })}
              </div>
            </Card>
          )}
        </div>

        {/* DAILY LOGIN REWARD */}
        {daily && (
          <Card className="glass-card rounded-3xl border-0 p-6 mt-5" data-testid="daily-reward-card">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-4 justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-yellow-400 to-orange-400 grid place-items-center">
                  <Gift className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-display font-black text-lg">Daily login reward</h3>
                  <p className="text-xs text-muted-foreground">Day {daily.day_in_week} of the week · +{daily.next_reward_xp} XP + 5 coins</p>
                </div>
              </div>
              <Button onClick={claimDaily} disabled={daily.claimed_today} data-testid="claim-daily-btn"
                className="pill-btn h-11 px-6 bg-gradient-to-r from-orange-500 to-yellow-500 text-white font-black disabled:opacity-40">
                {daily.claimed_today ? <><CheckCircle2 className="w-4 h-4 mr-2" /> Claimed today</> : <><Sparkles className="w-4 h-4 mr-2" /> Claim reward</>}
              </Button>
            </div>
            <div className="mt-4 grid grid-cols-7 gap-2">
              {daily.ladder.map((amt, i) => {
                const done = i + 1 < daily.day_in_week;
                const today = i + 1 === daily.day_in_week;
                return (
                  <div key={i} className={`rounded-2xl p-3 text-center font-black text-xs
                    ${today ? "bg-gradient-to-br from-yellow-400 to-orange-400 text-white scale-105 shadow-lg" :
                       done ? "bg-emerald-100 text-emerald-800" : "bg-muted text-muted-foreground"}`}>
                    <div>D{i + 1}</div>
                    <div className="text-sm">+{amt}</div>
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        {/* AI Suggestion */}
        {suggestion && (
          <Card className="glass-card rounded-3xl border-0 p-6 mt-5" data-testid="ai-suggestion-card">
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 grid place-items-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">AI Daily Practice</p>
                <p className="text-sm mt-2 leading-relaxed">{suggestion.body}</p>
                <Badge variant="secondary" className="rounded-full font-bold mt-3">Focus: {suggestion.focus_area}</Badge>
              </div>
            </div>
          </Card>
        )}

        {/* Daily Challenge CTA + Mystery Box */}
        <div className="grid md:grid-cols-2 gap-5 mt-5">
          {daily && (
            <Card className="rounded-3xl border-0 p-6 bg-gradient-to-br from-blue-500 to-cyan-500 text-white lift-shadow relative overflow-hidden" data-testid="daily-challenge-cta">
              <div className="floating-blob bg-white/20 w-40 h-40 -bottom-10 -right-10"></div>
              <div className="relative">
                <div className="w-14 h-14 rounded-3xl bg-white/20 grid place-items-center">
                  <Target className="w-7 h-7 text-white" />
                </div>
                <h3 className="font-display font-black text-2xl mt-3">Daily Brain Challenge</h3>
                <p className="text-white/90 text-sm">5 quick questions. Under 5 minutes.</p>
                <Button onClick={() => navigate(`/dashboard/daily-challenge?child=${childId}`)} data-testid="start-daily-challenge-btn"
                  className="pill-btn mt-4 h-11 px-6 bg-white text-blue-700 hover:bg-white/90 font-black">
                  Play now
                </Button>
              </div>
            </Card>
          )}
          {mystery && (
            <Card className="rounded-3xl border-0 p-6 bg-gradient-to-br from-pink-500 via-purple-500 to-indigo-500 text-white lift-shadow relative overflow-hidden" data-testid="mystery-box-card">
              <div className="floating-blob bg-yellow-300/30 w-40 h-40 -top-10 -right-10"></div>
              <div className="relative">
                <div className="w-14 h-14 rounded-3xl bg-white/20 grid place-items-center animate-float">
                  <Package className="w-7 h-7 text-white" />
                </div>
                <h3 className="font-display font-black text-2xl mt-3">Mystery Box</h3>
                <p className="text-white/90 text-sm">
                  {mystery.available ? "One free spin available now!" : `Come back in ${mystery.next_available_in_hours}h`}
                </p>
                <Button onClick={openMystery} disabled={!mystery.available} data-testid="open-mystery-btn"
                  className="pill-btn mt-4 h-11 px-6 bg-white text-purple-700 hover:bg-white/90 font-black disabled:opacity-40">
                  {mystery.available ? "Open now" : "Locked"}
                </Button>
              </div>
            </Card>
          )}
        </div>

        {/* Mystery Reward Modal */}
        {openedReward && (
          <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" onClick={() => setOpenedReward(null)} data-testid="mystery-reward-modal">
            <Card className="rounded-3xl border-0 p-8 max-w-sm w-full text-center animate-pop" onClick={e => e.stopPropagation()}>
              <div className="w-24 h-24 rounded-3xl mx-auto bg-gradient-to-br from-yellow-300 to-orange-400 grid place-items-center animate-float">
                <Package className="w-12 h-12 text-white" />
              </div>
              <h2 className="text-2xl font-display font-black mt-5">You unlocked...</h2>
              <p className="text-3xl font-display font-black brand-gradient-text mt-3">{openedReward.label}</p>
              <Button onClick={() => setOpenedReward(null)} className="pill-btn mt-5 w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white font-black" data-testid="close-mystery-btn">Awesome!</Button>
            </Card>
          </div>
        )}

        {/* MISSIONS */}
        {missions && (
          <div className="mt-8 grid lg:grid-cols-2 gap-5">
            <MissionsCard title="Weekly Challenges" icon={Calendar} items={missions.weekly} onClaim={claimMission} testid="weekly-missions" />
            <MissionsCard title="Monthly Missions" icon={Trophy} items={missions.monthly} onClaim={claimMission} testid="monthly-missions" />
          </div>
        )}

        {/* AVATARS */}
        {avatars && (
          <Card className="glass-card rounded-3xl border-0 p-6 mt-8" data-testid="avatars-card">
            <div className="flex items-center justify-between">
              <h3 className="font-display font-black text-xl">Avatar Collection</h3>
              <Badge variant="secondary" className="rounded-full font-bold">{avatars.avatars.filter(a => a.unlocked).length}/{avatars.avatars.length} unlocked</Badge>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3 mt-4">
              {avatars.avatars.map(a => {
                const isCurrent = avatars.current === a.key;
                return (
                  <button key={a.key} onClick={() => a.unlocked && selectAvatar(a.key)}
                    disabled={!a.unlocked}
                    data-testid={`avatar-${a.key}`}
                    className={`aspect-square rounded-2xl border-2 grid place-items-center relative transition-all
                      ${isCurrent ? "border-primary bg-primary/10 scale-105 shadow-lg" :
                       a.unlocked ? "border-border bg-card hover:border-primary hover:-translate-y-0.5" : "border-border bg-muted opacity-40 cursor-not-allowed"}`}>
                    <div className="text-4xl">{a.emoji}</div>
                    <div className="text-[10px] font-black mt-1">{a.name}</div>
                    {!a.unlocked && (
                      <div className="absolute top-1 right-1 flex items-center gap-0.5 text-[10px] font-bold text-muted-foreground bg-background rounded-full px-1.5 py-0.5">
                        <Lock className="w-2.5 h-2.5" /> {a.unlock_level}
                      </div>
                    )}
                    {isCurrent && <CheckCircle2 className="absolute top-1 right-1 w-4 h-4 text-primary" />}
                  </button>
                );
              })}
            </div>
          </Card>
        )}

        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-between items-center">
          <Button variant="outline" className="pill-btn font-bold" onClick={() => navigate(`/dashboard/timeline?child=${childId}`)} data-testid="view-timeline-btn">
            <Award className="w-4 h-4 mr-2" /> View achievement timeline
          </Button>
          <Button variant="outline" className="pill-btn font-bold" onClick={() => navigate("/dashboard/progress")} data-testid="view-progress-btn">
            <Zap className="w-4 h-4 mr-2" /> View progress charts
          </Button>
        </div>
      </main>
      <Footer />
    </div>
  );
}

function MissionsCard({ title, icon: Icon, items, onClaim, testid }) {
  return (
    <Card className="glass-card rounded-3xl border-0 p-6" data-testid={testid}>
      <div className="flex items-center gap-2 mb-4">
        <Icon className="w-5 h-5 text-primary" />
        <h3 className="font-display font-black text-lg">{title}</h3>
      </div>
      <div className="space-y-3">
        {items.map(m => (
          <div key={m.key} data-testid={`mission-${m.key}`} className="rounded-2xl border p-4">
            <div className="flex justify-between items-start gap-2">
              <div className="flex-1">
                <p className="font-bold text-sm">{m.title}</p>
                <p className="text-xs text-muted-foreground">Reward: +{m.xp} XP</p>
              </div>
              {m.claimed ? (
                <Badge className="rounded-full bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-0 font-bold">Claimed</Badge>
              ) : m.completed ? (
                <Button size="sm" onClick={() => onClaim(m.key)} data-testid={`claim-${m.key}`} className="pill-btn h-8 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-black">Claim</Button>
              ) : null}
            </div>
            <div className="mt-2">
              <Progress value={(m.current / m.target) * 100} className="h-2 rounded-full" />
              <p className="text-[10px] text-muted-foreground mt-1 font-bold">{m.current} / {m.target}</p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

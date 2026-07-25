import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import api from "@/lib/api";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Award, Flame, Gift, Target, Trophy, Sparkles, Package, Zap } from "lucide-react";

const KIND_MAP = {
  streak_milestone: { icon: Flame, color: "from-orange-500 to-red-500" },
  daily_claim: { icon: Gift, color: "from-yellow-400 to-orange-400" },
  daily_challenge: { icon: Target, color: "from-blue-500 to-cyan-500" },
  mission_claim: { icon: Trophy, color: "from-emerald-500 to-teal-500" },
  mystery_box: { icon: Package, color: "from-purple-500 to-pink-500" },
};

export default function Timeline() {
  const [sp] = useSearchParams();
  const initial = sp.get("child") || "";
  const [children, setChildren] = useState([]);
  const [childId, setChildId] = useState(initial);
  const [items, setItems] = useState([]);

  useEffect(() => {
    (async () => {
      const { data } = await api.get("/children");
      setChildren(data);
      if (!childId && data[0]) setChildId(data[0].id);
    })();
  }, []); // eslint-disable-line

  useEffect(() => {
    if (!childId) return;
    (async () => {
      const { data } = await api.get(`/timeline/${childId}?limit=100`);
      setItems(data);
    })();
  }, [childId]);

  return (
    <div className="min-h-screen relative overflow-hidden">
      <Navbar />
      <div className="floating-blob bg-emerald-400/30 w-72 h-72 -top-10 -right-16"></div>
      <div className="floating-blob bg-purple-400/30 w-72 h-72 bottom-0 -left-16"></div>

      <main className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-10 relative">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Achievement timeline</p>
            <h1 className="text-3xl sm:text-5xl font-display font-black tracking-tight mt-1" data-testid="timeline-heading">Every win, in order</h1>
          </div>
          {children.length > 0 && (
            <Select value={childId} onValueChange={setChildId}>
              <SelectTrigger data-testid="timeline-child-select" className="min-w-[220px] rounded-2xl h-11"><SelectValue /></SelectTrigger>
              <SelectContent>{children.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
            </Select>
          )}
        </div>

        {items.length === 0 ? (
          <Card className="glass-card rounded-3xl border-0 p-10 mt-8 text-center">
            <div className="w-16 h-16 mx-auto rounded-3xl bg-gradient-to-br from-blue-500 to-purple-500 grid place-items-center">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <h3 className="mt-4 text-xl font-display font-black">No events yet</h3>
            <p className="text-muted-foreground text-sm mt-1">Every claimed reward, mission, and streak lands here.</p>
          </Card>
        ) : (
          <div className="mt-8 relative">
            <div className="absolute left-6 top-2 bottom-2 w-0.5 bg-gradient-to-b from-blue-500 via-purple-500 to-pink-500 opacity-40"></div>
            <div className="space-y-4">
              {items.map(item => {
                const meta = KIND_MAP[item.kind] || { icon: Award, color: "from-slate-500 to-slate-700" };
                const Icon = meta.icon;
                return (
                  <div key={item.id} className="flex gap-4 relative" data-testid={`timeline-item-${item.id}`}>
                    <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${meta.color} grid place-items-center shrink-0 shadow-lg z-10`}>
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <Card className="glass-card rounded-2xl border-0 p-4 flex-1">
                      <p className="font-display font-black">{item.title}</p>
                      <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                        <span>{new Date(item.created_at).toLocaleString()}</span>
                        {item.meta?.xp && <span className="flex items-center gap-1 font-bold text-emerald-600"><Zap className="w-3 h-3" /> +{item.meta.xp} XP</span>}
                      </div>
                    </Card>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}

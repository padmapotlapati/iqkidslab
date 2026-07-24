import { useEffect, useState } from "react";
import api from "@/lib/api";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";
import { Zap, Star, Award, TrendingUp } from "lucide-react";

export default function Progress() {
  const navigate = useNavigate();
  const [children, setChildren] = useState([]);
  const [childId, setChildId] = useState("");
  const [data, setData] = useState(null);

  useEffect(() => {
    (async () => {
      const { data: c } = await api.get("/children");
      setChildren(c);
      if (c[0]) setChildId(c[0].id);
    })();
  }, []);

  useEffect(() => {
    if (!childId) return;
    (async () => {
      const { data } = await api.get(`/progress/${childId}`);
      setData(data);
    })();
  }, [childId]);

  const timeline = (data?.timeline || []).map((t, i) => ({
    label: `#${i + 1}`,
    date: new Date(t.date).toLocaleDateString(),
    overall: t.overall_score,
    accuracy: t.accuracy,
    index: t.estimated_index,
  }));

  return (
    <div className="min-h-screen relative overflow-hidden">
      <Navbar />
      <div className="floating-blob bg-blue-400/30 w-80 h-80 -top-10 -left-16"></div>
      <div className="floating-blob bg-emerald-400/30 w-72 h-72 bottom-0 -right-16"></div>

      <main className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-10 relative">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Progress</p>
            <h1 className="text-3xl sm:text-5xl font-display font-black tracking-tight mt-1" data-testid="progress-heading">Growth over time</h1>
            <p className="text-muted-foreground mt-1">Track how brain skills evolve across assessments and games.</p>
          </div>
          {children.length > 0 && (
            <div className="min-w-[220px]">
              <p className="text-xs font-bold uppercase text-muted-foreground mb-1">Viewing</p>
              <Select value={childId} onValueChange={setChildId}>
                <SelectTrigger data-testid="progress-child-select" className="rounded-2xl h-11"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {children.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {children.length === 0 ? (
          <Card className="glass-card rounded-3xl border-0 p-8 mt-8 text-center">
            <p className="text-muted-foreground">Add a child profile to see progress.</p>
          </Card>
        ) : !data ? (
          <p className="mt-8 text-muted-foreground">Loading...</p>
        ) : (
          <>
            <div className="grid sm:grid-cols-3 gap-4 mt-8">
              <StatMini icon={Zap} label="XP" value={data.child.xp} color="from-orange-500 to-red-500" testid="prog-xp" />
              <StatMini icon={Star} label="Stars" value={data.child.stars} color="from-yellow-400 to-orange-400" testid="prog-stars" />
              <StatMini icon={Award} label="Badges" value={(data.child.badges || []).length} color="from-purple-500 to-pink-500" testid="prog-badges" />
            </div>

            <Card className="glass-card rounded-3xl border-0 p-6 mt-6" data-testid="progress-timeline-card">
              <div className="flex items-center justify-between">
                <h3 className="font-display font-black text-xl">Assessment timeline</h3>
                <Badge variant="secondary" className="rounded-full font-bold"><TrendingUp className="w-3.5 h-3.5 mr-1" /> {timeline.length} sessions</Badge>
              </div>
              <div className="h-72 mt-4">
                {timeline.length === 0 ? (
                  <p className="text-muted-foreground text-sm">No assessments yet.</p>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={timeline}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))" }} />
                      <Line type="monotone" dataKey="overall" stroke="hsl(217 91% 60%)" strokeWidth={3} name="Overall" />
                      <Line type="monotone" dataKey="accuracy" stroke="hsl(262 83% 66%)" strokeWidth={2} name="Accuracy" />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </Card>

            <Card className="glass-card rounded-3xl border-0 p-6 mt-5" data-testid="progress-categories-card">
              <h3 className="font-display font-black text-xl">Category strengths</h3>
              <div className="h-80 mt-4">
                {(data.category_progress || []).length === 0 ? (
                  <p className="text-muted-foreground text-sm">Complete assessments to see category breakdown.</p>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.category_progress} layout="vertical" margin={{ left: 90 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} />
                      <YAxis dataKey="label" type="category" tick={{ fontSize: 11, fontWeight: 700 }} width={90} />
                      <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))" }} />
                      <Bar dataKey="percentage" fill="hsl(217 91% 60%)" radius={[0, 8, 8, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </Card>
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}

function StatMini({ icon: Icon, label, value, color, testid }) {
  return (
    <Card className="glass-card rounded-3xl border-0 p-5 flex items-center gap-3" data-testid={testid}>
      <div className={`w-11 h-11 rounded-2xl grid place-items-center bg-gradient-to-br ${color}`}>
        <Icon className="w-5 h-5 text-white" strokeWidth={2.5} />
      </div>
      <div>
        <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">{label}</p>
        <p className="font-display font-black text-2xl">{value}</p>
      </div>
    </Card>
  );
}

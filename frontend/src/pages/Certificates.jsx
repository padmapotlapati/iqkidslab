import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api, { API } from "@/lib/api";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Award, Download, CheckCircle2 } from "lucide-react";

export default function Certificates() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try { const { data } = await api.get("/certificates"); setItems(data); } catch {}
      setLoading(false);
    })();
  }, []);

  return (
    <div className="min-h-screen relative overflow-hidden">
      <Navbar />
      <div className="floating-blob bg-yellow-300/30 w-80 h-80 -top-10 -left-16"></div>
      <div className="floating-blob bg-pink-400/30 w-72 h-72 bottom-0 -right-16"></div>

      <main className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-10 relative">
        <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Certificates</p>
        <h1 className="text-3xl sm:text-5xl font-display font-black tracking-tight mt-1" data-testid="certs-heading">Your achievements gallery</h1>
        <p className="text-muted-foreground mt-1">Every assessment with 50%+ overall unlocks a downloadable certificate.</p>

        {loading ? (
          <p className="mt-8 text-muted-foreground">Loading...</p>
        ) : items.length === 0 ? (
          <Card className="glass-card rounded-3xl border-0 p-10 mt-8 text-center">
            <div className="w-16 h-16 mx-auto rounded-3xl bg-gradient-to-br from-yellow-300 to-orange-400 grid place-items-center">
              <Award className="w-8 h-8 text-white" />
            </div>
            <h3 className="mt-4 text-xl font-display font-black">No certificates yet</h3>
            <p className="text-muted-foreground text-sm mt-1">Complete an assessment to earn one.</p>
            <Link to="/dashboard"><Button className="mt-5 pill-btn bg-gradient-to-r from-blue-500 to-purple-600 text-white font-black">Back to dashboard</Button></Link>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5 mt-8">
            {items.map(c => (
              <Card key={c.certificate_id} data-testid={`cert-card-${c.certificate_id}`}
                className="relative overflow-hidden rounded-3xl border-0 lift-shadow p-6 bg-card hover:-translate-y-1 transition-transform">
                <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-gradient-to-br from-yellow-300 to-orange-400 opacity-70 blur-xl"></div>
                <div className="relative">
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 uppercase tracking-widest">
                    <CheckCircle2 className="w-4 h-4" /> Certified
                  </div>
                  <h3 className="mt-3 font-display font-black text-xl">{c.child_name}</h3>
                  <p className="text-xs text-muted-foreground">Age {c.age_group} · {new Date(c.created_at).toLocaleDateString()}</p>
                  <div className="mt-3 flex items-center gap-2">
                    <Badge className="rounded-full bg-blue-100 text-blue-800 hover:bg-blue-100 border-0 font-bold">{c.overall_score}%</Badge>
                    <Badge className="rounded-full bg-purple-100 text-purple-800 hover:bg-purple-100 border-0 font-bold">Idx {c.estimated_index}</Badge>
                  </div>
                  <p className="text-[10px] uppercase text-muted-foreground font-bold tracking-wider mt-3">ID: {c.certificate_id}</p>
                  <a href={`${API}/certificates/${c.certificate_id}/pdf`} target="_blank" rel="noreferrer">
                    <Button className="pill-btn mt-4 w-full bg-gradient-to-r from-yellow-400 to-orange-400 text-slate-900 font-black hover:from-yellow-500 hover:to-orange-500" data-testid={`download-cert-${c.certificate_id}`}>
                      <Download className="w-4 h-4 mr-2" /> Download PDF
                    </Button>
                  </a>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}

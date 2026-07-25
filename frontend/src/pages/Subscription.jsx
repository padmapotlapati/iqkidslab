import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "@/lib/api";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Crown, ChevronLeft, ReceiptText, Ban, Sparkles, CheckCircle2, XCircle,
  Loader2, Zap, Award, Rocket, Calendar, IndianRupee,
} from "lucide-react";

const STATUS_STYLES = {
  paid:              { label: "Paid",              cls: "bg-emerald-100 text-emerald-800 border-emerald-200", icon: CheckCircle2 },
  created:           { label: "Pending",           cls: "bg-amber-100 text-amber-800 border-amber-200",         icon: Loader2 },
  signature_failed:  { label: "Signature failed",  cls: "bg-rose-100 text-rose-800 border-rose-200",             icon: XCircle },
  failed:            { label: "Failed",            cls: "bg-rose-100 text-rose-800 border-rose-200",             icon: XCircle },
};

const PLAN_ICON = { single: Zap, monthly: Crown, yearly: Award };

export default function Subscription() {
  const navigate = useNavigate();
  const [sub, setSub] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [s, h] = await Promise.all([
        api.get("/razorpay/subscription"),
        api.get("/razorpay/history"),
      ]);
      setSub(s.data);
      setHistory(h.data.items || []);
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const cancel = async () => {
    if (!window.confirm("Cancel your subscription? Access continues until the expiry date.")) return;
    setCancelling(true);
    try {
      await api.post("/razorpay/subscription/cancel");
      toast.success("Subscription cancelled. Access remains until expiry.");
      await load();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Could not cancel");
    } finally { setCancelling(false); }
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      <Navbar />
      <div className="floating-blob bg-purple-400/30 w-80 h-80 -top-10 -left-16"></div>
      <div className="floating-blob bg-pink-400/30 w-72 h-72 bottom-0 -right-10"></div>

      <main className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8 relative">
        <button onClick={() => navigate("/dashboard")} data-testid="sub-back-btn" className="text-sm font-bold text-muted-foreground hover:text-foreground flex items-center gap-1 mb-4">
          <ChevronLeft className="w-4 h-4" /> Back to dashboard
        </button>

        <h1 className="text-3xl sm:text-4xl font-display font-black tracking-tight" data-testid="sub-page-heading">
          Subscription & Purchases
        </h1>
        <p className="text-muted-foreground mt-1">Manage your plan, credits, and view your purchase history.</p>

        {/* Current plan */}
        <Card className="glass-card rounded-3xl border-0 p-6 mt-6" data-testid="current-plan-card">
          {loading ? (
            <div className="text-center py-8"><Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" /></div>
          ) : sub?.is_premium ? (
            <div className="flex flex-col sm:flex-row items-start gap-4">
              <div className="w-14 h-14 rounded-3xl bg-gradient-to-br from-yellow-300 to-orange-400 grid place-items-center shrink-0">
                <Crown className="w-7 h-7 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-bold uppercase text-muted-foreground tracking-widest">Current plan</p>
                <h2 className="text-2xl font-display font-black" data-testid="current-plan-label">{sub.subscription.plan_label}</h2>
                <div className="mt-2 flex flex-wrap gap-3 text-sm">
                  <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                    <Calendar className="w-3.5 h-3.5" />
                    Expires <b className="text-foreground">{new Date(sub.subscription.expires_at).toLocaleDateString()}</b>
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                    <IndianRupee className="w-3.5 h-3.5" /> ₹{sub.subscription.amount_display}
                  </span>
                </div>
              </div>
              <Button variant="outline" onClick={cancel} disabled={cancelling} data-testid="cancel-subscription-btn"
                className="pill-btn font-bold text-rose-600 border-rose-300 hover:bg-rose-50">
                {cancelling ? "Cancelling…" : (<><Ban className="w-4 h-4 mr-2" /> Cancel subscription</>)}
              </Button>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-start gap-4">
              <div className="w-14 h-14 rounded-3xl bg-gradient-to-br from-slate-400 to-slate-500 grid place-items-center shrink-0">
                <Sparkles className="w-7 h-7 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-bold uppercase text-muted-foreground tracking-widest">Current plan</p>
                <h2 className="text-2xl font-display font-black">Free</h2>
                <div className="mt-2 flex flex-wrap gap-3 text-sm text-muted-foreground">
                  <span data-testid="free-remaining">Free assessments left: <b className="text-foreground">{sub?.free_assessments_remaining ?? 1}</b></span>
                  <span data-testid="credit-balance">Assessment credits: <b className="text-foreground">{sub?.assessment_credits ?? 0}</b></span>
                </div>
              </div>
              <Link to="/pricing" data-testid="upgrade-cta-btn">
                <Button className="pill-btn bg-gradient-to-r from-blue-500 to-purple-600 text-white font-black">
                  <Crown className="w-4 h-4 mr-2" /> Upgrade to Premium
                </Button>
              </Link>
            </div>
          )}
        </Card>

        {/* Credits + Free breakdown */}
        {sub && !sub.is_premium && (
          <div className="grid sm:grid-cols-2 gap-3 mt-4">
            <Card className="glass-card rounded-3xl border-0 p-5" data-testid="stat-free">
              <p className="text-xs font-bold uppercase text-muted-foreground">Free assessments</p>
              <p className="text-3xl font-display font-black mt-1">{sub.free_assessments_remaining} <span className="text-sm text-muted-foreground font-bold">/ 1</span></p>
              <p className="text-xs text-muted-foreground mt-1">One free assessment per parent account.</p>
            </Card>
            <Card className="glass-card rounded-3xl border-0 p-5" data-testid="stat-credits">
              <p className="text-xs font-bold uppercase text-muted-foreground">Assessment credits</p>
              <p className="text-3xl font-display font-black mt-1">{sub.assessment_credits}</p>
              <p className="text-xs text-muted-foreground mt-1">Each credit unlocks a full assessment + PDF report.</p>
            </Card>
          </div>
        )}

        {/* History */}
        <Card className="glass-card rounded-3xl border-0 p-6 mt-6" data-testid="purchase-history-card">
          <h3 className="font-display font-black text-lg flex items-center gap-2 mb-3">
            <ReceiptText className="w-5 h-5 text-blue-500" /> Purchase history
          </h3>
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground" data-testid="history-empty">No purchases yet.</p>
          ) : (
            <div className="divide-y">
              {history.map((tx) => {
                const s = STATUS_STYLES[tx.status] || { label: tx.status, cls: "bg-muted", icon: null };
                const Icon = PLAN_ICON[tx.plan_id] || Rocket;
                return (
                  <div key={tx.order_id} className="py-3 flex flex-col sm:flex-row sm:items-center gap-3" data-testid={`tx-row-${tx.order_id}`}>
                    <div className="w-10 h-10 rounded-2xl bg-muted grid place-items-center shrink-0">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-sm">{tx.plan_label}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {tx.created_at ? new Date(tx.created_at).toLocaleString() : ""} · <span className="font-mono">{tx.order_id}</span>
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="font-display font-black">₹{tx.amount_display}</span>
                      <Badge className={`rounded-full border font-bold ${s.cls}`} data-testid={`tx-status-${tx.order_id}`}>{s.label}</Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </main>
      <Footer />
    </div>
  );
}

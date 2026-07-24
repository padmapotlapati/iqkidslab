import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "@/lib/api";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Check, Sparkles, Star, Award, Zap, Tag } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const FEATURES_FREE = [
  "1 child profile",
  "1 assessment per week",
  "Basic report",
  "Certificate download",
];
const FEATURES_PREMIUM = [
  "Unlimited child profiles",
  "Unlimited assessments",
  "Full AI-personalized reports",
  "PDF report + branded certificate with QR",
  "All 10 brain games unlocked",
  "Progress charts + insights",
  "Weekly & monthly AI practice plans",
  "Priority support",
];

export default function Pricing() {
  const { user } = useAuth();
  const [plans, setPlans] = useState([]);
  const [coupon, setCoupon] = useState("");
  const [checking, setChecking] = useState(false);
  const [validCoupon, setValidCoupon] = useState(null);

  useEffect(() => { (async () => { const { data } = await api.get("/plans"); setPlans(data); })(); }, []);

  const checkCoupon = async () => {
    if (!coupon) return;
    setChecking(true);
    try {
      const { data } = await api.get(`/coupons/${coupon}`);
      setValidCoupon(data);
      toast.success(`${data.discount_percent}% discount applied!`);
    } catch { setValidCoupon(null); toast.error("Invalid coupon"); }
    setChecking(false);
  };

  const checkout = async (planId) => {
    if (!user || user === false) {
      toast.info("Sign in to subscribe.");
      window.location.href = "/login";
      return;
    }
    try {
      const { data } = await api.post("/payments/checkout", {
        plan_id: planId,
        origin_url: window.location.origin,
        coupon_code: validCoupon?.code || null,
      });
      window.location.href = data.checkout_url;
    } catch (e) { toast.error("Could not start checkout"); }
  };

  const displayPrice = (base) => validCoupon ? (base * (100 - validCoupon.discount_percent) / 100).toFixed(2) : base.toFixed(2);

  return (
    <div className="min-h-screen relative overflow-hidden">
      <Navbar />
      <div className="floating-blob bg-purple-400/30 w-80 h-80 -top-10 -right-16"></div>
      <div className="floating-blob bg-blue-400/30 w-72 h-72 bottom-0 -left-10"></div>

      <main className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-14 relative">
        <div className="text-center max-w-2xl mx-auto">
          <Badge className="rounded-full bg-yellow-100 text-yellow-800 hover:bg-yellow-100 border-0 font-bold" data-testid="pricing-badge">
            <Sparkles className="w-3.5 h-3.5 mr-1.5" /> Simple, transparent pricing
          </Badge>
          <h1 className="mt-4 text-4xl sm:text-5xl font-display font-black tracking-tight" data-testid="pricing-headline">
            Unlock your child&apos;s <span className="brand-gradient-text">full potential</span>
          </h1>
          <p className="mt-3 text-muted-foreground">Start free — upgrade any time.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-5 mt-12">
          {/* Free Plan */}
          <Card className="glass-card rounded-[2rem] border-0 p-8" data-testid="plan-free">
            <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Free</p>
            <h3 className="mt-2 text-3xl font-display font-black">$0<span className="text-base font-bold text-muted-foreground">/month</span></h3>
            <p className="text-sm text-muted-foreground mt-1">Get started with the basics.</p>
            <ul className="mt-6 space-y-2">
              {FEATURES_FREE.map(f => (
                <li key={f} className="flex items-start gap-2 text-sm"><Check className="w-4 h-4 mt-0.5 text-emerald-500" /> {f}</li>
              ))}
            </ul>
            <Link to={user ? "/dashboard" : "/register"} className="block mt-8">
              <Button variant="outline" className="pill-btn w-full h-12 font-black" data-testid="free-cta-btn">
                {user ? "Go to dashboard" : "Get started free"}
              </Button>
            </Link>
          </Card>

          {plans.map((p, i) => {
            const isYearly = p.id === "premium_yearly";
            return (
              <Card key={p.id} data-testid={`plan-${p.id}`}
                className={`relative rounded-[2rem] p-8 lift-shadow border-0 ${isYearly ? "bg-gradient-to-br from-purple-600 via-blue-600 to-pink-500 text-white" : "glass-card"}`}>
                {isYearly && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-yellow-400 text-yellow-900 hover:bg-yellow-400 border-0 font-black">
                    <Star className="w-3 h-3 mr-1 fill-yellow-900" /> BEST VALUE
                  </Badge>
                )}
                <p className={`text-xs font-black uppercase tracking-widest ${isYearly ? "text-yellow-200" : "text-muted-foreground"}`}>{p.name}</p>
                <h3 className={`mt-2 text-3xl font-display font-black ${isYearly ? "text-white" : ""}`}>
                  ${displayPrice(p.amount)}<span className={`text-base font-bold ${isYearly ? "text-white/70" : "text-muted-foreground"}`}>/{p.interval}</span>
                </h3>
                {validCoupon && (
                  <p className={`text-xs font-bold mt-1 ${isYearly ? "text-yellow-200" : "text-emerald-500"}`}>
                    Coupon {validCoupon.code} saves {validCoupon.discount_percent}%
                  </p>
                )}
                {isYearly && <p className="text-xs mt-1 text-yellow-200 font-bold">Save 25% vs monthly</p>}
                <ul className="mt-6 space-y-2">
                  {FEATURES_PREMIUM.map(f => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <Check className={`w-4 h-4 mt-0.5 ${isYearly ? "text-yellow-300" : "text-emerald-500"}`} /> {f}
                    </li>
                  ))}
                </ul>
                <Button onClick={() => checkout(p.id)} data-testid={`subscribe-${p.id}`}
                  className={`pill-btn w-full h-12 mt-8 font-black ${isYearly ? "bg-white text-slate-900 hover:bg-white/90" : "bg-gradient-to-r from-blue-500 to-purple-600 text-white"}`}>
                  <Zap className="w-4 h-4 mr-2" /> Subscribe
                </Button>
              </Card>
            );
          })}
        </div>

        <Card className="glass-card rounded-3xl border-0 p-6 mt-10 max-w-xl mx-auto" data-testid="coupon-card">
          <div className="flex items-center gap-2 text-sm font-bold"><Tag className="w-4 h-4" /> Have a coupon?</div>
          <div className="mt-3 flex gap-2">
            <Input value={coupon} onChange={e => setCoupon(e.target.value.toUpperCase())} placeholder="ENTER CODE" className="h-11 rounded-2xl uppercase font-bold tracking-widest" data-testid="coupon-input" />
            <Button onClick={checkCoupon} disabled={checking || !coupon} className="pill-btn h-11 px-5 font-bold" data-testid="coupon-apply-btn">Apply</Button>
          </div>
          {validCoupon && (
            <p className="text-xs font-bold text-emerald-600 mt-2">✓ {validCoupon.discount_percent}% off applied</p>
          )}
        </Card>

        <div className="mt-14 text-center text-xs text-muted-foreground">
          Test card: 4242 4242 4242 4242, any future expiry, any CVC. Powered by Stripe.
        </div>
      </main>
      <Footer />
    </div>
  );
}

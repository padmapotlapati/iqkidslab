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
import { Check, Sparkles, Star, Zap, Tag, Crown, Users, Gift, Gauge, Award, Rocket, Infinity as InfIcon, ArrowRight } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

// Approx FX (server sends INR base; convert to USD if user outside India)
const USD_PER_INR = 0.012;

const PLAN_ORDER = ["pay_per_test", "starter_pack", "family_pack", "premium_monthly", "premium_yearly"];

const PLAN_META = {
  pay_per_test: { icon: Zap, color: "from-yellow-400 to-orange-400", subtitle: "Great to try", ribbon: null,
    features: ["1 complete AI assessment", "AI-powered score analysis", "PDF report", "Digital certificate", "Assessment history"] },
  starter_pack: { icon: Rocket, color: "from-orange-500 to-pink-500", subtitle: "Save more", ribbon: "SAVE 13%",
    features: ["5 complete assessments", "AI reports for each", "PDF certificates", "Save vs pay-per-test"] },
  family_pack: { icon: Users, color: "from-fuchsia-500 to-purple-500", subtitle: "For siblings", ribbon: "FAMILY",
    features: ["10 assessments", "Multiple children supported", "AI reports & certificates", "Save 23%"] },
  premium_monthly: { icon: Crown, color: "from-blue-600 via-purple-600 to-pink-500", subtitle: "Most popular", ribbon: "⭐ MOST POPULAR ⭐", popular: true,
    features: ["Unlimited assessments", "Unlimited AI reports", "Unlimited PDF reports", "Unlimited certificates", "All 7 brain games", "Progress tracking", "AI personalized recommendations", "Priority support", "Premium dashboard"] },
  premium_yearly: { icon: Award, color: "from-emerald-500 to-teal-600", subtitle: "Best long-term value", ribbon: "SAVE 33%",
    features: ["Everything in Monthly", "12 months of unlimited access", "Save ₹389 vs monthly", "Priority support"] },
};

const FREE_FEATURES = ["1 free assessment per child", "Basic score summary", "Limited brain games", "No PDF report", "No AI detailed report"];

export default function Pricing() {
  const { user } = useAuth();
  const [plans, setPlans] = useState([]);
  const [coupon, setCoupon] = useState("");
  const [validCoupon, setValidCoupon] = useState(null);
  const [checking, setChecking] = useState(false);
  const [geo, setGeo] = useState({ is_india: true, currency: "INR" });
  const [selectedForcedCurrency, setForcedCurrency] = useState(null);

  useEffect(() => {
    (async () => {
      const [p, g] = await Promise.all([api.get("/plans"), api.get("/geo/detect")]);
      setPlans(p.data);
      setGeo(g.data);
    })();
  }, []);

  const inrMode = selectedForcedCurrency ? selectedForcedCurrency === "INR" : geo.is_india;
  const symbol = inrMode ? "₹" : "$";

  const displayAmount = (inrAmt) => {
    const discounted = validCoupon ? inrAmt * (100 - validCoupon.discount_percent) / 100 : inrAmt;
    if (inrMode) return Math.round(discounted).toLocaleString("en-IN");
    return (discounted * USD_PER_INR).toFixed(2);
  };

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
      toast.info("Sign in to purchase");
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
    } catch { toast.error("Could not start checkout"); }
  };

  const monthlyPlan = plans.find(p => p.id === "premium_monthly");

  return (
    <div className="min-h-screen relative overflow-hidden">
      <Navbar />
      <div className="floating-blob bg-purple-400/30 w-96 h-96 -top-10 -right-16"></div>
      <div className="floating-blob bg-blue-400/30 w-80 h-80 bottom-0 -left-10"></div>
      <div className="floating-blob bg-yellow-300/20 w-72 h-72 top-1/3 left-1/2"></div>

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14 relative">
        <div className="text-center max-w-3xl mx-auto">
          <Badge className="rounded-full bg-yellow-100 text-yellow-800 hover:bg-yellow-100 border-0 font-bold" data-testid="pricing-badge">
            <Sparkles className="w-3.5 h-3.5 mr-1.5" /> Affordable pricing for every family
          </Badge>
          <h1 className="mt-4 text-4xl sm:text-6xl font-display font-black tracking-tight" data-testid="pricing-headline">
            Pick a plan that <span className="brand-gradient-text">grows with your child</span>
          </h1>
          <p className="mt-4 text-muted-foreground text-lg">Start with a single test or unlock unlimited assessments with Premium.</p>

          {/* Currency toggle */}
          <div className="mt-6 inline-flex bg-muted rounded-full p-1" data-testid="currency-toggle">
            <button onClick={() => setForcedCurrency("INR")} data-testid="cur-inr"
              className={`px-4 py-1.5 rounded-full text-xs font-black transition-colors ${inrMode ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
              ₹ INR (India)
            </button>
            <button onClick={() => setForcedCurrency("USD")} data-testid="cur-usd"
              className={`px-4 py-1.5 rounded-full text-xs font-black transition-colors ${!inrMode ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
              $ USD (International)
            </button>
          </div>
        </div>

        {/* PREMIUM MONTHLY HERO CARD - center focus */}
        {monthlyPlan && (
          <div className="mt-14 flex justify-center">
            <div className="relative w-full max-w-3xl" data-testid="premium-hero-card">
              {/* Glow */}
              <div className="absolute -inset-4 rounded-[3rem] bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-600 opacity-40 blur-2xl animate-float"></div>
              <Card className="relative rounded-[2.5rem] border-4 border-yellow-400 p-8 sm:p-12 bg-gradient-to-br from-blue-600 via-purple-600 to-pink-500 text-white overflow-hidden lift-shadow" data-testid={`plan-premium_monthly`}>
                {/* MOST POPULAR ribbon */}
                <div className="absolute top-0 right-0 sm:right-8">
                  <div className="bg-gradient-to-r from-yellow-400 via-orange-400 to-yellow-400 text-yellow-900 font-black text-xs px-4 py-2 rounded-b-xl shadow-lg tracking-widest">
                    ⭐ MOST POPULAR ⭐
                  </div>
                </div>
                <div className="floating-blob bg-yellow-300/40 w-64 h-64 -bottom-10 -right-10"></div>
                <div className="relative flex flex-col sm:flex-row gap-8 items-start">
                  <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-yellow-300 to-orange-400 grid place-items-center shadow-xl animate-float shrink-0">
                    <Crown className="w-10 h-10 text-white" strokeWidth={2.2} />
                  </div>
                  <div className="flex-1">
                    <Badge className="rounded-full bg-yellow-400 text-yellow-900 hover:bg-yellow-400 border-0 font-black text-xs">
                      <Star className="w-3 h-3 mr-1 fill-yellow-900" /> BEST VALUE
                    </Badge>
                    <h2 className="mt-3 text-3xl sm:text-4xl font-display font-black">Premium Monthly</h2>
                    <p className="text-white/80 text-sm mt-1">Recommended for parents — unlock everything.</p>

                    <div className="mt-5 flex items-baseline gap-2">
                      <span className="text-5xl sm:text-6xl font-display font-black" data-testid="premium-price">{symbol}{displayAmount(monthlyPlan.amount)}</span>
                      <span className="text-lg text-white/80 font-bold">/month</span>
                    </div>
                    {validCoupon && (
                      <p className="text-yellow-200 text-xs font-bold mt-1">Coupon {validCoupon.code} — {validCoupon.discount_percent}% off applied</p>
                    )}

                    <ul className="mt-5 grid sm:grid-cols-2 gap-x-4 gap-y-2 text-sm">
                      {PLAN_META.premium_monthly.features.map(f => (
                        <li key={f} className="flex items-start gap-1.5">
                          <Check className="w-4 h-4 mt-0.5 text-yellow-300 shrink-0" /> {f}
                        </li>
                      ))}
                    </ul>

                    <Button onClick={() => checkout("premium_monthly")} data-testid="subscribe-premium_monthly"
                      className="pill-btn mt-7 h-14 px-10 bg-yellow-400 text-yellow-900 hover:bg-yellow-300 font-black text-base shadow-xl animate-pulse">
                      <Sparkles className="w-5 h-5 mr-2" /> Start Premium <ArrowRight className="w-5 h-5 ml-2" />
                    </Button>
                    <p className="text-[11px] text-white/70 mt-3">Cancel any time. 7-day money-back guarantee.</p>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        )}

        {/* OTHER PLANS grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-10">
          {/* Free plan */}
          <Card className="glass-card rounded-3xl border-0 p-6 flex flex-col" data-testid="plan-free">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 grid place-items-center shadow-md">
              <Gift className="w-6 h-6 text-white" />
            </div>
            <p className="text-xs font-black uppercase tracking-widest text-muted-foreground mt-4">Free</p>
            <h3 className="mt-1 font-display font-black text-2xl">{symbol}0</h3>
            <p className="text-xs text-muted-foreground">Get started at no cost</p>
            <ul className="mt-4 space-y-1.5 text-sm flex-1">
              {FREE_FEATURES.map(f => (
                <li key={f} className="flex items-start gap-1.5"><Check className="w-4 h-4 mt-0.5 text-emerald-500 shrink-0" /> {f}</li>
              ))}
            </ul>
            <Link to={user ? "/dashboard" : "/register"} className="mt-6">
              <Button variant="outline" className="pill-btn w-full h-11 font-bold" data-testid="free-cta-btn">
                {user ? "Go to dashboard" : "Start free"}
              </Button>
            </Link>
          </Card>

          {["pay_per_test", "starter_pack", "family_pack", "premium_yearly"].map(pid => {
            const plan = plans.find(p => p.id === pid);
            if (!plan) return null;
            const meta = PLAN_META[pid];
            const Icon = meta.icon;
            const perUnit = plan.credits && plan.credits > 1 ? (plan.amount / plan.credits) : null;
            return (
              <Card key={pid} className="glass-card rounded-3xl border-0 p-6 flex flex-col relative overflow-hidden" data-testid={`plan-${pid}`}>
                {meta.ribbon && (
                  <div className="absolute -top-1 -right-1">
                    <div className={`text-white text-[10px] font-black tracking-widest px-3 py-1.5 rounded-bl-xl rounded-tr-2xl bg-gradient-to-r ${meta.color}`}>
                      {meta.ribbon}
                    </div>
                  </div>
                )}
                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${meta.color} grid place-items-center shadow-md`}>
                  <Icon className="w-6 h-6 text-white" strokeWidth={2.3} />
                </div>
                <p className="text-xs font-black uppercase tracking-widest text-muted-foreground mt-4">{plan.name}</p>
                <div className="mt-1 flex items-baseline gap-1">
                  <h3 className="font-display font-black text-2xl">{symbol}{displayAmount(plan.amount)}</h3>
                  {plan.interval && <span className="text-xs text-muted-foreground font-bold">/{plan.interval}</span>}
                </div>
                {perUnit && <p className="text-[11px] text-muted-foreground">{symbol}{Math.round(perUnit)} per assessment</p>}
                <ul className="mt-4 space-y-1.5 text-sm flex-1">
                  {meta.features.map(f => (
                    <li key={f} className="flex items-start gap-1.5"><Check className="w-4 h-4 mt-0.5 text-emerald-500 shrink-0" /> {f}</li>
                  ))}
                </ul>
                <Button onClick={() => checkout(pid)} data-testid={`subscribe-${pid}`}
                  className={`pill-btn w-full h-11 mt-5 font-black text-white bg-gradient-to-r ${meta.color}`}>
                  {plan.mode === "subscription" ? "Subscribe" : "Buy now"} <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Card>
            );
          })}
        </div>

        {/* Coupon + Referral row */}
        <div className="grid md:grid-cols-2 gap-5 mt-10 max-w-3xl mx-auto">
          <Card className="glass-card rounded-3xl border-0 p-6" data-testid="coupon-card">
            <div className="flex items-center gap-2 text-sm font-bold"><Tag className="w-4 h-4" /> Have a coupon?</div>
            <div className="mt-3 flex gap-2">
              <Input value={coupon} onChange={e => setCoupon(e.target.value.toUpperCase())} placeholder="ENTER CODE"
                className="h-11 rounded-2xl uppercase font-bold tracking-widest" data-testid="coupon-input" />
              <Button onClick={checkCoupon} disabled={checking || !coupon} className="pill-btn h-11 px-5 font-bold" data-testid="coupon-apply-btn">Apply</Button>
            </div>
            {validCoupon && (<p className="text-xs font-bold text-emerald-600 mt-2">✓ {validCoupon.discount_percent}% off applied</p>)}
          </Card>
          <Card className="glass-card rounded-3xl border-0 p-6">
            <div className="flex items-center gap-2 text-sm font-bold"><Gift className="w-4 h-4" /> Referral rewards</div>
            <p className="text-xs text-muted-foreground mt-2">Invite friends — you both get <b>3 free assessments</b> when they purchase.</p>
            <Link to={user ? "/dashboard" : "/register"}>
              <Button variant="outline" className="pill-btn w-full h-11 mt-3 font-bold" data-testid="referral-cta">
                {user ? "Get my referral code" : "Sign up to invite"}
              </Button>
            </Link>
          </Card>
        </div>

        {/* Trust row */}
        <div className="grid sm:grid-cols-4 gap-4 mt-14 text-center">
          {[
            { icon: Gauge, label: "Cancel anytime" },
            { icon: InfIcon, label: "7-day money-back" },
            { icon: Award, label: "Secure Stripe payments" },
            { icon: Zap, label: "Instant activation" },
          ].map((t, i) => (
            <div key={i} className="flex items-center gap-2 justify-center text-xs font-bold text-muted-foreground">
              <t.icon className="w-4 h-4 text-primary" /> {t.label}
            </div>
          ))}
        </div>

        <div className="mt-8 text-center text-[11px] text-muted-foreground">
          Test card: 4242 4242 4242 4242, any future expiry, any CVC. Powered by Stripe. UPI/Google Pay/PhonePe available for Indian customers via Stripe.
        </div>
      </main>
      <Footer />
    </div>
  );
}

import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "@/lib/api";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Check, Sparkles, Star, Zap, Crown, Gift, Award, Rocket, Infinity as InfIcon, ArrowRight, Gauge, ShieldCheck } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

// Loads the Razorpay Checkout script once
function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

const FREE_FEATURES = [
  "1 free assessment (parent account)",
  "Summary Brain Skills Report",
  "Age-appropriate Brain Games",
  "Basic dashboard",
];

const PLAN_UI = {
  single: {
    icon: Zap,
    color: "from-orange-500 to-pink-500",
    subtitle: "Great for one-time try",
    features: [
      "1 complete IQ Assessment",
      "Detailed Brain Skills Report",
      "PDF Report Download",
      "Digital Certificate",
    ],
    ribbon: null,
    cta: "Buy Assessment Pass",
  },
  monthly: {
    icon: Crown,
    color: "from-blue-600 via-purple-600 to-pink-500",
    subtitle: "Most popular",
    ribbon: "⭐ MOST POPULAR ⭐",
    popular: true,
    features: [
      "Unlimited IQ Assessments",
      "Unlimited Brain Games",
      "Detailed Brain Skills Reports",
      "PDF Report Downloads",
      "Weekly Progress Reports",
      "Parent Dashboard",
      "XP, Coins, Levels, Badges",
      "Priority New Content",
    ],
    cta: "Start Monthly Premium",
  },
  yearly: {
    icon: Award,
    color: "from-emerald-500 to-teal-600",
    subtitle: "Best value — 2 months free",
    ribbon: "SAVE ~33%",
    features: [
      "Everything in Monthly Premium",
      "12 months of unlimited access",
      "2 months FREE (save ₹389)",
      "Priority support",
    ],
    cta: "Start Yearly Premium",
  },
};

export default function Pricing() {
  const { user, refresh } = useAuth();
  const navigate = useNavigate();
  const [plans, setPlans] = useState([]);
  const [subInfo, setSubInfo] = useState(null);
  const [processing, setProcessing] = useState(null); // plan_id currently checking out

  useEffect(() => {
    (async () => {
      const [p] = await Promise.all([api.get("/razorpay/plans")]);
      setPlans(p.data.plans);
      if (user) {
        try {
          const { data } = await api.get("/razorpay/subscription");
          setSubInfo(data);
        } catch {}
      }
    })();
  }, [user]);

  const startCheckout = async (planId) => {
    if (!user || user === false) {
      toast.info("Sign in to purchase");
      navigate("/login");
      return;
    }
    setProcessing(planId);
    const scriptLoaded = await loadRazorpayScript();
    if (!scriptLoaded) {
      toast.error("Could not load Razorpay. Please retry.");
      setProcessing(null);
      return;
    }

    let orderResp;
    try {
      const { data } = await api.post("/razorpay/order", { plan_id: planId });
      orderResp = data;
    } catch (e) {
      const msg = e.response?.data?.detail;
      toast.error(typeof msg === "string" ? msg : "Could not create order");
      setProcessing(null);
      return;
    }

    const options = {
      key: orderResp.key_id,
      amount: orderResp.amount_paise,
      currency: orderResp.currency,
      name: "Kids IQ Test",
      description: orderResp.plan.label,
      image: `${window.location.origin}/favicon.ico`,
      order_id: orderResp.order_id,
      prefill: orderResp.prefill,
      theme: { color: "#8B5CF6" },
      handler: async (resp) => {
        try {
          await api.post("/razorpay/verify", {
            razorpay_order_id: resp.razorpay_order_id,
            razorpay_payment_id: resp.razorpay_payment_id,
            razorpay_signature: resp.razorpay_signature,
          });
          await refresh();
          navigate(`/payment/success?order_id=${resp.razorpay_order_id}&plan=${planId}`);
        } catch (e) {
          const msg = e.response?.data?.detail;
          toast.error(typeof msg === "string" ? msg : "Payment verification failed");
          navigate(`/payment/cancel?order_id=${resp.razorpay_order_id}`);
        }
      },
      modal: {
        ondismiss: () => {
          setProcessing(null);
        },
      },
    };

    const rzp = new window.Razorpay(options);
    rzp.on("payment.failed", (resp) => {
      toast.error(`Payment failed: ${resp.error?.description || "Unknown error"}`);
      setProcessing(null);
      navigate(`/payment/cancel?order_id=${resp.error?.metadata?.order_id || ""}`);
    });
    rzp.open();
  };

  const findPlan = (id) => plans.find((p) => p.id === id);
  const alreadyPremium = subInfo?.is_premium;

  return (
    <div className="min-h-screen relative overflow-hidden">
      <Navbar />
      <div className="floating-blob bg-purple-400/30 w-96 h-96 -top-10 -right-16"></div>
      <div className="floating-blob bg-blue-400/30 w-80 h-80 bottom-0 -left-10"></div>
      <div className="floating-blob bg-yellow-300/20 w-72 h-72 top-1/3 left-1/2"></div>

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14 relative">
        {/* Hero */}
        <div className="text-center max-w-3xl mx-auto">
          <Badge className="rounded-full bg-yellow-100 text-yellow-800 hover:bg-yellow-100 border-0 font-bold" data-testid="pricing-badge">
            <Sparkles className="w-3.5 h-3.5 mr-1.5" /> Simple, honest INR pricing
          </Badge>
          <h1 className="mt-4 text-4xl sm:text-6xl font-display font-black tracking-tight" data-testid="pricing-headline">
            Pick a plan that <span className="brand-gradient-text">grows with your child</span>
          </h1>
          <p className="mt-4 text-muted-foreground text-lg">Start with a free assessment, upgrade any time — pay securely with UPI, cards, or wallets.</p>

          {alreadyPremium && (
            <div className="mt-6 max-w-md mx-auto rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-900 p-4 flex items-center gap-3" data-testid="already-premium-banner">
              <ShieldCheck className="w-5 h-5 text-emerald-500" />
              <div className="text-sm text-left">
                <p className="font-black">You're already on {subInfo?.subscription?.plan_label}</p>
                <p className="text-muted-foreground">Expires {new Date(subInfo?.subscription?.expires_at).toLocaleDateString()}</p>
              </div>
              <Link to="/dashboard/subscription" className="ml-auto">
                <Button variant="outline" className="pill-btn font-bold" data-testid="manage-sub-btn">Manage</Button>
              </Link>
            </div>
          )}
        </div>

        {/* Plans row */}
        <div className="grid lg:grid-cols-4 gap-5 mt-14">
          {/* Free plan */}
          <Card className="glass-card rounded-3xl border-0 p-6 flex flex-col" data-testid="plan-free">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 grid place-items-center shadow-md">
              <Gift className="w-6 h-6 text-white" />
            </div>
            <p className="text-xs font-black uppercase tracking-widest text-muted-foreground mt-4">Free</p>
            <div className="flex items-baseline gap-1 mt-1">
              <h3 className="font-display font-black text-3xl">₹0</h3>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {subInfo ? `${subInfo.free_assessments_remaining}/1 free left` : "1 free assessment for new parents"}
            </p>
            <ul className="mt-4 space-y-1.5 text-sm flex-1">
              {FREE_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-1.5">
                  <Check className="w-4 h-4 mt-0.5 text-emerald-500 shrink-0" /> {f}
                </li>
              ))}
            </ul>
            <Link to={user ? "/dashboard" : "/register"} className="mt-6">
              <Button variant="outline" className="pill-btn w-full h-11 font-bold" data-testid="free-cta-btn">
                {user ? "Go to dashboard" : "Start free"}
              </Button>
            </Link>
          </Card>

          {/* 3 paid plans */}
          {["single", "monthly", "yearly"].map((id) => {
            const plan = findPlan(id);
            if (!plan) return null;
            const ui = PLAN_UI[id];
            const Icon = ui.icon;
            const isPopular = ui.popular;
            return (
              <Card
                key={id}
                data-testid={`plan-${id}`}
                className={`relative overflow-hidden rounded-3xl border-0 p-6 flex flex-col lift-shadow ${
                  isPopular ? `bg-gradient-to-br ${ui.color} text-white` : "glass-card"
                }`}
              >
                {ui.ribbon && (
                  <div className="absolute top-0 right-0">
                    <div className={`text-white text-[10px] font-black tracking-widest px-3 py-1.5 rounded-bl-xl rounded-tr-2xl ${
                      isPopular
                        ? "bg-yellow-400 text-yellow-900"
                        : `bg-gradient-to-r ${ui.color}`
                    }`} data-testid={`plan-${id}-ribbon`}>
                      {ui.ribbon}
                    </div>
                  </div>
                )}
                {isPopular && <div className="floating-blob bg-white/20 w-40 h-40 -bottom-10 -right-10"></div>}

                <div className="relative flex-1 flex flex-col">
                  <div className={`w-12 h-12 rounded-2xl grid place-items-center shadow-md ${
                    isPopular ? "bg-white/20 backdrop-blur" : `bg-gradient-to-br ${ui.color}`
                  }`}>
                    <Icon className="w-6 h-6 text-white" strokeWidth={2.3} />
                  </div>
                  <p className={`text-xs font-black uppercase tracking-widest mt-4 ${isPopular ? "text-white/85" : "text-muted-foreground"}`}>
                    {plan.label}
                  </p>
                  <div className="flex items-baseline gap-1 mt-1">
                    <h3 className="font-display font-black text-3xl" data-testid={`plan-${id}-price`}>₹{plan.amount_display}</h3>
                    {plan.kind === "subscription" && (
                      <span className={`text-xs font-bold ${isPopular ? "text-white/80" : "text-muted-foreground"}`}>
                        /{id === "monthly" ? "month" : "year"}
                      </span>
                    )}
                  </div>
                  <p className={`text-xs mt-1 ${isPopular ? "text-white/80" : "text-muted-foreground"}`}>{ui.subtitle}</p>

                  <ul className="mt-4 space-y-1.5 text-sm flex-1">
                    {ui.features.map((f) => (
                      <li key={f} className="flex items-start gap-1.5">
                        <Check className={`w-4 h-4 mt-0.5 shrink-0 ${isPopular ? "text-yellow-300" : "text-emerald-500"}`} /> {f}
                      </li>
                    ))}
                  </ul>

                  <Button
                    onClick={() => startCheckout(id)}
                    disabled={processing === id || alreadyPremium}
                    data-testid={`subscribe-${id}`}
                    className={`pill-btn w-full h-12 mt-6 font-black ${
                      isPopular
                        ? "bg-yellow-400 text-yellow-900 hover:bg-yellow-300"
                        : `text-white bg-gradient-to-r ${ui.color}`
                    }`}
                  >
                    {processing === id ? "Opening…" : (<>{ui.cta} <ArrowRight className="w-4 h-4 ml-2" /></>)}
                  </Button>
                  {alreadyPremium && plan.kind === "subscription" && (
                    <p className={`text-[11px] mt-2 ${isPopular ? "text-white/80" : "text-muted-foreground"}`}>
                      You already have an active subscription.
                    </p>
                  )}
                </div>
              </Card>
            );
          })}
        </div>

        {/* Trust row */}
        <div className="grid sm:grid-cols-4 gap-4 mt-14 text-center">
          {[
            { icon: Gauge, label: "Cancel anytime" },
            { icon: InfIcon, label: "7-day money-back" },
            { icon: ShieldCheck, label: "Secure Razorpay checkout" },
            { icon: Zap, label: "Instant Premium unlock" },
          ].map((t, i) => (
            <div key={i} className="flex items-center gap-2 justify-center text-xs font-bold text-muted-foreground">
              <t.icon className="w-4 h-4 text-primary" /> {t.label}
            </div>
          ))}
        </div>

        <div className="mt-8 text-center text-[11px] text-muted-foreground max-w-2xl mx-auto">
          <span className="font-bold">Test mode:</span> use Razorpay test card <span className="font-mono">4111 1111 1111 1111</span> (any future expiry, any CVC, OTP <span className="font-mono">1234</span>). UPI / Netbanking / Wallets also available on the checkout modal.
        </div>
      </main>
      <Footer />
    </div>
  );
}

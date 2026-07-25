import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import api from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { CheckCircle2, XCircle, Loader2, Sparkles, ChevronRight, ChevronLeft, ReceiptText } from "lucide-react";
import Confetti from "@/components/Confetti";

export function PaymentSuccess() {
  const [sp] = useSearchParams();
  const orderId = sp.get("order_id");
  const planParam = sp.get("plan");
  const [state, setState] = useState({ status: "checking" });
  const [confetti, setConfetti] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const check = async (tries = 0) => {
      if (cancelled) return;
      try {
        const { data } = await api.get(`/razorpay/history`);
        const tx = (data.items || []).find((t) => t.order_id === orderId);
        if (tx && tx.status === "paid") {
          setState({ status: "paid", tx });
          setConfetti(true);
          return;
        }
        if (tries < 6) setTimeout(() => check(tries + 1), 1500);
        else setState({ status: "timeout", tx });
      } catch {
        if (tries < 6) setTimeout(() => check(tries + 1), 1500);
        else setState({ status: "timeout" });
      }
    };
    check(0);
    return () => { cancelled = true; };
  }, [orderId]);

  return (
    <div className="min-h-screen relative overflow-hidden">
      <Navbar />
      <Confetti trigger={confetti} />
      <div className="floating-blob bg-emerald-400/40 w-80 h-80 -top-10 -left-16"></div>
      <div className="floating-blob bg-purple-400/40 w-72 h-72 bottom-0 -right-10"></div>

      <main className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8 py-14 relative">
        <Card className="glass-card rounded-[2rem] border-0 p-10 text-center animate-pop" data-testid="payment-success-card">
          {state.status === "checking" && (
            <>
              <Loader2 className="w-16 h-16 animate-spin mx-auto text-primary" data-testid="payment-checking" />
              <h1 className="mt-6 text-3xl font-display font-black">Confirming your payment…</h1>
              <p className="text-muted-foreground mt-2">This usually takes a moment.</p>
            </>
          )}
          {state.status === "paid" && (
            <>
              <div className="w-20 h-20 rounded-3xl mx-auto bg-gradient-to-br from-emerald-500 to-teal-500 grid place-items-center animate-float">
                <CheckCircle2 className="w-11 h-11 text-white" />
              </div>
              <h1 className="mt-6 text-3xl font-display font-black" data-testid="payment-success-title">Payment successful!</h1>
              <p className="text-muted-foreground mt-2">
                ₹{state.tx?.amount_display} — {state.tx?.plan_label || planParam}
              </p>
              <p className="text-xs text-muted-foreground mt-2 font-mono">Order: {orderId}</p>
              <div className="mt-6 flex flex-col sm:flex-row gap-2 justify-center">
                <Link to="/dashboard" data-testid="payment-success-cta">
                  <Button className="pill-btn h-12 px-8 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-black">
                    <Sparkles className="w-4 h-4 mr-2" /> Go to dashboard <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </Link>
                <Link to="/dashboard/subscription">
                  <Button variant="outline" className="pill-btn h-12 px-8 font-bold" data-testid="view-history-btn">
                    <ReceiptText className="w-4 h-4 mr-2" /> View history
                  </Button>
                </Link>
              </div>
            </>
          )}
          {state.status === "timeout" && (
            <>
              <div className="w-20 h-20 rounded-3xl mx-auto bg-gradient-to-br from-orange-500 to-red-500 grid place-items-center">
                <XCircle className="w-11 h-11 text-white" />
              </div>
              <h1 className="mt-6 text-3xl font-display font-black">Payment still processing</h1>
              <p className="text-muted-foreground mt-2">
                We couldn't confirm your payment in time. It may complete via webhook shortly. Check your subscription page.
              </p>
              <p className="text-xs text-muted-foreground mt-2 font-mono">Order: {orderId}</p>
              <Link to="/dashboard/subscription" className="inline-block mt-6">
                <Button variant="outline" className="pill-btn h-12 px-8 font-bold">Check subscription</Button>
              </Link>
            </>
          )}
        </Card>
      </main>
      <Footer />
    </div>
  );
}

export function PaymentCancel() {
  const [sp] = useSearchParams();
  const orderId = sp.get("order_id");
  return (
    <div className="min-h-screen relative overflow-hidden">
      <Navbar />
      <main className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8 py-14">
        <Card className="glass-card rounded-[2rem] border-0 p-10 text-center animate-pop" data-testid="payment-cancel-card">
          <div className="w-20 h-20 rounded-3xl mx-auto bg-gradient-to-br from-slate-400 to-slate-500 grid place-items-center">
            <XCircle className="w-11 h-11 text-white" />
          </div>
          <h1 className="mt-6 text-3xl font-display font-black" data-testid="payment-cancel-title">Payment cancelled</h1>
          <p className="text-muted-foreground mt-2">No charge was made. You can pick a plan any time.</p>
          {orderId && <p className="text-xs text-muted-foreground mt-2 font-mono">Order: {orderId}</p>}
          <div className="mt-6 flex flex-col sm:flex-row gap-2 justify-center">
            <Link to="/pricing" data-testid="payment-back-to-pricing">
              <Button className="pill-btn h-12 px-8 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-black">
                <ChevronLeft className="w-4 h-4 mr-1" /> Back to pricing
              </Button>
            </Link>
            <Link to="/dashboard">
              <Button variant="outline" className="pill-btn h-12 px-8 font-bold">Go to dashboard</Button>
            </Link>
          </div>
        </Card>
      </main>
      <Footer />
    </div>
  );
}

import { useEffect, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import api from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { CheckCircle2, XCircle, Loader2, Sparkles, ChevronRight } from "lucide-react";
import Confetti from "@/components/Confetti";

export function PaymentSuccess() {
  const [sp] = useSearchParams();
  const sessionId = sp.get("session_id");
  const [state, setState] = useState({ status: "checking", tries: 0 });
  const [confetti, setConfetti] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;
    const poll = async (tries = 0) => {
      if (cancelled) return;
      try {
        const { data } = await api.get(`/payments/status/${sessionId}`);
        if (data.payment_status === "paid") {
          setState({ status: "paid", data, tries });
          setConfetti(true);
        } else if (data.payment_status === "failed" || data.payment_status === "expired") {
          setState({ status: "failed", data, tries });
        } else if (tries < 8) {
          setTimeout(() => poll(tries + 1), 2000);
        } else {
          setState({ status: "timeout", data, tries });
        }
      } catch (e) {
        if (tries < 8) setTimeout(() => poll(tries + 1), 2000);
        else setState({ status: "timeout", tries });
      }
    };
    poll(0);
    return () => { cancelled = true; };
  }, [sessionId]);

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
              <Loader2 className="w-16 h-16 animate-spin mx-auto text-primary" />
              <h1 className="mt-6 text-3xl font-display font-black">Confirming your payment...</h1>
              <p className="text-muted-foreground mt-2">This can take a few seconds.</p>
            </>
          )}
          {state.status === "paid" && (
            <>
              <div className="w-20 h-20 rounded-3xl mx-auto bg-gradient-to-br from-emerald-500 to-teal-500 grid place-items-center animate-float">
                <CheckCircle2 className="w-11 h-11 text-white" />
              </div>
              <h1 className="mt-6 text-3xl font-display font-black" data-testid="payment-success-title">Welcome to Premium!</h1>
              <p className="text-muted-foreground mt-2">Your ${state.data.amount} {state.data.plan_id?.includes("yearly") ? "yearly" : "monthly"} subscription is active.</p>
              <Link to="/dashboard" className="inline-block mt-6" data-testid="payment-success-cta">
                <Button className="pill-btn h-12 px-8 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-black">
                  <Sparkles className="w-4 h-4 mr-2" /> Go to dashboard <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </>
          )}
          {(state.status === "failed" || state.status === "timeout") && (
            <>
              <div className="w-20 h-20 rounded-3xl mx-auto bg-gradient-to-br from-orange-500 to-red-500 grid place-items-center">
                <XCircle className="w-11 h-11 text-white" />
              </div>
              <h1 className="mt-6 text-3xl font-display font-black">Payment {state.status === "timeout" ? "still processing" : "failed"}</h1>
              <p className="text-muted-foreground mt-2">
                {state.status === "timeout" ? "It's taking longer than usual. Check back shortly." : "Please try again from the pricing page."}
              </p>
              <Link to="/pricing" className="inline-block mt-6">
                <Button variant="outline" className="pill-btn h-12 px-8 font-bold">Back to pricing</Button>
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
  return (
    <div className="min-h-screen relative overflow-hidden">
      <Navbar />
      <main className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8 py-14">
        <Card className="glass-card rounded-[2rem] border-0 p-10 text-center animate-pop" data-testid="payment-cancel-card">
          <div className="w-20 h-20 rounded-3xl mx-auto bg-gradient-to-br from-slate-400 to-slate-500 grid place-items-center">
            <XCircle className="w-11 h-11 text-white" />
          </div>
          <h1 className="mt-6 text-3xl font-display font-black">Checkout cancelled</h1>
          <p className="text-muted-foreground mt-2">No charge was made. You can pick a plan any time.</p>
          <Link to="/pricing" className="inline-block mt-6">
            <Button className="pill-btn h-12 px-8 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-black">Back to pricing</Button>
          </Link>
        </Card>
      </main>
      <Footer />
    </div>
  );
}

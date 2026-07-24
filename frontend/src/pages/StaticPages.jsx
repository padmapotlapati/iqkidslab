import { useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import api, { formatApiError } from "@/lib/api";
import { toast } from "sonner";
import { Mail, Users, Sparkles, Target, Send, Heart, Brain, Trophy } from "lucide-react";

export function About() {
  return (
    <div className="min-h-screen relative overflow-hidden">
      <Navbar />
      <div className="floating-blob bg-blue-400/30 w-72 h-72 -top-10 -left-16"></div>
      <div className="floating-blob bg-pink-400/30 w-72 h-72 bottom-0 -right-16"></div>

      <main className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-14 relative">
        <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground">About Kids IQ Test</p>
        <h1 className="text-4xl sm:text-5xl font-display font-black tracking-tight mt-1">Nurturing curious minds, one <span className="brand-gradient-text">brain-skill</span> at a time</h1>
        <p className="text-muted-foreground mt-4 text-lg leading-relaxed">
          Kids IQ Test is a playful, science-inspired platform that helps parents explore how their children think, remember, notice, reason and problem-solve. We combine engaging activities with modern AI to turn every session into an encouraging learning moment.
        </p>

        <div className="grid md:grid-cols-3 gap-4 mt-10">
          {[
            { icon: Brain, title: "Playful, not clinical", body: "Our assessments produce educational insights — never IQ diagnoses." },
            { icon: Trophy, title: "Celebrate effort", body: "Kids earn XP, stars, badges and certificates for showing up." },
            { icon: Heart, title: "Built for parents", body: "Every report is friendly, positive, and actionable." },
          ].map((v, i) => (
            <Card key={i} className="glass-card rounded-3xl border-0 p-6">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-500 grid place-items-center">
                <v.icon className="w-5 h-5 text-white" />
              </div>
              <h3 className="mt-3 font-display font-black text-lg">{v.title}</h3>
              <p className="text-sm text-muted-foreground mt-1">{v.body}</p>
            </Card>
          ))}
        </div>

        <Card className="glass-card rounded-3xl border-0 p-8 mt-10">
          <h2 className="font-display font-black text-2xl">Our mission</h2>
          <p className="text-muted-foreground mt-3 leading-relaxed">
            To make discovering brain skills feel like a game — encouraging, colorful, and never intimidating. Every child deserves a place where trying is celebrated and curiosity is the reward.
          </p>
        </Card>
      </main>
      <Footer />
    </div>
  );
}

export function Contact() {
  const [f, setF] = useState({ name: "", email: "", subject: "", message: "" });
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post("/contact", f);
      toast.success("Message sent — we'll be in touch within 48h.");
      setF({ name: "", email: "", subject: "", message: "" });
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail) || "Could not send"); }
    setLoading(false);
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      <Navbar />
      <div className="floating-blob bg-orange-400/30 w-72 h-72 -top-10 -right-16"></div>
      <div className="floating-blob bg-purple-400/30 w-72 h-72 bottom-0 -left-10"></div>

      <main className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-14 relative">
        <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Get in touch</p>
        <h1 className="text-4xl sm:text-5xl font-display font-black tracking-tight mt-1">We&apos;d love to hear from you</h1>
        <p className="text-muted-foreground mt-3">Have a question, suggestion, or need help? Send us a message.</p>

        <Card className="glass-card rounded-3xl border-0 p-8 mt-8">
          <form onSubmit={submit} className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-3">
              <div><Label className="font-bold">Name</Label><Input value={f.name} onChange={e => setF({...f, name: e.target.value})} required className="h-12 rounded-2xl mt-1" data-testid="contact-name-input" /></div>
              <div><Label className="font-bold">Email</Label><Input type="email" value={f.email} onChange={e => setF({...f, email: e.target.value})} required className="h-12 rounded-2xl mt-1" data-testid="contact-email-input" /></div>
            </div>
            <div><Label className="font-bold">Subject</Label><Input value={f.subject} onChange={e => setF({...f, subject: e.target.value})} required className="h-12 rounded-2xl mt-1" data-testid="contact-subject-input" /></div>
            <div><Label className="font-bold">Message</Label><Textarea value={f.message} onChange={e => setF({...f, message: e.target.value})} required rows={5} className="rounded-2xl mt-1" data-testid="contact-message-input" /></div>
            <Button type="submit" disabled={loading} className="pill-btn h-12 w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white font-black" data-testid="contact-submit-btn">
              <Send className="w-4 h-4 mr-2" /> {loading ? "Sending..." : "Send message"}
            </Button>
          </form>
        </Card>
      </main>
      <Footer />
    </div>
  );
}

export function LegalPage({ title, sections }) {
  return (
    <div className="min-h-screen relative overflow-hidden">
      <Navbar />
      <main className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-14">
        <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Legal</p>
        <h1 className="text-4xl sm:text-5xl font-display font-black tracking-tight mt-1">{title}</h1>
        <p className="text-xs text-muted-foreground mt-2">Last updated: {new Date().toLocaleDateString()}</p>
        <div className="mt-8 space-y-6">
          {sections.map((s, i) => (
            <section key={i} data-testid={`legal-section-${i}`}>
              <h2 className="font-display font-black text-xl">{s.title}</h2>
              <p className="text-sm text-muted-foreground leading-relaxed mt-2 whitespace-pre-wrap">{s.body}</p>
            </section>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}

export function Privacy() {
  return <LegalPage title="Privacy Policy" sections={[
    { title: "1. Information we collect", body: "We collect account information you provide (name, email, password hash) and child profile data you enter. We also collect assessment answers and game scores you generate on the platform. We do not sell or share personal data with third parties beyond what is required to operate the service." },
    { title: "2. Cookies", body: "We use httpOnly authentication cookies to keep you signed in. We store a local visitor ID in your browser to count unique visitors — no personal identifiers." },
    { title: "3. Data retention", body: "We retain your data for the duration of your account. You can delete children profiles and your account at any time via the parent dashboard." },
    { title: "4. Children's data", body: "Only the parent-provided child profile (name, age, grade) and answers/scores are stored. No child logins, no chat, no external sharing." },
    { title: "5. Contact", body: "Questions? Email us via the Contact page." },
  ]} />;
}

export function Terms() {
  return <LegalPage title="Terms & Conditions" sections={[
    { title: "1. Educational purpose only", body: "Kids IQ Test provides educational cognitive skill estimates and learning insights. It is NOT a clinical IQ diagnosis. For medical or developmental concerns, consult a qualified professional." },
    { title: "2. Acceptable use", body: "You agree to use the platform for its intended purpose. Do not misuse, scrape, reverse-engineer, or abuse the service." },
    { title: "3. Subscriptions", body: "Premium subscriptions renew automatically. You can cancel any time via your account. Refunds are considered case-by-case within 14 days." },
    { title: "4. Content ownership", body: "All questions, illustrations, and reports remain the property of Kids IQ Test. Personal reports are yours to download and share." },
    { title: "5. Limitation of liability", body: "The service is provided as-is. We make no guarantees about learning outcomes." },
  ]} />;
}

export function Cookies() {
  return <LegalPage title="Cookie Policy" sections={[
    { title: "Authentication cookies", body: "We use secure httpOnly cookies (access_token, refresh_token) to sign you in. These are strictly necessary and cannot be disabled." },
    { title: "Analytics", body: "We store a random visitor ID in localStorage to count unique visits. No third-party trackers or ads." },
    { title: "Your choices", body: "You can clear cookies in your browser at any time, which will sign you out." },
  ]} />;
}

export function Disclaimer() {
  return <LegalPage title="Disclaimer" sections={[
    { title: "Educational estimate only", body: "The scores, categories, percentiles, and estimated indices produced by Kids IQ Test are educational estimates — designed for reflection and encouragement — and are NOT a clinical or diagnostic IQ measurement. They should not be used for admissions, hiring, medical, legal, or other high-stakes decisions." },
    { title: "AI-generated reports", body: "Reports are generated with AI assistance and are meant to inspire encouraging conversations with your child. They are not a substitute for professional advice from a licensed educator, psychologist, or medical practitioner." },
    { title: "Get expert help", body: "If you have concerns about your child's development, please consult a qualified professional." },
  ]} />;
}

import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Brain, Sparkles, Trophy, Puzzle, LineChart, Award, Bell, Globe,
  BookOpen, Focus, Lightbulb, Palette, Target, Layers, TrendingUp, Calendar,
  Star, Rocket, ChevronRight,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const AGE_GROUPS = [
  { range: "3–5", label: "Little Explorers", color: "from-pink-400 to-orange-400", desc: "Shapes, colors and playful memory challenges.", emoji: "🎈" },
  { range: "6–8", label: "Curious Thinkers", color: "from-blue-400 to-cyan-400", desc: "Patterns, early logic and word play adventures.", emoji: "🚀" },
  { range: "9–12", label: "Brain Builders", color: "from-purple-500 to-fuchsia-500", desc: "Deeper reasoning, math logic and problem quests.", emoji: "🧩" },
  { range: "13–16", label: "Genius Squad", color: "from-emerald-400 to-teal-500", desc: "Abstract thinking, analytical and verbal skills.", emoji: "⚡" },
];

const FEATURES = [
  { icon: Puzzle, title: "Interactive Activities", color: "text-blue-600 bg-blue-100 dark:bg-blue-900/40" },
  { icon: TrendingUp, title: "Adaptive Difficulty", color: "text-purple-600 bg-purple-100 dark:bg-purple-900/40" },
  { icon: Sparkles, title: "Instant AI Reports", color: "text-orange-600 bg-orange-100 dark:bg-orange-900/40" },
  { icon: Brain, title: "Brain Games", color: "text-pink-600 bg-pink-100 dark:bg-pink-900/40" },
  { icon: LineChart, title: "Progress Tracking", color: "text-emerald-600 bg-emerald-100 dark:bg-emerald-900/40" },
  { icon: Award, title: "Certificates", color: "text-yellow-600 bg-yellow-100 dark:bg-yellow-900/40" },
  { icon: Bell, title: "Parent Dashboard", color: "text-cyan-600 bg-cyan-100 dark:bg-cyan-900/40" },
  { icon: Globe, title: "Multi-language", color: "text-rose-600 bg-rose-100 dark:bg-rose-900/40" },
];

const BENEFITS = [
  { icon: BookOpen, title: "Improve Memory" },
  { icon: Lightbulb, title: "Boost Logical Thinking" },
  { icon: Focus, title: "Strengthen Attention" },
  { icon: Palette, title: "Develop Creativity" },
  { icon: Target, title: "Problem Solving" },
  { icon: Layers, title: "Pattern Recognition" },
  { icon: Rocket, title: "Learning Motivation" },
  { icon: Calendar, title: "Daily Practice" },
];

const TESTIMONIALS = [
  { name: "Priya S.", role: "Mom of Aarav (7)", quote: "The reports are incredibly encouraging and gave me ideas to try at home. My son now asks for 'brain time' after dinner!", stars: 5 },
  { name: "Marcus D.", role: "Dad of twins (10)", quote: "Beautifully designed. It feels like a game, not a test. Both my kids are hooked and I love the progress charts.", stars: 5 },
  { name: "Ananya R.", role: "Parent of Diya (4)", quote: "Even at 4, my daughter loves the colorful puzzles. The rewards keep her coming back every day.", stars: 5 },
];

const FAQS = [
  { q: "Is this a real IQ test?", a: "No. Kids IQ Test provides educational cognitive skill estimates and learning insights — not a clinical IQ diagnosis. It's designed to be fun and encouraging." },
  { q: "What age groups are supported?", a: "Ages 3 through 16, split into four playful groups: 3–5, 6–8, 9–12 and 13–16 with age-appropriate activities." },
  { q: "How long does an assessment take?", a: "Most assessments take between 5 and 12 minutes, depending on age group. Kids can pause anytime." },
  { q: "Is my child's data safe?", a: "Yes — all data is private and only visible in your parent dashboard. We never sell or share it." },
  { q: "Do I need to pay?", a: "You can create an account and start a free assessment right away. Premium plans unlock unlimited assessments and detailed reports." },
];

export default function Home() {
  return (
    <div className="relative overflow-hidden">
      <Navbar />

      {/* HERO */}
      <section className="relative pt-14 sm:pt-20 pb-16">
        {/* floating blobs */}
        <div className="floating-blob bg-blue-400/50 dark:bg-blue-500/30 w-80 h-80 -top-10 -left-16"></div>
        <div className="floating-blob bg-pink-400/40 dark:bg-pink-500/25 w-72 h-72 top-20 right-0"></div>
        <div className="floating-blob bg-yellow-300/50 dark:bg-yellow-500/25 w-64 h-64 bottom-0 left-1/3"></div>

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 grid lg:grid-cols-12 gap-10 items-center relative">
          <div className="lg:col-span-7">
            <Badge className="rounded-full px-4 py-1.5 bg-yellow-100 text-yellow-800 hover:bg-yellow-100 border-0 font-bold text-xs" data-testid="hero-badge">
              <Sparkles className="w-3.5 h-3.5 mr-1.5" /> AI-Powered Learning Insights
            </Badge>
            <h1 className="mt-5 text-4xl sm:text-5xl lg:text-6xl font-display font-black leading-[1.05] tracking-tight" data-testid="hero-headline">
              Discover Your Child&apos;s <span className="brand-gradient-text">Brain Skills</span>
            </h1>
            <p className="mt-5 text-base sm:text-lg text-muted-foreground max-w-xl leading-relaxed" data-testid="hero-subtitle">
              Fun, engaging activities designed to explore thinking, memory, attention, reasoning and problem-solving skills — for kids aged 3 to 16.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link to="/register" data-testid="hero-cta-start">
                <Button className="pill-btn h-14 px-8 text-base bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white shadow-xl shadow-purple-500/30">
                  Start Free Assessment <ChevronRight className="w-5 h-5 ml-1" />
                </Button>
              </Link>
              <a href="#how" data-testid="hero-cta-learn">
                <Button variant="outline" className="pill-btn h-14 px-8 text-base border-2 font-bold">
                  Learn More
                </Button>
              </a>
            </div>
            <div className="mt-8 flex items-center gap-6 text-xs text-muted-foreground font-semibold">
              <div className="flex items-center gap-1.5"><Star className="w-4 h-4 fill-yellow-400 text-yellow-400" /> 4.9 avg. rating</div>
              <div className="flex items-center gap-1.5"><Trophy className="w-4 h-4 text-orange-500" /> 50k+ activities completed</div>
            </div>
          </div>

          <div className="lg:col-span-5 relative">
            <div className="relative animate-float">
              <div className="glass-card rounded-[2rem] p-6 lift-shadow">
                <div className="rounded-3xl overflow-hidden">
                  <img
                    src="https://images.pexels.com/photos/8535189/pexels-photo-8535189.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940"
                    alt="Happy child solving puzzles"
                    className="w-full h-72 sm:h-80 object-cover"
                    data-testid="hero-image"
                  />
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Today&apos;s XP</p>
                    <p className="text-2xl font-display font-black">+ 240 <span className="text-base text-emerald-500">pts</span></p>
                  </div>
                  <div className="flex -space-x-2">
                    {["🌟","🧩","🎯"].map((e,i)=>(
                      <div key={i} className="w-11 h-11 rounded-full grid place-items-center bg-gradient-to-br from-yellow-300 to-orange-400 text-lg border-2 border-white shadow">{e}</div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="absolute -top-6 -left-6 w-20 h-20 rounded-2xl bg-gradient-to-br from-pink-400 to-orange-400 grid place-items-center rotate-[-8deg] shadow-xl">
                <Brain className="w-9 h-9 text-white" strokeWidth={2.5} />
              </div>
              <div className="absolute -bottom-5 -right-3 rounded-2xl px-4 py-3 bg-white dark:bg-card shadow-xl flex items-center gap-2 rotate-[6deg]">
                <div className="w-8 h-8 rounded-full bg-emerald-500 grid place-items-center"><Trophy className="w-4 h-4 text-white" /></div>
                <div>
                  <p className="text-[10px] font-bold uppercase text-muted-foreground">New badge</p>
                  <p className="text-sm font-black">Sharp Mind!</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* AGE CARDS */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14" id="age-groups">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
          <div>
            <h2 className="text-3xl sm:text-4xl font-display font-black tracking-tight">Pick your <span className="brand-gradient-text">age adventure</span></h2>
            <p className="mt-2 text-muted-foreground max-w-xl">Every age group has activities tuned to how kids at that stage learn and play best.</p>
          </div>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {AGE_GROUPS.map((a, i) => (
            <Card key={a.range} data-testid={`age-card-${a.range}`}
              className="group relative overflow-hidden rounded-3xl p-6 border-0 lift-shadow bg-card hover:-translate-y-1.5 transition-transform duration-300">
              <div className={`absolute inset-0 opacity-90 bg-gradient-to-br ${a.color}`}></div>
              <div className="relative z-10 text-white">
                <div className="text-4xl mb-3">{a.emoji}</div>
                <p className="text-xs font-black uppercase tracking-wider opacity-90">Age {a.range}</p>
                <h3 className="text-2xl font-display font-black mt-1">{a.label}</h3>
                <p className="text-sm mt-2 leading-relaxed opacity-95">{a.desc}</p>
                <Link to="/register">
                  <Button variant="secondary" size="sm" className="mt-5 pill-btn bg-white text-slate-900 hover:bg-white/90 font-bold" data-testid={`age-start-${a.range}`}>
                    Start <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </Link>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14">
        <h2 className="text-3xl sm:text-4xl font-display font-black tracking-tight">How it works</h2>
        <p className="mt-2 text-muted-foreground max-w-xl">Get set up in under two minutes.</p>
        <div className="grid md:grid-cols-5 gap-4 mt-10">
          {[
            { n: 1, t: "Create Parent Account", c: "bg-blue-500" },
            { n: 2, t: "Create Child Profile", c: "bg-purple-500" },
            { n: 3, t: "Choose Age Group", c: "bg-orange-500" },
            { n: 4, t: "Complete Assessment", c: "bg-pink-500" },
            { n: 5, t: "Get Personalized Report", c: "bg-emerald-500" },
          ].map((s) => (
            <div key={s.n} data-testid={`step-${s.n}`} className="glass-card rounded-3xl p-5">
              <div className={`w-11 h-11 rounded-2xl ${s.c} text-white grid place-items-center font-display font-black text-lg shadow-lg`}>
                {s.n}
              </div>
              <h4 className="mt-4 font-display font-black">{s.t}</h4>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14">
        <h2 className="text-3xl sm:text-4xl font-display font-black tracking-tight">Everything kids <span className="brand-gradient-text">love</span></h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-10">
          {FEATURES.map((f, i) => (
            <div key={f.title} data-testid={`feature-${i}`} className="glass-card rounded-3xl p-6 hover:-translate-y-1 transition-transform">
              <div className={`w-12 h-12 rounded-2xl grid place-items-center ${f.color}`}>
                <f.icon className="w-6 h-6" strokeWidth={2.2} />
              </div>
              <h4 className="mt-4 font-display font-black text-lg">{f.title}</h4>
            </div>
          ))}
        </div>
      </section>

      {/* BENEFITS */}
      <section id="benefits" className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14">
        <div className="glass-card rounded-[2.5rem] p-8 sm:p-12 relative overflow-hidden">
          <div className="floating-blob bg-purple-400/40 w-64 h-64 -bottom-16 -right-10"></div>
          <div className="relative z-10">
            <h2 className="text-3xl sm:text-4xl font-display font-black tracking-tight max-w-2xl">Brain skills that <span className="brand-gradient-text">grow with your child</span></h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-10">
              {BENEFITS.map((b, i) => (
                <div key={b.title} data-testid={`benefit-${i}`} className="rounded-3xl p-5 bg-card border border-border/60 hover:-translate-y-1 transition-transform">
                  <div className="w-11 h-11 rounded-2xl grid place-items-center bg-gradient-to-br from-yellow-300 to-orange-400 shadow-md">
                    <b.icon className="w-5 h-5 text-white" strokeWidth={2.5} />
                  </div>
                  <p className="mt-3 font-display font-bold">{b.title}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14">
        <h2 className="text-3xl sm:text-4xl font-display font-black tracking-tight">Loved by <span className="brand-gradient-text">parents</span></h2>
        <div className="grid md:grid-cols-3 gap-5 mt-10">
          {TESTIMONIALS.map((t, i) => (
            <Card key={i} data-testid={`testimonial-${i}`} className="rounded-3xl p-6 border-0 lift-shadow bg-card">
              <div className="flex items-center gap-1 mb-3">
                {Array.from({ length: t.stars }).map((_, s) => (
                  <Star key={s} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              <p className="text-sm leading-relaxed">&ldquo;{t.quote}&rdquo;</p>
              <div className="mt-5 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-500 to-purple-500 text-white grid place-items-center font-black">{t.name[0]}</div>
                <div>
                  <p className="font-display font-black text-sm">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.role}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-14">
        <h2 className="text-3xl sm:text-4xl font-display font-black tracking-tight text-center">Frequently asked <span className="brand-gradient-text">questions</span></h2>
        <Accordion type="single" collapsible className="mt-10">
          {FAQS.map((f, i) => (
            <AccordionItem key={i} value={`item-${i}`} className="glass-card rounded-2xl px-5 mb-3 border-0" data-testid={`faq-item-${i}`}>
              <AccordionTrigger className="font-display font-bold text-left hover:no-underline">{f.q}</AccordionTrigger>
              <AccordionContent className="text-muted-foreground leading-relaxed">{f.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-8">
        <div className="rounded-[2.5rem] p-10 sm:p-14 bg-gradient-to-br from-blue-600 via-purple-600 to-pink-500 text-white relative overflow-hidden lift-shadow">
          <div className="floating-blob bg-white/20 w-72 h-72 -top-20 -right-10"></div>
          <div className="relative z-10 max-w-2xl">
            <h3 className="text-3xl sm:text-4xl font-display font-black tracking-tight">Ready to spark curiosity?</h3>
            <p className="mt-3 text-white/90">Create a free parent account and start your child&apos;s first assessment in minutes.</p>
            <Link to="/register" className="inline-block mt-6" data-testid="cta-bottom-start">
              <Button size="lg" className="pill-btn h-14 px-8 bg-white text-slate-900 hover:bg-white/90 font-black">
                Get started free <ChevronRight className="w-5 h-5 ml-1" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

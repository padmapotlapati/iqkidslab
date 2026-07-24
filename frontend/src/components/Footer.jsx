import { Brain, Heart, Github, Twitter, Instagram } from "lucide-react";
import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="mt-24 border-t border-border/50" data-testid="site-footer">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid md:grid-cols-4 gap-10">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-2xl grid place-items-center bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500">
                <Brain className="w-5 h-5 text-white" strokeWidth={2.5} />
              </div>
              <span className="font-display font-black text-xl">Kids IQ Test</span>
            </div>
            <p className="text-sm text-muted-foreground max-w-md leading-relaxed">
              Fun, engaging brain-skills activities designed to explore thinking, memory,
              attention, reasoning and problem-solving skills in children aged 3 to 16.
              Educational insights — not a clinical diagnosis.
            </p>
            <div className="flex items-center gap-3 mt-6">
              <a href="#" data-testid="social-twitter" className="w-10 h-10 rounded-full grid place-items-center bg-muted hover:bg-primary hover:text-primary-foreground transition-colors"><Twitter className="w-4 h-4" /></a>
              <a href="#" data-testid="social-instagram" className="w-10 h-10 rounded-full grid place-items-center bg-muted hover:bg-primary hover:text-primary-foreground transition-colors"><Instagram className="w-4 h-4" /></a>
              <a href="#" data-testid="social-github" className="w-10 h-10 rounded-full grid place-items-center bg-muted hover:bg-primary hover:text-primary-foreground transition-colors"><Github className="w-4 h-4" /></a>
            </div>
          </div>
          <div>
            <h4 className="font-display font-bold mb-3">Product</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="#features" className="hover:text-foreground">Features</a></li>
              <li><a href="#benefits" className="hover:text-foreground">Benefits</a></li>
              <li><Link to="/pricing" className="hover:text-foreground">Pricing</Link></li>
              <li><Link to="/blog" className="hover:text-foreground">Blog</Link></li>
              <li><Link to="/dashboard" className="hover:text-foreground">Dashboard</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-display font-bold mb-3">Company</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/about" className="hover:text-foreground">About</Link></li>
              <li><Link to="/contact" className="hover:text-foreground">Contact</Link></li>
              <li><Link to="/privacy" className="hover:text-foreground">Privacy</Link></li>
              <li><Link to="/terms" className="hover:text-foreground">Terms</Link></li>
              <li><Link to="/cookies" className="hover:text-foreground">Cookies</Link></li>
              <li><Link to="/disclaimer" className="hover:text-foreground">Disclaimer</Link></li>
            </ul>
          </div>
        </div>
        <div className="mt-10 pt-6 border-t border-border/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
          <p>© {new Date().getFullYear()} Kids IQ Test. All rights reserved.</p>
          <p className="flex items-center gap-1">Made with <Heart className="w-3.5 h-3.5 text-pink-500 fill-pink-500" /> for curious minds.</p>
        </div>
      </div>
    </footer>
  );
}

import { Link, useNavigate, NavLink } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { Button } from "@/components/ui/button";
import { Sun, Moon, Brain, LogOut, LayoutDashboard, Menu, X } from "lucide-react";
import { useState } from "react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

const navLinks = [
  { to: "/", label: "Home" },
  { to: "/#features", label: "Features" },
  { to: "/#how", label: "How it Works" },
  { to: "/#faq", label: "FAQ" },
];

export default function Navbar() {
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full" data-testid="site-navbar">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mt-3">
        <div className="glass-card rounded-3xl px-4 sm:px-6 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2" data-testid="brand-logo">
            <div className="w-10 h-10 rounded-2xl grid place-items-center bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 shadow-lg">
              <Brain className="w-5 h-5 text-white" strokeWidth={2.5} />
            </div>
            <div className="flex flex-col leading-tight">
              <span className="font-display font-black text-lg sm:text-xl">Kids IQ Test</span>
              <span className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">Brain Skills for Kids</span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((l) => (
              <a key={l.to} href={l.to} data-testid={`nav-${l.label.toLowerCase().replace(/\s/g, "-")}`}
                className="px-4 py-2 rounded-full text-sm font-semibold hover:bg-muted transition-colors">
                {l.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={toggle} data-testid="theme-toggle-btn" className="rounded-full">
              {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </Button>
            {user && user !== false ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="rounded-full px-3 gap-2" data-testid="user-menu-trigger">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 grid place-items-center text-white text-xs font-black">
                      {user.name?.[0]?.toUpperCase() || "U"}
                    </div>
                    <span className="hidden sm:inline font-semibold text-sm">{user.name?.split(" ")[0]}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52 rounded-2xl">
                  <DropdownMenuItem onClick={() => navigate("/dashboard")} data-testid="menu-dashboard">
                    <LayoutDashboard className="w-4 h-4 mr-2" /> Dashboard
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={async () => { await logout(); navigate("/"); }} data-testid="menu-logout">
                    <LogOut className="w-4 h-4 mr-2" /> Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <>
                <Button variant="ghost" onClick={() => navigate("/login")} className="rounded-full font-bold hidden sm:inline-flex" data-testid="nav-login-btn">
                  Log in
                </Button>
                <Button onClick={() => navigate("/register")} data-testid="nav-signup-btn"
                  className="pill-btn bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-bold px-5">
                  Start Free
                </Button>
              </>
            )}
            <Button variant="ghost" size="icon" className="md:hidden rounded-full" onClick={() => setOpen(!open)} data-testid="mobile-menu-toggle">
              {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>
        </div>
        {open && (
          <div className="md:hidden glass-card rounded-3xl mt-2 p-4 flex flex-col gap-1">
            {navLinks.map((l) => (
              <a key={l.to} href={l.to} onClick={() => setOpen(false)} className="px-4 py-3 rounded-2xl font-semibold hover:bg-muted">
                {l.label}
              </a>
            ))}
          </div>
        )}
      </div>
    </header>
  );
}

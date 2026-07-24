import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { Button } from "@/components/ui/button";
import { Sun, Moon, Brain, LogOut, LayoutDashboard, Menu, X, Bell, Award, TrendingUp, Gamepad2 } from "lucide-react";
import { useState, useEffect } from "react";
import api from "@/lib/api";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";

const publicLinks = [
  { to: "/", label: "Home" },
  { to: "/pricing", label: "Pricing" },
  { to: "/blog", label: "Blog" },
  { to: "/about", label: "About" },
  { to: "/contact", label: "Contact" },
];

const authLinks = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/dashboard/games", label: "Brain Games", icon: Gamepad2 },
  { to: "/dashboard/progress", label: "Progress", icon: TrendingUp },
  { to: "/dashboard/certificates", label: "Certificates", icon: Award },
];

export default function Navbar() {
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [notifs, setNotifs] = useState([]);
  const [unread, setUnread] = useState(0);

  const isAuthArea = location.pathname.startsWith("/dashboard");

  useEffect(() => {
    if (!user || user === false) return;
    (async () => {
      try {
        const { data } = await api.get("/notifications");
        setNotifs(data);
        setUnread(data.filter(n => !n.read).length);
      } catch {}
    })();
  }, [user, location.pathname]);

  const markAllRead = async () => {
    await api.post("/notifications/read-all");
    setUnread(0);
    setNotifs(notifs.map(n => ({ ...n, read: true })));
  };

  const links = isAuthArea && user ? authLinks : publicLinks;

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
            {links.map((l) => {
              const Icon = l.icon;
              return isAuthArea && user ? (
                <Link key={l.to} to={l.to} data-testid={`nav-${l.label.toLowerCase().replace(/\s/g, "-")}`}
                  className={`px-3.5 py-2 rounded-full text-sm font-semibold flex items-center gap-1.5 transition-colors
                    ${location.pathname === l.to ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}>
                  {Icon && <Icon className="w-4 h-4" />} {l.label}
                </Link>
              ) : (
                <Link key={l.to} to={l.to} data-testid={`nav-${l.label.toLowerCase().replace(/\s/g, "-")}`}
                  className="px-4 py-2 rounded-full text-sm font-semibold hover:bg-muted transition-colors">
                  {l.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            {user && user !== false && isAuthArea && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full relative" data-testid="notif-trigger">
                    <Bell className="w-5 h-5" />
                    {unread > 0 && (
                      <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] font-black grid place-items-center" data-testid="notif-badge">{unread}</span>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-80 rounded-2xl max-h-[400px] overflow-y-auto">
                  <DropdownMenuLabel className="flex items-center justify-between">
                    <span>Notifications</span>
                    {unread > 0 && <button onClick={markAllRead} className="text-xs font-bold text-primary" data-testid="notif-mark-read">Mark all read</button>}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {notifs.length === 0 ? (
                    <div className="px-3 py-6 text-center text-sm text-muted-foreground">No notifications yet</div>
                  ) : (
                    notifs.slice(0, 10).map(n => (
                      <DropdownMenuItem key={n.id} onClick={() => n.link && navigate(n.link)}
                        className={`flex flex-col items-start gap-0.5 py-3 ${!n.read ? "bg-muted/50" : ""}`}
                        data-testid={`notif-item-${n.id}`}>
                        <div className="flex items-center gap-2 w-full">
                          {!n.read && <span className="w-2 h-2 rounded-full bg-blue-500" />}
                          <span className="font-bold text-sm">{n.title}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">{n.body}</span>
                      </DropdownMenuItem>
                    ))
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

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
                  <DropdownMenuItem onClick={() => navigate("/dashboard/games")}>
                    <Gamepad2 className="w-4 h-4 mr-2" /> Brain Games
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/dashboard/progress")}>
                    <TrendingUp className="w-4 h-4 mr-2" /> Progress
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/dashboard/certificates")}>
                    <Award className="w-4 h-4 mr-2" /> Certificates
                  </DropdownMenuItem>
                  {user.role === "admin" && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => navigate("/admin")} data-testid="menu-admin">
                        <LayoutDashboard className="w-4 h-4 mr-2" /> Admin Panel
                      </DropdownMenuItem>
                    </>
                  )}
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
            {links.map((l) => {
              const Icon = l.icon;
              return isAuthArea && user ? (
                <Link key={l.to} to={l.to} onClick={() => setOpen(false)} className="px-4 py-3 rounded-2xl font-semibold hover:bg-muted flex items-center gap-2">
                  {Icon && <Icon className="w-4 h-4" />} {l.label}
                </Link>
              ) : (
                <Link key={l.to} to={l.to} onClick={() => setOpen(false)} className="px-4 py-3 rounded-2xl font-semibold hover:bg-muted">{l.label}</Link>
              );
            })}
          </div>
        )}
      </div>
    </header>
  );
}

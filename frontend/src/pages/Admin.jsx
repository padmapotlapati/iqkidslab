import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import api, { API } from "@/lib/api";
import Navbar from "@/components/Navbar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, BookOpen, Award, DollarSign, Eye, Activity, FileText, Tag as TagIcon, Download, Search, Ban, CheckCheck, Trash2, Plus } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";
import { toast } from "sonner";
import { formatApiError } from "@/lib/api";

export default function Admin() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (!loading && (!user || user.role !== "admin")) navigate("/dashboard");
  }, [user, loading, navigate]);

  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [userSearch, setUserSearch] = useState("");
  const [posts, setPosts] = useState([]);
  const [coupons, setCoupons] = useState([]);
  const [audit, setAudit] = useState([]);
  const [contactMsgs, setContactMsgs] = useState([]);
  const [revenue, setRevenue] = useState(null);

  useEffect(() => {
    if (!user || user.role !== "admin") return;
    (async () => {
      try {
          const [s, u, p, c, a, m] = await Promise.all([
            api.get("/admin/stats"),
            api.get("/admin/users"),
            api.get("/blog"),
            api.get("/admin/coupons"),
            api.get("/admin/audit-logs?limit=25"),
            api.get("/admin/contact-messages"),
          ]);
          setStats(s.data); setUsers(u.data); setPosts(p.data);
          setCoupons(c.data); setAudit(a.data); setContactMsgs(m.data);
          const rev = await api.get("/admin/revenue"); setRevenue(rev.data);
      } catch { toast.error("Failed to load admin data"); }
    })();
  }, [user]);

  const searchUsers = async () => {
    const { data } = await api.get(`/admin/users${userSearch ? `?search=${encodeURIComponent(userSearch)}` : ""}`);
    setUsers(data);
  };

  const toggleBlock = async (u) => {
    await api.post(`/admin/users/${u.id}/${u.blocked ? "unblock" : "block"}`);
    setUsers(users.map(x => x.id === u.id ? { ...x, blocked: !x.blocked } : x));
    toast.success(`User ${u.blocked ? "unblocked" : "blocked"}`);
  };
  const delUser = async (u) => {
    if (!window.confirm(`Delete ${u.email} and all their data?`)) return;
    await api.delete(`/admin/users/${u.id}`);
    setUsers(users.filter(x => x.id !== u.id));
    toast.success("User deleted");
  };

  if (loading || !user || user.role !== "admin") return <div className="min-h-screen"><Navbar /><div className="text-center mt-40 text-muted-foreground">Loading...</div></div>;

  return (
    <div className="min-h-screen relative overflow-hidden">
      <Navbar />
      <div className="floating-blob bg-blue-400/25 w-80 h-80 -top-10 -left-16"></div>
      <div className="floating-blob bg-orange-400/25 w-72 h-72 bottom-0 -right-16"></div>

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 relative">
        <div className="flex items-center gap-2">
          <Badge className="rounded-full bg-slate-900 text-white hover:bg-slate-900 font-black">ADMIN</Badge>
          <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Super dashboard</p>
        </div>
        <h1 className="text-3xl sm:text-5xl font-display font-black tracking-tight mt-1" data-testid="admin-heading">Command center</h1>

        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-8">
            <Stat icon={Users} label="Parents" value={stats.total_parents} color="from-blue-500 to-cyan-500" testid="stat-parents" />
            <Stat icon={BookOpen} label="Children" value={stats.total_children} color="from-purple-500 to-pink-500" testid="stat-children-count" />
            <Stat icon={FileText} label="Assessments" value={stats.total_assessments} color="from-emerald-500 to-teal-500" testid="stat-assessments-count" />
            <Stat icon={Award} label="Certificates" value={stats.total_certificates} color="from-yellow-400 to-orange-400" testid="stat-certs" />
            <Stat icon={Eye} label="Total visits" value={stats.total_pageviews} color="from-pink-500 to-rose-500" testid="stat-views" />
            <Stat icon={Eye} label="Unique visitors" value={stats.unique_visitors} color="from-fuchsia-500 to-purple-500" testid="stat-uniques" />
            <Stat icon={Activity} label="Active 7d" value={stats.active_users_7d} color="from-orange-500 to-red-500" testid="stat-active" />
            <Stat icon={DollarSign} label="Revenue" value={`$${stats.revenue_total.toFixed(2)}`} color="from-emerald-600 to-lime-500" testid="stat-revenue" />
          </div>
        )}

        {stats && (
          <div className="grid lg:grid-cols-2 gap-5 mt-6">
            <Card className="glass-card rounded-3xl border-0 p-6" data-testid="chart-signups">
              <h3 className="font-display font-black text-lg">Signups (14 days)</h3>
              <div className="h-56 mt-3">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={stats.signup_trend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={d => d.slice(5)} />
                    <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                    <Tooltip contentStyle={{ borderRadius: 12 }} />
                    <Line type="monotone" dataKey="count" stroke="hsl(217 91% 60%)" strokeWidth={3} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>
            <Card className="glass-card rounded-3xl border-0 p-6" data-testid="chart-traffic">
              <h3 className="font-display font-black text-lg">Page views (14 days)</h3>
              <div className="h-56 mt-3">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.traffic_trend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={d => d.slice(5)} />
                    <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                    <Tooltip contentStyle={{ borderRadius: 12 }} />
                    <Bar dataKey="count" fill="hsl(262 83% 66%)" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>
        )}

        <Tabs defaultValue="revenue" className="mt-8">
          <TabsList className="rounded-full h-12 p-1 bg-muted grid grid-cols-2 md:grid-cols-7 gap-1" data-testid="admin-tabs">
            <TabsTrigger value="revenue" className="rounded-full font-bold" data-testid="tab-revenue">Revenue</TabsTrigger>
            <TabsTrigger value="users" className="rounded-full font-bold" data-testid="tab-users">Users</TabsTrigger>
            <TabsTrigger value="blog" className="rounded-full font-bold" data-testid="tab-blog">Blog</TabsTrigger>
            <TabsTrigger value="coupons" className="rounded-full font-bold" data-testid="tab-coupons">Coupons</TabsTrigger>
            <TabsTrigger value="questions" className="rounded-full font-bold" data-testid="tab-questions">Questions</TabsTrigger>
            <TabsTrigger value="messages" className="rounded-full font-bold" data-testid="tab-messages">Messages</TabsTrigger>
            <TabsTrigger value="audit" className="rounded-full font-bold" data-testid="tab-audit">Audit</TabsTrigger>
          </TabsList>

          {/* REVENUE */}
          <TabsContent value="revenue" className="mt-5">
            {!revenue ? <p className="text-sm text-muted-foreground">Loading...</p> : (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <Stat icon={DollarSign} label="Today" value={`₹${revenue.revenue_today.toLocaleString("en-IN")}`} color="from-emerald-500 to-teal-500" testid="rev-today" />
                  <Stat icon={DollarSign} label="This month" value={`₹${revenue.revenue_month.toLocaleString("en-IN")}`} color="from-blue-500 to-cyan-500" testid="rev-month" />
                  <Stat icon={DollarSign} label="This year" value={`₹${revenue.revenue_year.toLocaleString("en-IN")}`} color="from-purple-500 to-pink-500" testid="rev-year" />
                  <Stat icon={Activity} label="Success rate" value={`${revenue.payment_success_rate}%`} color="from-orange-500 to-red-500" testid="rev-success" />
                </div>
                <div className="grid md:grid-cols-2 gap-5 mt-5">
                  <Card className="glass-card rounded-3xl border-0 p-6" data-testid="rev-plan-mix">
                    <h3 className="font-display font-black text-lg">Plan mix</h3>
                    <div className="mt-3 space-y-2 text-sm">
                      {Object.entries(revenue.plan_counts || {}).length === 0 ? <p className="text-muted-foreground">No purchases yet.</p> :
                        Object.entries(revenue.plan_counts).map(([k, v]) => (
                          <div key={k} className="flex justify-between border-b border-border/40 py-1">
                            <span className="font-bold">{k.replace(/_/g, " ")}</span>
                            <Badge variant="secondary" className="rounded-full font-bold">{v} sold</Badge>
                          </div>
                        ))}
                    </div>
                    <div className="mt-4 text-xs text-muted-foreground">
                      <span className="font-bold">Most purchased:</span> {revenue.most_purchased_plan?.replace(/_/g, " ") || "—"}
                      <span className="ml-4 font-bold">Free → Paid:</span> {revenue.conversion_rate}%
                      <span className="ml-4 font-bold">Paid users:</span> {revenue.paid_users}/{revenue.total_parents}
                    </div>
                  </Card>
                  <Card className="glass-card rounded-3xl border-0 p-6" data-testid="rev-recent">
                    <h3 className="font-display font-black text-lg">Recent transactions</h3>
                    <div className="mt-3 max-h-72 overflow-y-auto text-sm space-y-2">
                      {revenue.recent_transactions.length === 0 && <p className="text-muted-foreground">No transactions yet.</p>}
                      {revenue.recent_transactions.map(t => (
                        <div key={t.id} className="flex justify-between border-b border-border/40 py-1" data-testid={`rev-tx-${t.id}`}>
                          <div>
                            <p className="font-bold">₹{t.amount} · {t.plan_name || t.plan_id}</p>
                            <p className="text-xs text-muted-foreground">{new Date(t.created_at).toLocaleString()}</p>
                          </div>
                          <Badge className={`rounded-full font-bold ${t.payment_status === "paid" ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-0" : "bg-muted text-muted-foreground"}`}>{t.payment_status}</Badge>
                        </div>
                      ))}
                    </div>
                  </Card>
                </div>
              </>
            )}
          </TabsContent>

          {/* USERS */}
          <TabsContent value="users" className="mt-5">
            <Card className="glass-card rounded-3xl border-0 p-5">
              <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center justify-between">
                <div className="flex gap-2 flex-1 max-w-md">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input value={userSearch} onChange={e => setUserSearch(e.target.value)} onKeyDown={e => e.key === "Enter" && searchUsers()}
                      placeholder="Search users..." className="pl-9 h-10 rounded-full" data-testid="user-search-input" />
                  </div>
                  <Button onClick={searchUsers} className="pill-btn h-10 font-bold" data-testid="user-search-btn">Search</Button>
                </div>
                <a href={`${API}/admin/users/export.csv`} target="_blank" rel="noreferrer">
                  <Button variant="outline" className="pill-btn h-10 font-bold" data-testid="export-users-csv"><Download className="w-4 h-4 mr-2" /> Export CSV</Button>
                </a>
              </div>
              <div className="mt-5 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-xs uppercase font-bold text-muted-foreground">
                    <tr>
                      <th className="pb-2">Email</th><th className="pb-2">Role</th><th className="pb-2">Children</th><th className="pb-2">Tests</th><th className="pb-2">Status</th><th className="pb-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(u => (
                      <tr key={u.id} className="border-t border-border/40" data-testid={`user-row-${u.id}`}>
                        <td className="py-3">
                          <div className="font-bold">{u.name}</div>
                          <div className="text-xs text-muted-foreground">{u.email}</div>
                        </td>
                        <td><Badge variant="secondary" className="rounded-full font-bold">{u.role}</Badge></td>
                        <td>{u.children_count}</td>
                        <td>{u.assessments_count}</td>
                        <td>{u.blocked ? <Badge className="rounded-full bg-red-100 text-red-800 hover:bg-red-100 border-0 font-bold">Blocked</Badge> : <Badge className="rounded-full bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-0 font-bold">Active</Badge>}</td>
                        <td className="flex gap-2 py-3">
                          <Button size="icon" variant="ghost" onClick={() => toggleBlock(u)} data-testid={`toggle-block-${u.id}`} className="rounded-full">
                            {u.blocked ? <CheckCheck className="w-4 h-4 text-emerald-500" /> : <Ban className="w-4 h-4 text-orange-500" />}
                          </Button>
                          {u.role !== "admin" && (
                            <Button size="icon" variant="ghost" onClick={() => delUser(u)} data-testid={`delete-user-${u.id}`} className="rounded-full text-red-500">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </TabsContent>

          {/* BLOG */}
          <TabsContent value="blog" className="mt-5">
            <BlogAdmin posts={posts} setPosts={setPosts} />
          </TabsContent>

          {/* COUPONS */}
          <TabsContent value="coupons" className="mt-5">
            <CouponsAdmin coupons={coupons} setCoupons={setCoupons} />
          </TabsContent>

          {/* QUESTIONS */}
          <TabsContent value="questions" className="mt-5">
            <QuestionsAdmin />
          </TabsContent>

          {/* MESSAGES */}
          <TabsContent value="messages" className="mt-5">
            <Card className="glass-card rounded-3xl border-0 p-5">
              <h3 className="font-display font-black text-lg">Contact form messages</h3>
              {contactMsgs.length === 0 ? <p className="text-sm text-muted-foreground mt-2">No messages yet.</p> :
              <div className="mt-4 space-y-3">
                {contactMsgs.map((m, i) => (
                  <div key={i} className="rounded-2xl border p-4" data-testid={`contact-msg-${i}`}>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span className="font-bold">{m.name} · {m.email}</span>
                      <span>{new Date(m.created_at).toLocaleString()}</span>
                    </div>
                    <p className="font-bold mt-1">{m.subject}</p>
                    <p className="text-sm text-muted-foreground mt-1">{m.message}</p>
                  </div>
                ))}
              </div>}
            </Card>
          </TabsContent>

          {/* AUDIT */}
          <TabsContent value="audit" className="mt-5">
            <Card className="glass-card rounded-3xl border-0 p-5">
              <h3 className="font-display font-black text-lg">Audit logs</h3>
              <div className="mt-4 space-y-2 max-h-[600px] overflow-y-auto">
                {audit.map(a => (
                  <div key={a.id} className="flex items-center justify-between text-sm py-2 border-b border-border/40" data-testid={`audit-row-${a.id}`}>
                    <div>
                      <span className="font-bold">{a.action}</span>
                      <span className="text-muted-foreground ml-2">{a.user_id?.slice(-6)}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">{new Date(a.created_at).toLocaleString()}</span>
                  </div>
                ))}
                {audit.length === 0 && <p className="text-sm text-muted-foreground">No logs yet.</p>}
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function Stat({ icon: Icon, label, value, color, testid }) {
  return (
    <Card className="glass-card rounded-3xl border-0 p-4 flex items-center gap-3" data-testid={testid}>
      <div className={`w-11 h-11 rounded-2xl grid place-items-center bg-gradient-to-br ${color}`}>
        <Icon className="w-5 h-5 text-white" strokeWidth={2.5} />
      </div>
      <div>
        <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">{label}</p>
        <p className="font-display font-black text-xl">{value}</p>
      </div>
    </Card>
  );
}

function BlogAdmin({ posts, setPosts }) {
  const [f, setF] = useState({ title: "", slug: "", excerpt: "", content: "", tags: "", cover_image: "", category: "brain-science" });
  const create = async (e) => {
    e.preventDefault();
    try {
      const { data } = await api.post("/admin/blog", {
        ...f, tags: f.tags.split(",").map(t => t.trim()).filter(Boolean), status: "published",
      });
      setPosts([data, ...posts]);
      setF({ title: "", slug: "", excerpt: "", content: "", tags: "", cover_image: "", category: "brain-science" });
      toast.success("Post published");
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail) || "Could not save"); }
  };
  const del = async (slug) => {
    if (!window.confirm("Delete this post?")) return;
    await api.delete(`/admin/blog/${slug}`);
    setPosts(posts.filter(p => p.slug !== slug));
    toast.success("Deleted");
  };
  const slugify = (s) => s.toLowerCase().replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "-");
  return (
    <div className="grid lg:grid-cols-2 gap-5">
      <Card className="glass-card rounded-3xl border-0 p-6">
        <h3 className="font-display font-black text-lg">New blog post</h3>
        <form onSubmit={create} className="mt-3 space-y-3">
          <Input value={f.title} onChange={e => setF({ ...f, title: e.target.value, slug: slugify(e.target.value) })} required placeholder="Title" data-testid="blog-title-input" className="h-11 rounded-2xl" />
          <Input value={f.slug} onChange={e => setF({ ...f, slug: e.target.value })} required placeholder="slug-url" data-testid="blog-slug-input" className="h-11 rounded-2xl font-mono text-sm" />
          <Input value={f.cover_image} onChange={e => setF({ ...f, cover_image: e.target.value })} placeholder="Cover image URL (optional)" className="h-11 rounded-2xl" />
          <Input value={f.tags} onChange={e => setF({ ...f, tags: e.target.value })} placeholder="tags, comma, separated" className="h-11 rounded-2xl" data-testid="blog-tags-input" />
          <Textarea value={f.excerpt} onChange={e => setF({ ...f, excerpt: e.target.value })} required placeholder="Excerpt (1-2 sentences)" data-testid="blog-excerpt-input" className="rounded-2xl" rows={2} />
          <Textarea value={f.content} onChange={e => setF({ ...f, content: e.target.value })} required placeholder="Full content (markdown supported)" data-testid="blog-content-input" className="rounded-2xl" rows={8} />
          <Button type="submit" className="pill-btn bg-gradient-to-r from-blue-500 to-purple-600 text-white font-black" data-testid="blog-save-btn">
            <Plus className="w-4 h-4 mr-2" /> Publish
          </Button>
        </form>
      </Card>
      <Card className="glass-card rounded-3xl border-0 p-6">
        <h3 className="font-display font-black text-lg">All posts ({posts.length})</h3>
        <div className="mt-3 space-y-2 max-h-[500px] overflow-y-auto">
          {posts.length === 0 && <p className="text-sm text-muted-foreground">No posts yet.</p>}
          {posts.map(p => (
            <div key={p.slug} className="flex justify-between items-center border rounded-2xl p-3" data-testid={`admin-blog-row-${p.slug}`}>
              <div>
                <p className="font-bold text-sm">{p.title}</p>
                <p className="text-xs text-muted-foreground">/{p.slug} · {p.views || 0} views</p>
              </div>
              <Button size="icon" variant="ghost" onClick={() => del(p.slug)} className="rounded-full text-red-500"><Trash2 className="w-4 h-4" /></Button>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function CouponsAdmin({ coupons, setCoupons }) {
  const [f, setF] = useState({ code: "", discount_percent: 20 });
  const create = async (e) => {
    e.preventDefault();
    try {
      const { data } = await api.post("/admin/coupons", { code: f.code.toUpperCase(), discount_percent: parseInt(f.discount_percent) });
      setCoupons([data, ...coupons]);
      setF({ code: "", discount_percent: 20 });
      toast.success("Coupon created");
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail) || "Failed"); }
  };
  return (
    <div className="grid lg:grid-cols-2 gap-5">
      <Card className="glass-card rounded-3xl border-0 p-6">
        <h3 className="font-display font-black text-lg">Create coupon</h3>
        <form onSubmit={create} className="mt-3 space-y-3">
          <div><Label className="font-bold text-xs uppercase">Code</Label>
            <Input value={f.code} onChange={e => setF({ ...f, code: e.target.value.toUpperCase() })} required placeholder="LAUNCH20" className="h-11 rounded-2xl uppercase font-bold tracking-widest mt-1" data-testid="coupon-code-input" /></div>
          <div><Label className="font-bold text-xs uppercase">Discount %</Label>
            <Input type="number" min="1" max="100" value={f.discount_percent} onChange={e => setF({ ...f, discount_percent: e.target.value })} className="h-11 rounded-2xl mt-1" data-testid="coupon-discount-input" /></div>
          <Button type="submit" className="pill-btn bg-gradient-to-r from-blue-500 to-purple-600 text-white font-black" data-testid="create-coupon-btn"><Plus className="w-4 h-4 mr-2" /> Create</Button>
        </form>
      </Card>
      <Card className="glass-card rounded-3xl border-0 p-6">
        <h3 className="font-display font-black text-lg">All coupons</h3>
        <div className="mt-3 space-y-2">
          {coupons.length === 0 && <p className="text-sm text-muted-foreground">No coupons yet.</p>}
          {coupons.map(c => (
            <div key={c.id} className="flex justify-between items-center border rounded-2xl p-3" data-testid={`admin-coupon-row-${c.code}`}>
              <div>
                <p className="font-bold text-sm font-mono tracking-widest">{c.code}</p>
                <p className="text-xs text-muted-foreground">{c.discount_percent}% off · {c.redemptions || 0} redemptions</p>
              </div>
              <Badge className="rounded-full bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-0 font-bold">{c.active ? "Active" : "Off"}</Badge>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function QuestionsAdmin() {
  const [items, setItems] = useState([]);
  const [f, setF] = useState({ age_group: "9-12", category: "logical_reasoning", question_type: "multiple_choice", difficulty: 3, prompt: "", options: "", answer: 0, explanation: "", points: 10 });
  const load = async () => { const { data } = await api.get("/admin/questions/all"); setItems(data.items); };
  useEffect(() => { load(); }, []);
  const create = async (e) => {
    e.preventDefault();
    try {
      await api.post("/admin/questions", { ...f, options: f.options.split("|").map(s => s.trim()), difficulty: parseInt(f.difficulty), answer: parseInt(f.answer), points: parseInt(f.points) });
      setF({ ...f, prompt: "", options: "" });
      load();
      toast.success("Question added");
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail) || "Failed"); }
  };
  const del = async (id) => {
    if (!window.confirm("Delete this question?")) return;
    try { await api.delete(`/admin/questions/${id}`); load(); toast.success("Deleted"); }
    catch (e) { toast.error(formatApiError(e.response?.data?.detail) || "Only custom questions can be deleted"); }
  };

  return (
    <div className="grid lg:grid-cols-2 gap-5">
      <Card className="glass-card rounded-3xl border-0 p-6">
        <div className="flex justify-between items-center">
          <h3 className="font-display font-black text-lg">Add custom question</h3>
          <a href={`${API}/admin/questions/export.csv`} target="_blank" rel="noreferrer">
            <Button variant="outline" size="sm" className="pill-btn font-bold" data-testid="export-questions-csv"><Download className="w-4 h-4 mr-1.5" /> CSV</Button>
          </a>
        </div>
        <form onSubmit={create} className="mt-3 space-y-2 text-sm">
          <div className="grid grid-cols-2 gap-2">
            <Select value={f.age_group} onValueChange={v => setF({...f, age_group: v})}>
              <SelectTrigger data-testid="q-age-select" className="rounded-2xl h-10"><SelectValue /></SelectTrigger>
              <SelectContent>
                {["3-5","6-8","9-12","13-16"].map(a => <SelectItem key={a} value={a}>Age {a}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={f.category} onValueChange={v => setF({...f, category: v})}>
              <SelectTrigger data-testid="q-cat-select" className="rounded-2xl h-10"><SelectValue /></SelectTrigger>
              <SelectContent>
                {["logical_reasoning","visual_intelligence","pattern_recognition","memory","attention","processing_speed","mathematical_thinking","language_skills","creativity","problem_solving"].map(c =>
                  <SelectItem key={c} value={c}>{c.replace(/_/g," ")}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Textarea value={f.prompt} onChange={e => setF({...f, prompt: e.target.value})} required placeholder="Question prompt" data-testid="q-prompt-input" className="rounded-2xl" rows={2} />
          <Input value={f.options} onChange={e => setF({...f, options: e.target.value})} required placeholder="Option 1 | Option 2 | Option 3 | Option 4" data-testid="q-options-input" className="h-10 rounded-2xl" />
          <div className="grid grid-cols-3 gap-2">
            <Input type="number" min="0" max="3" value={f.answer} onChange={e => setF({...f, answer: e.target.value})} placeholder="Correct idx (0-3)" className="h-10 rounded-2xl" data-testid="q-answer-input" />
            <Input type="number" min="1" max="5" value={f.difficulty} onChange={e => setF({...f, difficulty: e.target.value})} placeholder="Difficulty 1-5" className="h-10 rounded-2xl" data-testid="q-diff-input" />
            <Input type="number" min="5" max="50" value={f.points} onChange={e => setF({...f, points: e.target.value})} placeholder="Points" className="h-10 rounded-2xl" />
          </div>
          <Button type="submit" className="pill-btn bg-gradient-to-r from-blue-500 to-purple-600 text-white font-black" data-testid="add-question-btn"><Plus className="w-4 h-4 mr-2" /> Add</Button>
        </form>
      </Card>
      <Card className="glass-card rounded-3xl border-0 p-6">
        <h3 className="font-display font-black text-lg">Question bank ({items.length})</h3>
        <div className="mt-3 max-h-[500px] overflow-y-auto space-y-2">
          {items.slice(0, 100).map(q => (
            <div key={q.id} className="border rounded-2xl p-3" data-testid={`admin-q-row-${q.id}`}>
              <div className="flex justify-between gap-2">
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground font-bold">{q.age_group} · {q.category} · Difficulty {q.difficulty}</p>
                  <p className="text-sm font-bold">{q.prompt}</p>
                </div>
                {q.id?.startsWith("custom-") && (
                  <Button size="icon" variant="ghost" onClick={() => del(q.id)} className="rounded-full text-red-500"><Trash2 className="w-4 h-4" /></Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

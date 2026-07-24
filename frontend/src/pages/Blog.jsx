import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "@/lib/api";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, Calendar, Eye, ChevronLeft } from "lucide-react";

export function BlogList() {
  const [posts, setPosts] = useState([]);
  const [q, setQ] = useState("");
  useEffect(() => { load(""); }, []);
  const load = async (s) => { const { data } = await api.get(`/blog${s ? `?search=${encodeURIComponent(s)}` : ""}`); setPosts(data); };
  return (
    <div className="min-h-screen relative overflow-hidden">
      <Navbar />
      <div className="floating-blob bg-pink-400/30 w-72 h-72 -top-10 -right-16"></div>
      <div className="floating-blob bg-blue-400/30 w-72 h-72 bottom-0 -left-10"></div>

      <main className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-14 relative">
        <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Kids IQ Test Blog</p>
        <h1 className="text-3xl sm:text-5xl font-display font-black tracking-tight mt-1" data-testid="blog-heading">Insights for curious parents</h1>
        <p className="text-muted-foreground mt-2 max-w-2xl">Practical tips, brain science, and playful activities to nurture your child&apos;s thinking skills.</p>

        <div className="mt-8 max-w-md">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => e.key === "Enter" && load(q)} placeholder="Search posts..." className="pl-10 h-11 rounded-full" data-testid="blog-search-input" />
          </div>
        </div>

        {posts.length === 0 ? (
          <Card className="glass-card rounded-3xl border-0 p-10 mt-8 text-center">
            <h3 className="font-display font-black text-xl">No posts yet</h3>
            <p className="text-muted-foreground text-sm mt-1">New brain-skills insights are on the way. Check back soon!</p>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5 mt-8">
            {posts.map(p => (
              <Link key={p.slug} to={`/blog/${p.slug}`} data-testid={`blog-card-${p.slug}`}>
                <Card className="glass-card rounded-3xl border-0 overflow-hidden hover:-translate-y-1 transition-transform h-full flex flex-col">
                  {p.cover_image && <img src={p.cover_image} alt={p.title} className="w-full h-40 object-cover" />}
                  <div className="p-5 flex-1 flex flex-col">
                    <div className="flex gap-2 flex-wrap">
                      {(p.tags || []).slice(0, 3).map(t => <Badge key={t} variant="secondary" className="rounded-full font-bold text-[10px]">{t}</Badge>)}
                    </div>
                    <h3 className="mt-2 font-display font-black text-lg">{p.title}</h3>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-3 flex-1">{p.excerpt}</p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-3 pt-3 border-t border-border/40">
                      <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date(p.created_at).toLocaleDateString()}</span>
                      <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {p.views || 0}</span>
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}

export function BlogPost() {
  const { slug } = useParams();
  const [post, setPost] = useState(null);
  useEffect(() => { (async () => { try { const { data } = await api.get(`/blog/${slug}`); setPost(data); } catch {} })(); }, [slug]);

  if (!post) return <div className="min-h-screen"><Navbar /><div className="text-center mt-40 text-muted-foreground">Loading...</div></div>;

  return (
    <div className="min-h-screen relative overflow-hidden">
      <Navbar />
      <main className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-10">
        <Link to="/blog" className="text-sm font-bold text-muted-foreground hover:text-foreground flex items-center gap-1" data-testid="blog-back-btn">
          <ChevronLeft className="w-4 h-4" /> All posts
        </Link>
        {post.cover_image && <img src={post.cover_image} alt="" className="w-full h-72 object-cover rounded-3xl mt-4" />}
        <div className="flex gap-2 flex-wrap mt-6">
          {(post.tags || []).map(t => <Badge key={t} variant="secondary" className="rounded-full font-bold text-xs">{t}</Badge>)}
        </div>
        <h1 className="text-3xl sm:text-5xl font-display font-black tracking-tight mt-3" data-testid="post-title">{post.title}</h1>
        <div className="text-xs text-muted-foreground mt-2 flex gap-4">
          <span>By {post.author_name}</span>
          <span>{new Date(post.created_at).toLocaleDateString()}</span>
          <span>{post.views || 0} views</span>
        </div>
        <article className="prose prose-lg dark:prose-invert max-w-none mt-8" data-testid="post-content">
          {post.content.split("\n").map((line, i) => {
            if (line.startsWith("## ")) return <h2 key={i} className="font-display font-black text-2xl mt-6">{line.slice(3)}</h2>;
            if (line.startsWith("# ")) return <h1 key={i} className="font-display font-black text-3xl mt-8">{line.slice(2)}</h1>;
            if (line.startsWith("- ")) return <li key={i} className="ml-6 list-disc">{line.slice(2)}</li>;
            if (line.trim() === "") return <br key={i} />;
            return <p key={i} className="leading-relaxed text-muted-foreground mt-3">{line}</p>;
          })}
        </article>
      </main>
      <Footer />
    </div>
  );
}

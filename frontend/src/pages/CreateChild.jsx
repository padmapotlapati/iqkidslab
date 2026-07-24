import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { formatApiError } from "@/lib/api";
import { Sparkles } from "lucide-react";

export default function CreateChild() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", nickname: "", age: "", gender: "", grade: "", language: "English", interests: "" });
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.age) { toast.error("Name and age are required."); return; }
    setLoading(true);
    try {
      const payload = {
        name: form.name.trim(),
        nickname: form.nickname.trim(),
        age: parseInt(form.age, 10),
        gender: form.gender,
        grade: form.grade,
        language: form.language,
        interests: form.interests ? form.interests.split(",").map(s => s.trim()).filter(Boolean) : [],
      };
      const { data } = await api.post("/children", payload);
      toast.success(`${data.name} added! Let's start the first assessment.`);
      navigate(`/dashboard/child/${data.id}/assessment`);
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || "Could not save.");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen relative">
      <Navbar />
      <div className="floating-blob bg-pink-400/30 w-72 h-72 -top-10 -right-16"></div>
      <main className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8 py-10 relative">
        <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground">New profile</p>
        <h1 className="text-3xl sm:text-4xl font-display font-black tracking-tight mt-1">Tell us about your child</h1>
        <p className="text-muted-foreground mt-1">We&apos;ll pick age-appropriate activities based on this.</p>

        <Card className="glass-card rounded-3xl border-0 p-6 sm:p-8 mt-8">
          <form onSubmit={submit} className="space-y-4">
            <Field label="Child's name *">
              <Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} required placeholder="e.g. Aarav" className="h-12 rounded-2xl" data-testid="child-name-input" />
            </Field>
            <Field label="Nickname">
              <Input value={form.nickname} onChange={e => setForm({...form, nickname: e.target.value})} placeholder="Optional" className="h-12 rounded-2xl" data-testid="child-nickname-input" />
            </Field>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Age *">
                <Input type="number" min="3" max="16" value={form.age} onChange={e => setForm({...form, age: e.target.value})} required placeholder="3 – 16" className="h-12 rounded-2xl" data-testid="child-age-input" />
              </Field>
              <Field label="Gender">
                <Select value={form.gender} onValueChange={v => setForm({...form, gender: v})}>
                  <SelectTrigger className="h-12 rounded-2xl" data-testid="child-gender-select"><SelectValue placeholder="Prefer not to say" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Grade">
                <Input value={form.grade} onChange={e => setForm({...form, grade: e.target.value})} placeholder="e.g. Grade 3" className="h-12 rounded-2xl" data-testid="child-grade-input" />
              </Field>
              <Field label="Preferred language">
                <Select value={form.language} onValueChange={v => setForm({...form, language: v})}>
                  <SelectTrigger className="h-12 rounded-2xl" data-testid="child-language-select"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="English">English</SelectItem>
                    <SelectItem value="Hindi">Hindi</SelectItem>
                    <SelectItem value="Telugu">Telugu</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <Field label="Interests (comma-separated)">
              <Input value={form.interests} onChange={e => setForm({...form, interests: e.target.value})} placeholder="e.g. dinosaurs, drawing, football" className="h-12 rounded-2xl" data-testid="child-interests-input" />
            </Field>

            <Button type="submit" disabled={loading} className="pill-btn w-full h-12 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-black" data-testid="child-save-btn">
              {loading ? "Saving..." : (<><Sparkles className="w-4 h-4 mr-2" /> Save and start</>)}
            </Button>
          </form>
        </Card>
      </main>
      <Footer />
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div className="space-y-2">
      <Label className="font-bold">{label}</Label>
      {children}
    </div>
  );
}

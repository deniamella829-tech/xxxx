import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, Eye, Film, Users, TrendingUp, Loader2, BarChart3, DollarSign, ThumbsUp,
} from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
  BarChart, Bar,
} from "recharts";

type VRow = { id: string; title: string; views: number; created_at: string; duration_seconds: number | null; monetized: boolean; video_url: string };
type Profile = { id: string; username: string; total_videos: number; total_views: number; total_followers: number; monetization_enabled: boolean };
type Wallet = { balance_pending: number; balance_available: number; balance_paid: number };

const fmt = (n: number) => n >= 1_000_000 ? (n/1_000_000).toFixed(1)+"M" : n >= 1000 ? (n/1000).toFixed(1)+"K" : String(n);

export default function Stats() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [videos, setVideos] = useState<VRow[]>([]);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { document.title = "Estadísticas — X Pornazo"; }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate("/auth"); return; }
    (async () => {
      setLoading(true);
      const [p, v, w] = await Promise.all([
        supabase.from("profiles").select("id,username,total_videos,total_views,total_followers,monetization_enabled").eq("id", user.id).maybeSingle(),
        supabase.from("videos").select("id,title,views,created_at,duration_seconds,monetized,video_url").eq("user_id", user.id).order("created_at", { ascending: false }),
        supabase.from("creator_wallets").select("balance_pending,balance_available,balance_paid").eq("user_id", user.id).maybeSingle(),
      ]);
      setProfile(p.data as Profile | null);
      setVideos((v.data ?? []) as VRow[]);
      setWallet((w.data as Wallet | null) ?? { balance_pending: 0, balance_available: 0, balance_paid: 0 });
      setLoading(false);
    })();
  }, [user, authLoading, navigate]);

  // Build a 30-day timeline grouped by upload date (a real per-day view stream
  // would need video_views aggregation; we use upload-day cumulative views as a proxy)
  const timeline = useMemo(() => {
    const days: { date: string; uploads: number; views: number }[] = [];
    const now = new Date(); now.setHours(0, 0, 0, 0);
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now); d.setDate(d.getDate() - i);
      days.push({ date: d.toISOString().slice(5, 10), uploads: 0, views: 0 });
    }
    for (const v of videos) {
      const d = new Date(v.created_at); d.setHours(0, 0, 0, 0);
      const diff = Math.floor((now.getTime() - d.getTime()) / 86400000);
      if (diff >= 0 && diff < 30) {
        const idx = 29 - diff;
        days[idx].uploads += 1;
        days[idx].views += v.views;
      }
    }
    return days;
  }, [videos]);

  const topVideos = useMemo(() => [...videos].sort((a, b) => b.views - a.views).slice(0, 5), [videos]);
  const avgViews = videos.length ? Math.round(videos.reduce((s, v) => s + v.views, 0) / videos.length) : 0;

  if (loading || !profile) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  const stats = [
    { label: "Vistas totales", value: fmt(profile.total_views), icon: Eye, color: "text-primary" },
    { label: "Videos", value: profile.total_videos, icon: Film, color: "text-foreground" },
    { label: "Seguidores", value: fmt(profile.total_followers), icon: Users, color: "text-foreground" },
    { label: "Promedio / video", value: fmt(avgViews), icon: TrendingUp, color: "text-primary" },
  ];

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 bg-header border-b border-border">
        <div className="container mx-auto px-4 h-14 flex items-center gap-3">
          <Link to="/" className="flex items-center gap-2 text-sm hover:text-primary">
            <ArrowLeft className="h-4 w-4" /> Inicio
          </Link>
          <h1 className="ml-2 text-lg font-bold flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" /> Estadísticas
          </h1>
          <div className="ml-auto">
            <Link to={`/u/${profile.username}`} className="text-sm text-muted-foreground hover:text-primary">@{profile.username}</Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6 max-w-6xl">
        {/* Summary cards */}
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          {stats.map((s) => (
            <Card key={s.label} className="p-4">
              <div className="flex items-center justify-between text-xs text-muted-foreground uppercase font-semibold tracking-wide">
                {s.label} <s.icon className={`h-4 w-4 ${s.color}`} />
              </div>
              <div className={`text-2xl font-bold mt-2 ${s.color}`}>{s.value}</div>
            </Card>
          ))}
        </div>

        {/* Wallet */}
        {wallet && (
          <Card className="p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-lg flex items-center gap-2"><DollarSign className="h-5 w-5 text-primary" /> Ingresos</h2>
              <Link to="/monetization" className="text-sm text-primary hover:underline">Ver monetización →</Link>
            </div>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-xs text-muted-foreground uppercase font-semibold">Pendiente</div>
                <div className="text-xl font-bold mt-1">${wallet.balance_pending.toFixed(2)}</div>
              </div>
              <div>
                <div className="text-xs text-primary uppercase font-semibold">Disponible</div>
                <div className="text-xl font-bold mt-1 text-primary">${wallet.balance_available.toFixed(2)}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground uppercase font-semibold">Pagado</div>
                <div className="text-xl font-bold mt-1">${wallet.balance_paid.toFixed(2)}</div>
              </div>
            </div>
          </Card>
        )}

        {/* Views timeline */}
        <Card className="p-5">
          <h2 className="font-bold text-lg mb-4">Vistas (últimos 30 días)</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timeline}>
                <defs>
                  <linearGradient id="vgrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.6} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 6, fontSize: 12 }} />
                <Area type="monotone" dataKey="views" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#vgrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Uploads bars */}
        <Card className="p-5">
          <h2 className="font-bold text-lg mb-4">Subidas por día</h2>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={timeline}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} allowDecimals={false} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 6, fontSize: 12 }} />
                <Bar dataKey="uploads" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Top videos */}
        <Card className="p-5">
          <h2 className="font-bold text-lg mb-4 flex items-center gap-2"><ThumbsUp className="h-5 w-5 text-primary" /> Top videos</h2>
          {topVideos.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Aún no has subido videos.</p>
          ) : (
            <div className="space-y-2">
              {topVideos.map((v, i) => (
                <Link to={`/v/${v.id}`} key={v.id} className="flex items-center gap-3 p-2 rounded hover:bg-secondary transition-colors">
                  <div className="w-6 text-center text-sm font-bold text-primary">{i + 1}</div>
                  <div className="w-20 aspect-video bg-black rounded overflow-hidden shrink-0">
                    <video src={v.video_url} muted preload="metadata" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold truncate">{v.title}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-2">
                      <span className="flex items-center gap-1"><Eye className="h-3 w-3" /> {fmt(v.views)}</span>
                      <span>· {new Date(v.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  {v.monetized && <Badge variant="secondary" className="text-[10px]">$$</Badge>}
                </Link>
              ))}
            </div>
          )}
        </Card>
      </main>
    </div>
  );
}

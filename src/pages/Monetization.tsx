import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  ArrowLeft, BadgeCheck, BadgeAlert, DollarSign, Eye, Film, Loader2, ShieldOff,
  TrendingUp, Users, Wallet,
} from "lucide-react";

type Settings = {
  rate_per_view: number; min_payout: number; verification_days: number;
  min_videos: number; min_views: number; min_followers: number;
};
type Profile = {
  id: string; username: string;
  total_videos: number; total_views: number; total_followers: number;
  monetization_enabled: boolean; monetization_blocked: boolean;
};
type Wallet = { balance_pending: number; balance_available: number; balance_paid: number };

const fmtMoney = (n: number) => `$${Number(n).toFixed(2)}`;

export default function Monetization() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [payouts, setPayouts] = useState<Array<{ id: string; amount: number; status: string; created_at: string; payment_method: string }>>([]);
  const [loading, setLoading] = useState(true);

  // payout form
  const [showPayout, setShowPayout] = useState(false);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("PayPal");
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { document.title = "Monetización — X Pornazo"; }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate("/auth"); return; }
    (async () => {
      setLoading(true);
      const [s, p, w, pr] = await Promise.all([
        supabase.from("monetization_settings").select("*").eq("id", 1).maybeSingle(),
        supabase.from("profiles").select("id,username,total_videos,total_views,total_followers,monetization_enabled,monetization_blocked").eq("id", user.id).maybeSingle(),
        supabase.from("creator_wallets").select("balance_pending,balance_available,balance_paid").eq("user_id", user.id).maybeSingle(),
        supabase.from("payout_requests").select("id,amount,status,created_at,payment_method").eq("user_id", user.id).order("created_at", { ascending: false }).limit(20),
      ]);
      setSettings(s.data as Settings | null);
      // Override visual: cuentas demo verificadas para previsualizar el área
      const DEMO_VERIFIED = ["jose1"];
      const prof = p.data as Profile | null;
      if (prof && DEMO_VERIFIED.includes(prof.username)) {
        prof.monetization_enabled = true;
        prof.monetization_blocked = false;
      }
      setProfile(prof);
      setWallet((w.data as Wallet | null) ?? { balance_pending: 0, balance_available: 0, balance_paid: 0 });
      setPayouts((pr.data ?? []) as typeof payouts);
      setLoading(false);
    })();
  }, [user, authLoading, navigate]);

  const submitPayout = async () => {
    if (!settings || !wallet) return;
    const a = parseFloat(amount);
    if (!a || a < settings.min_payout) { toast.error(`Mínimo: $${settings.min_payout}`); return; }
    if (a > wallet.balance_available) { toast.error("Saldo insuficiente"); return; }
    if (!details.trim()) { toast.error("Ingresa los detalles de pago"); return; }
    setSubmitting(true);
    const { error } = await supabase.rpc("request_payout", { _amount: a, _method: method, _details: details.trim() });
    setSubmitting(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Solicitud enviada");
    setShowPayout(false); setAmount(""); setDetails("");
    // refresh
    const [w, pr] = await Promise.all([
      supabase.from("creator_wallets").select("balance_pending,balance_available,balance_paid").eq("user_id", user!.id).maybeSingle(),
      supabase.from("payout_requests").select("id,amount,status,created_at,payment_method").eq("user_id", user!.id).order("created_at", { ascending: false }).limit(20),
    ]);
    setWallet((w.data as Wallet | null) ?? wallet);
    setPayouts((pr.data ?? []) as typeof payouts);
  };

  if (loading || !settings || !profile || !wallet) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  const reqs = [
    { label: "Videos publicados", current: profile.total_videos, target: settings.min_videos, icon: Film },
    { label: "Vistas totales", current: profile.total_views, target: settings.min_views, icon: Eye },
    { label: "Seguidores", current: profile.total_followers, target: settings.min_followers, icon: Users },
  ];
  const allMet = reqs.every((r) => r.current >= r.target);
  const blocked = profile.monetization_blocked;

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 bg-header border-b border-border">
        <div className="container mx-auto px-4 h-14 flex items-center gap-3">
          <Link to="/" className="flex items-center gap-2 text-sm hover:text-primary"><ArrowLeft className="h-4 w-4" /> Inicio</Link>
          <h1 className="ml-2 text-lg font-bold">Monetización</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6 max-w-5xl">
        {/* Status banner */}
        <Card className={`p-5 border-l-4 ${blocked ? "border-l-destructive" : profile.monetization_enabled ? "border-l-primary" : "border-l-muted-foreground"}`}>
          <div className="flex items-center gap-3">
            {blocked ? <ShieldOff className="h-6 w-6 text-destructive" />
              : profile.monetization_enabled ? <BadgeCheck className="h-6 w-6 text-primary" />
              : <BadgeAlert className="h-6 w-6 text-muted-foreground" />}
            <div className="flex-1">
              <div className="font-bold">
                {blocked ? "Monetización bloqueada por administración"
                  : profile.monetization_enabled ? "Monetización activa"
                  : "Monetización inactiva"}
              </div>
              <div className="text-sm text-muted-foreground">
                Mínimo de retiro: <span className="font-semibold text-foreground">{fmtMoney(settings.min_payout)}</span>
                {" · "}Verificación: <span className="font-semibold text-foreground">{settings.verification_days} días</span>
              </div>
            </div>
            <Badge variant={profile.monetization_enabled && !blocked ? "default" : "secondary"}>
              {blocked ? "Bloqueado" : profile.monetization_enabled ? "Activo" : "Inactivo"}
            </Badge>
          </div>
        </Card>

        {/* Wallet cards */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
          <Card className="p-5">
            <div className="flex items-center justify-between text-muted-foreground text-xs uppercase tracking-wide font-semibold">
              Pendiente <Wallet className="h-4 w-4" />
            </div>
            <div className="text-3xl font-bold mt-2">{fmtMoney(wallet.balance_pending)}</div>
            <div className="text-xs text-muted-foreground mt-1">Vistas en periodo de verificación</div>
          </Card>
          <Card className="p-5 border-primary/40">
            <div className="flex items-center justify-between text-primary text-xs uppercase tracking-wide font-semibold">
              Disponible <DollarSign className="h-4 w-4" />
            </div>
            <div className="text-3xl font-bold mt-2 text-primary">{fmtMoney(wallet.balance_available)}</div>
            <Button
              className="mt-3 w-full"
              disabled={wallet.balance_available < settings.min_payout}
              onClick={() => { setAmount(String(wallet.balance_available.toFixed(2))); setShowPayout(true); }}
            >
              Solicitar retiro
            </Button>
          </Card>
          <Card className="p-5">
            <div className="flex items-center justify-between text-muted-foreground text-xs uppercase tracking-wide font-semibold">
              Pagado <TrendingUp className="h-4 w-4" />
            </div>
            <div className="text-3xl font-bold mt-2">{fmtMoney(wallet.balance_paid)}</div>
            <div className="text-xs text-muted-foreground mt-1">Histórico total</div>
          </Card>
        </div>

        {/* Requirements */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-lg">Requisitos para monetizar</h2>
            {allMet && !blocked && <Badge className="gap-1"><BadgeCheck className="h-3 w-3" /> Cumplidos</Badge>}
          </div>
          {!allMet && (
            <p className="text-sm text-muted-foreground mb-4">
              Necesitas: {settings.min_videos} videos, {settings.min_views.toLocaleString()} vistas y {settings.min_followers} seguidores para activar la monetización.
            </p>
          )}
          <div className="space-y-4">
            {reqs.map((r) => {
              const pct = Math.min(100, (r.current / r.target) * 100);
              const ok = r.current >= r.target;
              return (
                <div key={r.label}>
                  <div className="flex items-center justify-between text-sm mb-1.5">
                    <span className="flex items-center gap-2 font-medium">
                      <r.icon className={`h-4 w-4 ${ok ? "text-primary" : "text-muted-foreground"}`} />
                      {r.label}
                    </span>
                    <span className={`tabular-nums ${ok ? "text-primary font-semibold" : "text-muted-foreground"}`}>
                      {r.current.toLocaleString()} / {r.target.toLocaleString()}
                    </span>
                  </div>
                  <Progress value={pct} className="h-2" />
                </div>
              );
            })}
          </div>
        </Card>

        {/* Payouts history */}
        <Card className="p-5">
          <h2 className="font-bold text-lg mb-3">Historial de retiros</h2>
          {payouts.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Aún no has solicitado retiros.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs text-muted-foreground uppercase tracking-wide">
                  <tr className="border-b border-border">
                    <th className="text-left py-2">Fecha</th>
                    <th className="text-left py-2">Método</th>
                    <th className="text-right py-2">Monto</th>
                    <th className="text-right py-2">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {payouts.map((p) => (
                    <tr key={p.id} className="border-b border-border/50">
                      <td className="py-2">{new Date(p.created_at).toLocaleDateString()}</td>
                      <td className="py-2">{p.payment_method}</td>
                      <td className="py-2 text-right tabular-nums">{fmtMoney(p.amount)}</td>
                      <td className="py-2 text-right">
                        <Badge variant={p.status === "paid" ? "default" : p.status === "rejected" ? "destructive" : "secondary"}>
                          {p.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </main>

      {showPayout && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setShowPayout(false)}>
          <Card className="w-full max-w-md p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold text-lg">Solicitar retiro</h3>
            <div>
              <label className="text-xs text-muted-foreground">Monto (USD)</label>
              <Input type="number" min={settings.min_payout} max={wallet.balance_available} step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
              <p className="text-xs text-muted-foreground mt-1">Mín {fmtMoney(settings.min_payout)} · Disp {fmtMoney(wallet.balance_available)}</p>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Método</label>
              <select value={method} onChange={(e) => setMethod(e.target.value)} className="w-full h-10 px-3 rounded-md bg-background border border-input text-sm">
                <option>PayPal</option><option>Transferencia bancaria</option><option>Crypto (USDT)</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Detalles de pago (email, IBAN, wallet…)</label>
              <Input value={details} onChange={(e) => setDetails(e.target.value)} placeholder="ejemplo@correo.com" />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={() => setShowPayout(false)}>Cancelar</Button>
              <Button onClick={submitPayout} disabled={submitting}>{submitting && <Loader2 className="h-4 w-4 animate-spin" />} Enviar</Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

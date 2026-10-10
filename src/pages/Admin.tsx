import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useIsAdmin } from "@/hooks/use-is-admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ArrowLeft, BadgeCheck, CheckCircle2, DollarSign, Loader2, RefreshCw, Search, ShieldCheck, ShieldOff, X } from "lucide-react";

type ProfileRow = {
  id: string; username: string;
  created_at: string;
  total_videos: number; total_views: number; total_followers: number;
  monetization_enabled: boolean; monetization_blocked: boolean;
  is_verified: boolean;
  // Derived (joined client-side)
  earnings_total?: number;
  balance_pending?: number;
  balance_available?: number;
  balance_paid?: number;
};
type PayoutRow = {
  id: string; user_id: string; amount: number; payment_method: string;
  payment_details: string; status: string; admin_notes: string | null; created_at: string;
};
type Settings = {
  rate_per_view: number; min_payout: number; verification_days: number;
  min_videos: number; min_views: number; min_followers: number;
};
type EarningRow = {
  id: string; user_id: string; video_id: string | null; verified_views: number;
  rate_per_view: number; amount: number; status: string; created_at: string;
  username?: string | null;
};

export default function Admin() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { isAdmin, checked } = useIsAdmin();
  const [tab, setTab] = useState<"users" | "ledger" | "payouts" | "fraud" | "settings">("users");

  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [payouts, setPayouts] = useState<Array<PayoutRow & { username: string | null }>>([]);
  const [fraud, setFraud] = useState<Array<{ id: string; video_id: string; ip_hash: string; rejection_reason: string | null; created_at: string; status: string }>>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [ledger, setLedger] = useState<EarningRow[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => { document.title = "Admin — X Pornazo"; }, []);

  const loadAll = async () => {
    const [p, pr, fr, st, wl, ce] = await Promise.all([
      supabase.from("profiles").select("id,username,created_at,total_videos,total_views,total_followers,monetization_enabled,monetization_blocked,is_verified").order("total_views", { ascending: false }).limit(500),
      supabase.from("payout_requests").select("*").order("created_at", { ascending: false }).limit(100),
      supabase.from("video_views").select("id,video_id,ip_hash,rejection_reason,created_at,status").or("status.eq.rejected").order("created_at", { ascending: false }).limit(100),
      supabase.from("monetization_settings").select("*").eq("id", 1).maybeSingle(),
      supabase.from("creator_wallets").select("user_id,balance_pending,balance_available,balance_paid"),
      supabase.from("creator_earnings").select("id,user_id,video_id,verified_views,rate_per_view,amount,status,created_at").order("created_at", { ascending: false }).limit(500),
    ]);

    // Aggregate earnings totals per user
    const earningsByUser = new Map<string, number>();
    (ce.data ?? []).forEach((e: EarningRow) => {
      earningsByUser.set(e.user_id, (earningsByUser.get(e.user_id) ?? 0) + Number(e.amount));
    });
    const walletByUser = new Map<string, { p: number; a: number; pa: number }>();
    (wl.data ?? []).forEach((w: { user_id: string; balance_pending: number; balance_available: number; balance_paid: number }) => {
      walletByUser.set(w.user_id, { p: Number(w.balance_pending), a: Number(w.balance_available), pa: Number(w.balance_paid) });
    });
    const merged = (p.data ?? []).map((row) => {
      const w = walletByUser.get(row.id);
      return {
        ...row,
        earnings_total: earningsByUser.get(row.id) ?? 0,
        balance_pending: w?.p ?? 0,
        balance_available: w?.a ?? 0,
        balance_paid: w?.pa ?? 0,
      } as ProfileRow;
    });
    setProfiles(merged);

    // Ledger usernames
    const ledgerUserIds = Array.from(new Set((ce.data ?? []).map((x: EarningRow) => x.user_id)));
    const ledgerNameMap = new Map<string, string>();
    if (ledgerUserIds.length) {
      const { data: profs2 } = await supabase.from("profiles").select("id,username").in("id", ledgerUserIds);
      (profs2 ?? []).forEach((x) => ledgerNameMap.set(x.id, x.username));
    }
    setLedger((ce.data ?? []).map((x: EarningRow) => ({ ...x, username: ledgerNameMap.get(x.user_id) ?? null })));

    const userIds = Array.from(new Set((pr.data ?? []).map((x: PayoutRow) => x.user_id)));
    const map = new Map<string, string>();
    if (userIds.length) {
      const { data: profs } = await supabase.from("profiles").select("id,username").in("id", userIds);
      (profs ?? []).forEach((x) => map.set(x.id, x.username));
    }
    setPayouts((pr.data ?? []).map((x: PayoutRow) => ({ ...x, username: map.get(x.user_id) ?? null })));
    setFraud((fr.data ?? []) as typeof fraud);
    setSettings(st.data as Settings | null);
  };

  useEffect(() => {
    if (loading || !checked) return;
    if (!user) { navigate("/auth"); return; }
    if (!isAdmin) return;
    loadAll();
  }, [user, isAdmin, checked, loading, navigate]);

  if (loading || !checked) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }
  if (!isAdmin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 text-center px-4">
        <ShieldOff className="h-12 w-12 text-muted-foreground" />
        <h1 className="text-xl font-bold">Acceso restringido</h1>
        <p className="text-sm text-muted-foreground">Necesitas ser administrador para ver este panel.</p>
        <Link to="/"><Button>Volver</Button></Link>
      </div>
    );
  }

  const toggleMon = async (p: ProfileRow, enabled: boolean, blocked: boolean) => {
    const { error } = await supabase.rpc("admin_set_monetization", { _user_id: p.id, _enabled: enabled, _blocked: blocked });
    if (error) { toast.error(error.message); return; }
    toast.success("Actualizado");
    loadAll();
  };

  const toggleVerified = async (p: ProfileRow) => {
    const { error } = await supabase.rpc("admin_set_verified", { _user_id: p.id, _verified: !p.is_verified });
    if (error) { toast.error(error.message); return; }
    toast.success(p.is_verified ? "Verificación retirada" : "Cuenta verificada");
    loadAll();
  };

  const setPayoutStatus = async (id: string, status: "approved" | "rejected" | "paid", notes = "") => {
    const { error } = await supabase.rpc("admin_set_payout_status", { _payout_id: id, _new_status: status, _notes: notes });
    if (error) { toast.error(error.message); return; }
    toast.success("Pago actualizado");
    loadAll();
  };

  const runVerify = async () => {
    const { data, error } = await supabase.rpc("verify_pending_views");
    if (error) { toast.error(error.message); return; }
    toast.success(`Verificado: ${JSON.stringify(data)}`);
    loadAll();
  };

  const saveSettings = async () => {
    if (!settings) return;
    const { error } = await supabase.from("monetization_settings").update({
      rate_per_view: settings.rate_per_view, min_payout: settings.min_payout,
      verification_days: settings.verification_days, min_videos: settings.min_videos,
      min_views: settings.min_views, min_followers: settings.min_followers, updated_at: new Date().toISOString(),
    }).eq("id", 1);
    if (error) { toast.error(error.message); return; }
    toast.success("Ajustes guardados");
  };

  const filteredProfiles = profiles.filter((p) => p.username.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 bg-header border-b border-border">
        <div className="container mx-auto px-4 h-14 flex items-center gap-3">
          <Link to="/" className="flex items-center gap-2 text-sm hover:text-primary"><ArrowLeft className="h-4 w-4" /> Inicio</Link>
          <h1 className="ml-2 text-lg font-bold flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-primary" /> Panel Admin</h1>
          <div className="flex-1" />
          <Button size="sm" variant="outline" onClick={runVerify}><RefreshCw className="h-4 w-4" /> Verificar vistas</Button>
        </div>
        <nav className="border-t border-border bg-card">
          <div className="container mx-auto px-4 h-10 flex items-center gap-6 text-sm font-medium">
            {(["users", "ledger", "payouts", "fraud", "settings"] as const).map((t) => (
              <button key={t} onClick={() => setTab(t)} className={tab === t ? "text-primary" : "text-muted-foreground hover:text-primary"}>
                {t === "users" ? "Usuarios" : t === "ledger" ? "Ganancias" : t === "payouts" ? "Pagos" : t === "fraud" ? "Fraude" : "Ajustes"}
              </button>
            ))}
          </div>
        </nav>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-6xl">
        {tab === "users" && (
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Buscar usuario…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs uppercase text-muted-foreground tracking-wide">
                  <tr className="border-b border-border">
                    <th className="text-left py-2">Usuario</th>
                    <th className="text-left py-2">Registrado</th>
                    <th className="text-right py-2">Videos</th>
                    <th className="text-right py-2">Vistas</th>
                    <th className="text-right py-2">Seguidores</th>
                    <th className="text-right py-2">Ganado total</th>
                    <th className="text-right py-2">Disponible</th>
                    <th className="text-center py-2">Estado</th>
                    <th className="text-right py-2">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProfiles.map((p) => (
                    <tr key={p.id} className="border-b border-border/50">
                      <td className="py-2">
                        <Link to={`/u/${p.username}`} className="hover:text-primary font-medium inline-flex items-center gap-1">
                          @{p.username}
                          {p.is_verified && <BadgeCheck className="h-4 w-4 text-primary fill-primary/20" />}
                        </Link>
                      </td>
                      <td className="py-2 text-xs text-muted-foreground">{new Date(p.created_at).toLocaleDateString()}</td>
                      <td className="py-2 text-right tabular-nums">{p.total_videos}</td>
                      <td className="py-2 text-right tabular-nums">{p.total_views.toLocaleString()}</td>
                      <td className="py-2 text-right tabular-nums">{p.total_followers}</td>
                      <td className="py-2 text-right tabular-nums font-medium">${(p.earnings_total ?? 0).toFixed(2)}</td>
                      <td className="py-2 text-right tabular-nums text-primary">${(p.balance_available ?? 0).toFixed(2)}</td>
                      <td className="py-2 text-center">
                        {p.monetization_blocked ? <Badge variant="destructive">Bloqueado</Badge>
                          : p.monetization_enabled ? <Badge>Activo</Badge>
                          : <Badge variant="secondary">Inactivo</Badge>}
                      </td>
                      <td className="py-2 text-right space-x-1 whitespace-nowrap">
                        <Button size="sm" variant={p.is_verified ? "default" : "outline"} onClick={() => toggleVerified(p)} title={p.is_verified ? "Quitar verificación" : "Verificar"}>
                          <BadgeCheck className="h-4 w-4" /> {p.is_verified ? "Verificado" : "Verificar"}
                        </Button>
                        {p.monetization_blocked ? (
                          <Button size="sm" variant="outline" onClick={() => toggleMon(p, false, false)}>Desbloquear</Button>
                        ) : (
                          <>
                            <Button size="sm" variant="outline" onClick={() => toggleMon(p, !p.monetization_enabled, false)}>
                              {p.monetization_enabled ? "Desactivar" : "Activar"}
                            </Button>
                            <Button size="sm" variant="destructive" onClick={() => toggleMon(p, false, true)}>Bloquear</Button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {tab === "ledger" && (
          <Card className="p-4">
            <h3 className="font-semibold mb-3 flex items-center gap-2"><DollarSign className="h-4 w-4 text-primary" /> Historial de ganancias (ledger)</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs uppercase text-muted-foreground tracking-wide">
                  <tr className="border-b border-border">
                    <th className="text-left py-2">Fecha</th>
                    <th className="text-left py-2">Usuario</th>
                    <th className="text-left py-2">Video</th>
                    <th className="text-right py-2">Vistas verif.</th>
                    <th className="text-right py-2">Tasa</th>
                    <th className="text-right py-2">Monto</th>
                    <th className="text-center py-2">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {ledger.length === 0 && (
                    <tr><td colSpan={7} className="text-center py-8 text-muted-foreground">Sin movimientos. Ejecuta "Verificar vistas".</td></tr>
                  )}
                  {ledger.map((e) => (
                    <tr key={e.id} className="border-b border-border/50">
                      <td className="py-2">{new Date(e.created_at).toLocaleString()}</td>
                      <td className="py-2">{e.username ? <Link className="hover:text-primary" to={`/u/${e.username}`}>@{e.username}</Link> : "—"}</td>
                      <td className="py-2">{e.video_id ? <Link to={`/v/${e.video_id}`} className="hover:text-primary font-mono text-xs">{e.video_id.slice(0, 8)}…</Link> : "—"}</td>
                      <td className="py-2 text-right tabular-nums">{e.verified_views.toLocaleString()}</td>
                      <td className="py-2 text-right tabular-nums text-xs text-muted-foreground">${Number(e.rate_per_view).toFixed(4)}</td>
                      <td className="py-2 text-right tabular-nums font-medium">${Number(e.amount).toFixed(2)}</td>
                      <td className="py-2 text-center">
                        <Badge variant={e.status === "available" ? "default" : e.status === "paid" ? "secondary" : "outline"}>{e.status}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {tab === "payouts" && (
          <Card className="p-4">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs uppercase text-muted-foreground tracking-wide">
                  <tr className="border-b border-border">
                    <th className="text-left py-2">Fecha</th>
                    <th className="text-left py-2">Usuario</th>
                    <th className="text-right py-2">Monto</th>
                    <th className="text-left py-2">Método</th>
                    <th className="text-left py-2">Detalles</th>
                    <th className="text-center py-2">Estado</th>
                    <th className="text-right py-2">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {payouts.length === 0 && (
                    <tr><td colSpan={7} className="text-center py-8 text-muted-foreground">Sin solicitudes.</td></tr>
                  )}
                  {payouts.map((p) => (
                    <tr key={p.id} className="border-b border-border/50">
                      <td className="py-2">{new Date(p.created_at).toLocaleDateString()}</td>
                      <td className="py-2">{p.username ? <Link className="hover:text-primary" to={`/u/${p.username}`}>@{p.username}</Link> : "—"}</td>
                      <td className="py-2 text-right tabular-nums">${Number(p.amount).toFixed(2)}</td>
                      <td className="py-2">{p.payment_method}</td>
                      <td className="py-2 max-w-[200px] truncate" title={p.payment_details}>{p.payment_details}</td>
                      <td className="py-2 text-center">
                        <Badge variant={p.status === "paid" ? "default" : p.status === "rejected" ? "destructive" : "secondary"}>{p.status}</Badge>
                      </td>
                      <td className="py-2 text-right space-x-1">
                        {p.status === "pending" && (
                          <>
                            <Button size="sm" onClick={() => setPayoutStatus(p.id, "approved")}>Aprobar</Button>
                            <Button size="sm" variant="destructive" onClick={() => setPayoutStatus(p.id, "rejected", "Rechazado")}><X className="h-3 w-3" /></Button>
                          </>
                        )}
                        {p.status === "approved" && (
                          <Button size="sm" onClick={() => setPayoutStatus(p.id, "paid")}><CheckCircle2 className="h-4 w-4" /> Marcar pagado</Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {tab === "fraud" && (
          <Card className="p-4">
            <h3 className="font-semibold mb-3">Vistas rechazadas recientes</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs uppercase text-muted-foreground tracking-wide">
                  <tr className="border-b border-border">
                    <th className="text-left py-2">Fecha</th>
                    <th className="text-left py-2">Video</th>
                    <th className="text-left py-2">IP hash</th>
                    <th className="text-left py-2">Razón</th>
                  </tr>
                </thead>
                <tbody>
                  {fraud.length === 0 && (
                    <tr><td colSpan={4} className="text-center py-8 text-muted-foreground">Sin vistas rechazadas.</td></tr>
                  )}
                  {fraud.map((f) => (
                    <tr key={f.id} className="border-b border-border/50">
                      <td className="py-2">{new Date(f.created_at).toLocaleString()}</td>
                      <td className="py-2"><Link to={`/v/${f.video_id}`} className="hover:text-primary">{f.video_id.slice(0, 8)}…</Link></td>
                      <td className="py-2 font-mono text-xs">{f.ip_hash.slice(0, 12)}…</td>
                      <td className="py-2"><Badge variant="destructive">{f.rejection_reason ?? "—"}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {tab === "settings" && settings && (
          <Card className="p-5 max-w-xl space-y-4">
            <h3 className="font-bold">Configuración global</h3>
            {[
              { k: "rate_per_view", l: "Tasa por vista (USD)", step: "0.0001" },
              { k: "min_payout", l: "Mínimo retiro (USD)", step: "1" },
              { k: "verification_days", l: "Días de verificación", step: "1" },
              { k: "min_videos", l: "Mínimo de videos", step: "1" },
              { k: "min_views", l: "Mínimo de vistas", step: "1" },
              { k: "min_followers", l: "Mínimo de seguidores", step: "1" },
            ].map(({ k, l, step }) => (
              <div key={k}>
                <label className="text-xs text-muted-foreground">{l}</label>
                <Input type="number" step={step}
                  value={(settings as unknown as Record<string, number>)[k]}
                  onChange={(e) => setSettings({ ...settings, [k]: parseFloat(e.target.value) })} />
              </div>
            ))}
            <Button onClick={saveSettings}>Guardar</Button>
          </Card>
        )}
      </main>
    </div>
  );
}

import { useEffect, useState } from "react";
import { Cookie, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

const STORAGE_KEY = "xp_cookie_prefs_v1";

export type CookiePrefs = {
  necessary: true;
  analytics: boolean;
  marketing: boolean;
  acceptedAt: string;
};

export const getCookiePrefs = (): CookiePrefs | null => {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as CookiePrefs) : null;
  } catch {
    return null;
  }
};

const applyPrefs = (prefs: CookiePrefs) => {
  if (typeof window === "undefined") return;
  (window as unknown as { __cookiePrefs?: CookiePrefs }).__cookiePrefs = prefs;
  window.dispatchEvent(new CustomEvent("cookie-prefs-changed", { detail: prefs }));
};

const CookieConsent = () => {
  const [visible, setVisible] = useState(false);
  const [openCustom, setOpenCustom] = useState(false);
  const [analytics, setAnalytics] = useState(true);
  const [marketing, setMarketing] = useState(false);

  useEffect(() => {
    const existing = getCookiePrefs();
    if (!existing) {
      const t = setTimeout(() => setVisible(true), 600);
      return () => clearTimeout(t);
    } else {
      applyPrefs(existing);
      setAnalytics(existing.analytics);
      setMarketing(existing.marketing);
    }
  }, []);

  const save = (prefs: Omit<CookiePrefs, "acceptedAt" | "necessary">) => {
    const full: CookiePrefs = {
      necessary: true,
      analytics: prefs.analytics,
      marketing: prefs.marketing,
      acceptedAt: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(full));
    applyPrefs(full);
    setVisible(false);
    setOpenCustom(false);
  };

  if (!visible && !openCustom) return null;

  return (
    <>
      {visible && (
        <div
          role="dialog"
          aria-label="Aviso de cookies"
          className="fixed bottom-4 left-4 right-4 sm:left-6 sm:right-auto sm:bottom-6 sm:max-w-md z-[100] bg-card border border-border rounded-lg shadow-2xl p-4 sm:p-5 animate-in fade-in slide-in-from-bottom-4"
        >
          <button
            type="button"
            onClick={() => save({ analytics: false, marketing: false })}
            aria-label="Cerrar"
            className="absolute top-2 right-2 p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="flex gap-3">
            <div className="shrink-0 mt-0.5 w-9 h-9 rounded-full bg-primary/15 text-primary flex items-center justify-center">
              <Cookie className="h-5 w-5" />
            </div>
            <div className="flex-1 pr-4">
              <p className="text-sm text-foreground/90 leading-relaxed">
                Este sitio utiliza cookies para ayudar a mejorar su experiencia
                de usuario. Obtenga más información sobre cómo usamos las
                cookies en nuestro{" "}
                <a
                  href="#"
                  className="text-primary hover:underline font-medium"
                  onClick={(e) => {
                    e.preventDefault();
                    setOpenCustom(true);
                  }}
                >
                  Aviso sobre cookies
                </a>
                .
              </p>
              <div className="mt-4 flex flex-col sm:flex-row gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setOpenCustom(true)}
                  className="rounded-md"
                >
                  Personalizar cookies
                </Button>
                <Button
                  size="sm"
                  onClick={() => save({ analytics: true, marketing: true })}
                  className="rounded-md"
                >
                  Ok
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <Dialog open={openCustom} onOpenChange={setOpenCustom}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Preferencias de cookies</DialogTitle>
            <DialogDescription>
              Elige qué cookies quieres permitir. Puedes cambiar estas
              preferencias en cualquier momento.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="flex items-start justify-between gap-4 p-3 rounded-md border border-border">
              <div className="flex-1">
                <Label className="text-sm font-semibold">Necesarias</Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Imprescindibles para el funcionamiento del sitio (sesión,
                  seguridad). No se pueden desactivar.
                </p>
              </div>
              <Switch checked disabled />
            </div>
            <div className="flex items-start justify-between gap-4 p-3 rounded-md border border-border">
              <div className="flex-1">
                <Label htmlFor="ck-an" className="text-sm font-semibold">Analíticas</Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Nos ayudan a entender cómo usas el sitio para mejorarlo.
                </p>
              </div>
              <Switch id="ck-an" checked={analytics} onCheckedChange={setAnalytics} />
            </div>
            <div className="flex items-start justify-between gap-4 p-3 rounded-md border border-border">
              <div className="flex-1">
                <Label htmlFor="ck-mk" className="text-sm font-semibold">Marketing</Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Permiten mostrar contenido y anuncios más relevantes.
                </p>
              </div>
              <Switch id="ck-mk" checked={marketing} onCheckedChange={setMarketing} />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              variant="outline"
              onClick={() => save({ analytics: false, marketing: false })}
            >
              Rechazar todo
            </Button>
            <Button onClick={() => save({ analytics, marketing })}>
              Guardar preferencias
            </Button>
            <Button
              variant="secondary"
              onClick={() => save({ analytics: true, marketing: true })}
            >
              Aceptar todo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CookieConsent;
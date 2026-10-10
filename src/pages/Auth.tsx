import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { toast } from "sonner";
import { Loader2, X, Eye, EyeOff } from "lucide-react";

const Auth = () => {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [otpOpen, setOtpOpen] = useState(false);
  const [otp, setOtp] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [sendingReset, setSendingReset] = useState(false);

  useEffect(() => {
    document.title = "Iniciar sesión — X Pornazo";
    // Si ya hay sesión activa, sal de /auth de inmediato
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) navigate("/", { replace: true });
    });
  }, [navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: { username: username.trim() || undefined },
          },
        });
        if (error) throw error;
        toast.success("¡Cuenta creada!");
        navigate("/", { replace: true });
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        if (!data.session) throw new Error("No se pudo iniciar sesión. Inténtalo de nuevo.");
        toast.success("¡Bienvenido!");
        // Espera un tick para que onAuthStateChange propague la sesión antes de navegar
        setTimeout(() => navigate("/", { replace: true }), 50);
      }
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async (code: string) => {
    setVerifying(true);
    try {
      const { error } = await supabase.auth.verifyOtp({ email, token: code, type: "signup" });
      if (error) throw error;
      toast.success("¡Cuenta verificada!");
      setOtpOpen(false);
      navigate("/");
    } catch (err) {
      toast.error((err as Error).message);
      setOtp("");
    } finally {
      setVerifying(false);
    }
  };

  const resend = async () => {
    setResending(true);
    try {
      const { error } = await supabase.auth.resend({ type: "signup", email });
      if (error) throw error;
      toast.success("Reenviado");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setResending(false);
    }
  };

  const forgotPassword = async () => {
    if (!email) {
      toast.error("Introduce tu correo para recuperar la contraseña");
      return;
    }
    setSendingReset(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth`,
      });
      if (error) throw error;
      toast.success("Te enviamos un enlace para restablecer tu contraseña");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSendingReset(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="relative w-full max-w-sm bg-card rounded-xl p-7 sm:p-8 border border-border shadow-2xl">
        <button
          onClick={() => navigate(-1)}
          className="absolute right-3 top-3 p-1 text-muted-foreground hover:text-foreground"
          aria-label="Cerrar"
        >
          <X className="h-5 w-5" />
        </button>

        <Link to="/" className="flex items-center gap-1 justify-center mb-5">
          <span className="text-3xl font-extrabold text-primary leading-none">X</span>
          <span className="rounded-md bg-primary px-2 py-0.5 text-2xl font-extrabold text-primary-foreground leading-none">
            Pornazo
          </span>
        </Link>

        <h1 className="text-center text-xl sm:text-2xl font-bold mb-1">
          {mode === "login" ? "Iniciar sesión de miembro" : "Crear cuenta nueva"}
        </h1>
        <p className="text-center text-sm text-muted-foreground mb-6">
          {mode === "login"
            ? "Accede a tu cuenta de X Pornazo"
            : "Únete a la comunidad de X Pornazo"}
        </p>

        <form onSubmit={submit} className="space-y-3">
          {mode === "signup" && (
            <Input
              placeholder="Nombre de usuario"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="h-12 bg-secondary/60 border-border rounded-md"
            />
          )}
          <Input
            type="email"
            placeholder="Correo electrónico"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="h-12 bg-secondary/60 border-border rounded-md"
          />
          <div className="relative">
            <Input
              type={showPwd ? "text" : "password"}
              placeholder="Contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="h-12 pr-11 bg-secondary/60 border-border rounded-md"
            />
            <button
              type="button"
              onClick={() => setShowPwd((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
              aria-label={showPwd ? "Ocultar contraseña" : "Mostrar contraseña"}
            >
              {showPwd ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            </button>
          </div>

          {mode === "login" && (
            <button
              type="button"
              onClick={forgotPassword}
              disabled={sendingReset}
              className="block text-sm text-foreground/80 hover:text-primary text-left pt-1"
            >
              {sendingReset ? "Enviando…" : "¿Olvidó su contraseña?"}
            </button>
          )}

          <div className="grid grid-cols-2 gap-3 pt-3">
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={() => navigate(-1)}
              className="h-12 rounded-md font-semibold"
            >
              Volver
            </Button>
            <Button
              type="submit"
              disabled={loading}
              size="lg"
              className="h-12 rounded-md font-semibold"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : mode === "login" ? (
                "Entrar"
              ) : (
                "Crear cuenta"
              )}
            </Button>
          </div>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          {mode === "login" ? (
            <>
              ¿Aún no tienes una cuenta?{" "}
              <button
                type="button"
                onClick={() => setMode("signup")}
                className="text-primary font-semibold hover:underline"
              >
                Registrarse aquí
              </button>
            </>
          ) : (
            <>
              ¿Ya tienes una cuenta?{" "}
              <button
                type="button"
                onClick={() => setMode("login")}
                className="text-primary font-semibold hover:underline"
              >
                Inicia sesión
              </button>
            </>
          )}
        </p>
      </div>

      {otpOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="relative w-full max-w-sm rounded-2xl border border-border bg-card p-8 text-center">
            <button
              onClick={() => setOtpOpen(false)}
              className="absolute right-4 top-4 text-muted-foreground hover:text-foreground"
              aria-label="Cerrar"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="mb-6 flex items-center justify-center gap-1">
              <span className="text-2xl font-extrabold">X</span>
              <span className="rounded-md bg-primary px-2 py-0.5 text-2xl font-extrabold text-primary-foreground">
                Pornazo
              </span>
            </div>
            <h2 className="mb-4 text-lg font-bold">Confirme su correo electrónico</h2>
            <p className="text-sm text-muted-foreground">Se envió un código de verificación a:</p>
            <p className="mt-1 mb-4 text-sm font-semibold uppercase tracking-wide">{email}</p>
            <p className="mb-5 text-sm text-muted-foreground">
              Introdúzcalo a continuación para verificar
              <br /> su cuenta
            </p>
            <div className="mb-5 flex justify-center">
              <InputOTP
                maxLength={6}
                value={otp}
                onChange={(v) => {
                  setOtp(v);
                  if (v.length === 6) verifyOtp(v);
                }}
                disabled={verifying}
              >
                <InputOTPGroup>
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <InputOTPSlot key={i} index={i} className="h-11 w-11 text-lg" />
                  ))}
                </InputOTPGroup>
              </InputOTP>
            </div>
            {verifying && <Loader2 className="mx-auto mb-3 h-4 w-4 animate-spin text-muted-foreground" />}
            <p className="text-sm text-muted-foreground">
              ¿No recibiste un código?{" "}
              <button
                onClick={resend}
                disabled={resending}
                className="text-primary underline underline-offset-2 hover:opacity-80"
              >
                Reenviar
              </button>
              <br />o{" "}
              <button
                onClick={() => setOtpOpen(false)}
                className="text-primary underline underline-offset-2 hover:opacity-80"
              >
                Cambiar el correo electrónico
              </button>
            </p>
            <p className="mt-5 text-xs text-muted-foreground">
              Necesitas confirmar tu dirección de correo electrónico dentro de 15 días, o tu cuenta será eliminada.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Auth;

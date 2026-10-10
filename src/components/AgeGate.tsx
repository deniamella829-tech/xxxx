import { useEffect, useState } from "react";

const STORAGE_KEY = "xpornazo-age-confirmed";

const AgeGate = () => {
  const [confirmed, setConfirmed] = useState<boolean | null>(null);

  useEffect(() => {
    setConfirmed(localStorage.getItem(STORAGE_KEY) === "1");
  }, []);

  if (confirmed === null || confirmed) return null;

  const accept = () => {
    localStorage.setItem(STORAGE_KEY, "1");
    setConfirmed(true);
  };

  const reject = () => {
    window.location.href = "https://www.google.com";
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black flex items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-2xl bg-card border border-border rounded-lg p-8 md:p-10 text-center">
        <div className="flex items-center gap-2 justify-center mb-6">
          <span className="text-4xl md:text-5xl font-extrabold text-primary">X</span>
          <span className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">Pornazo</span>
        </div>

        <h1 className="text-2xl md:text-3xl font-bold mb-4 text-foreground">
          Este es un Sitio Web para adultos
        </h1>

        <button
          type="button"
          className="mb-6 inline-block border-2 border-primary text-primary font-semibold px-4 py-2 rounded hover:bg-primary hover:text-primary-foreground transition-colors"
        >
          Aviso a usuarios
        </button>

        <p className="text-muted-foreground leading-relaxed mb-4 text-sm md:text-base">
          Este sitio web contiene material restringido a menores de edad, que incluye desnudez y
          representaciones explícitas de actividad sexual. Al entrar, afirma que tiene por lo menos
          18 años de edad o la mayoría de edad en la jurisdicción desde que está accediendo el sitio
          web y que da consentimiento en ver contenido sexualmente explícito.
        </p>

        <p className="text-primary font-semibold mb-8">Aviso a las fuerzas del orden</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <button
            onClick={accept}
            className="border-2 border-primary bg-transparent hover:bg-primary hover:text-primary-foreground text-foreground font-bold py-4 px-4 rounded transition-colors"
          >
            Tengo 18 años o más - Entrar
          </button>
          <button
            onClick={reject}
            className="border-2 border-border bg-transparent hover:bg-secondary text-foreground font-bold py-4 px-4 rounded transition-colors"
          >
            Soy menor de 18 años - Salir
          </button>
        </div>

        <p className="text-muted-foreground text-sm mb-2">
          Nuestra <span className="text-primary">página de control parental</span> explica cómo
          bloquear fácilmente el acceso a este sitio.
        </p>
        <p className="text-primary font-semibold mb-6">Términos de Servicio</p>

        <p className="text-xs text-muted-foreground">© X Pornazo, 2026</p>
      </div>
    </div>
  );
};

export default AgeGate;

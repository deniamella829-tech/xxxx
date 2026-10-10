import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Home, Search } from "lucide-react";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    document.title = "404 — X Pornazo";
    console.warn("404: ruta no encontrada", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-background">
      <div className="text-center max-w-md">
        <div className="flex items-center gap-2 justify-center mb-6">
          <span className="text-4xl font-extrabold text-primary">X</span>
          <span className="text-3xl font-bold tracking-tight text-foreground">Pornazo</span>
        </div>
        <h1 className="text-7xl font-extrabold text-primary mb-2">404</h1>
        <p className="text-xl font-semibold mb-2">Página no encontrada</p>
        <p className="text-sm text-muted-foreground mb-6 break-all">
          La ruta <span className="font-mono text-foreground">{location.pathname}</span> no existe.
        </p>
        <div className="flex gap-2 justify-center">
          <Link to="/">
            <Button><Home className="h-4 w-4" /> Inicio</Button>
          </Link>
          <Link to="/">
            <Button variant="outline"><Search className="h-4 w-4" /> Explorar</Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NotFound;

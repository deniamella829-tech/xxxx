import { Link } from "react-router-dom";
import {
  Star, Compass, Zap, Sparkles, Award,
  Flame, Eye, Image as ImageIcon,
  DollarSign, ShieldCheck, BarChart3,
} from "lucide-react";

export type SidebarFilter = {
  label: string;
  sort?: "recientes" | "mas-vistos" | "tendencias" | "recomendados" | "inicio";
  keyword?: string;
  shortsOnly?: boolean;
  mode?: "videos" | "fotos";
  photoSort?: "nuevas" | "recomendadas" | "mas-vistas";
};

type Item = {
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  to?: string;
  filter?: SidebarFilter;
  badge?: string;
};
type Section = { title: string; items: Item[] };

interface Props {
  onSelectFilter?: (filter: SidebarFilter) => void;
  isAdmin?: boolean;
  loggedIn?: boolean;
}

const Sidebar = ({ onSelectFilter, isAdmin, loggedIn }: Props) => {
  const sections: Section[] = [
    {
      title: "Vídeos Porno",
      items: [
        { label: "Exclusivos", icon: Star, filter: { label: "Exclusivos", sort: "recientes" } },
        { label: "Explorar", icon: Compass, filter: { label: "Explorar", sort: "inicio" } },
        { label: "Shorts", icon: Zap, badge: "Beta", filter: { label: "Shorts", sort: "recientes", shortsOnly: true } },
        { label: "Los Mejores", icon: Sparkles, filter: { label: "Los Mejores", sort: "mas-vistos" } },
        { label: "Recomendado", icon: Award, filter: { label: "Recomendado", sort: "recomendados" } },
      ],
    },
    {
      title: "Categorías",
      items: [
        { label: "Maduras", filter: { label: "Maduras", keyword: "madura" } },
        { label: "Jovencitas", filter: { label: "Jovencitas", keyword: "joven" } },
        { label: "Transexual", filter: { label: "Transexual", keyword: "transexual" } },
        { label: "Gay", filter: { label: "Gay", keyword: "gay" } },
        { label: "Amateur", filter: { label: "Amateur", keyword: "amateur" } },
        { label: "Anal", filter: { label: "Anal", keyword: "anal" } },
        { label: "Lésbico", filter: { label: "Lésbico", keyword: "lesbico" } },
        { label: "POV", filter: { label: "POV", keyword: "pov" } },
        { label: "Hentai", filter: { label: "Hentai", keyword: "hentai" } },
        { label: "Latinas", filter: { label: "Latinas", keyword: "latina" } },
      ],
    },
    {
      title: "Fotos",
      items: [
        { label: "Nuevas Fotos", icon: ImageIcon, filter: { label: "Nuevas Fotos", mode: "fotos", photoSort: "nuevas" } },
        { label: "Recomendadas", icon: Flame, filter: { label: "Fotos Recomendadas", mode: "fotos", photoSort: "recomendadas" } },
        { label: "Más Vistas", icon: Eye, filter: { label: "Fotos Más Vistas", mode: "fotos", photoSort: "mas-vistas" } },
      ],
    },
  ];

  const accountSection: Section | null = loggedIn ? {
    title: "Mi cuenta",
    items: [
      { label: "Estadísticas", icon: BarChart3, to: "/stats" },
      { label: "Monetización", icon: DollarSign, to: "/monetization" },
      ...(isAdmin ? [{ label: "Panel Admin", icon: ShieldCheck, to: "/admin" }] : []),
    ],
  } : null;

  const renderItem = (it: Item) => {
    const Inner = (
      <span className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-foreground/85 hover:bg-secondary hover:text-primary transition-colors w-full text-left cursor-pointer group">
        {it.icon && <it.icon className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-primary transition-colors" />}
        <span className="flex-1 truncate">{it.label}</span>
        {it.badge && (
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-primary text-primary-foreground uppercase">
            {it.badge}
          </span>
        )}
      </span>
    );
    if (it.to) return <Link key={it.label} to={it.to}>{Inner}</Link>;
    return (
      <button
        key={it.label}
        type="button"
        onClick={() => it.filter && onSelectFilter?.(it.filter)}
        className="block w-full"
      >
        {Inner}
      </button>
    );
  };

  return (
    <aside className="w-full lg:w-60 shrink-0 lg:border-r border-border lg:bg-card/30">
      <div className="lg:sticky lg:top-[6.5rem] lg:max-h-[calc(100vh-6.5rem)] lg:overflow-y-auto py-4 px-2">
        {accountSection && (
          <div className="mb-4">
            <h3 className="px-3 mb-1.5 text-[11px] font-bold tracking-widest uppercase text-muted-foreground">
              {accountSection.title}
            </h3>
            <div className="space-y-0.5">{accountSection.items.map(renderItem)}</div>
            <div className="my-3 border-t border-border" />
          </div>
        )}

        {sections.map((s, idx) => (
          <div key={s.title} className="mb-4">
            <h3 className="px-3 mb-1.5 text-[11px] font-bold tracking-widest uppercase text-muted-foreground">
              {s.title}
            </h3>
            <div className="space-y-0.5">
              {s.items.map(renderItem)}
            </div>
            {idx < sections.length - 1 && <div className="my-3 border-t border-border" />}
          </div>
        ))}
      </div>
    </aside>
  );
};

export default Sidebar;

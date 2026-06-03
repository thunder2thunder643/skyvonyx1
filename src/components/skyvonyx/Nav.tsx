import { Link } from "@tanstack/react-router";
import { Logo } from "./Logo";

const links = [
  { label: "Platform", href: "#platform" },
  { label: "Detection", href: "#detection" },
  { label: "Dashboard", href: "#dashboard" },
  { label: "Stack", href: "#stack" },
];

export function Nav() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50">
      <div className="mx-auto max-w-7xl px-6 py-4">
        <div className="glass-panel rounded-md px-5 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <Logo className="h-6" />
          </Link>
          <nav className="hidden md:flex items-center gap-8 text-sm uppercase tracking-[0.18em] text-muted-foreground font-medium">
            {links.map((l) => (
              <a key={l.href} href={l.href} className="hover:text-gold transition-colors">{l.label}</a>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <span className="hidden sm:flex items-center gap-2 text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
              <span className="size-1.5 rounded-full bg-gold animate-pulse-gold" />
              System Online
            </span>
            <a
              href="#cta"
              className="bg-gold-gradient text-primary-foreground text-xs uppercase tracking-[0.2em] font-bold px-4 py-2 rounded-sm glow-gold-sm hover:scale-[1.02] transition-transform"
            >
              Launch
            </a>
          </div>
        </div>
      </div>
    </header>
  );
}
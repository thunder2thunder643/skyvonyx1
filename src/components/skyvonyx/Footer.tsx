import { Globe, Send, Share2 } from "lucide-react";
import { Logo } from "./Logo";

export function Footer() {
  return (
    <footer className="relative border-t border-gold/20 mt-10">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold to-transparent" />
      <div className="mx-auto max-w-7xl px-6 py-16 grid md:grid-cols-[1.5fr_1fr_1fr_1fr] gap-10">
        <div>
          <Logo className="h-7 mb-4" />
          <p className="text-sm text-muted-foreground max-w-xs">
            Defense-grade satellite intelligence. Engineered for operators in aerospace, climate-tech and remote sensing.
          </p>
          <div className="flex gap-3 mt-5">
            {[Globe, Send, Share2].map((I, i) => (
              <a key={i} href="#" className="size-9 grid place-items-center border border-gold/25 hover:border-gold hover:bg-gold/10 transition-colors">
                <I className="size-4 text-gold" />
              </a>
            ))}
          </div>
        </div>
        {[
          { h: "Platform", l: ["Dashboard", "Upload", "Inference", "Map Viewer"] },
          { h: "Resources", l: ["Documentation", "API Reference", "Changelog", "Status"] },
          { h: "Company", l: ["About", "Security", "Contact", "Careers"] },
        ].map((c) => (
          <div key={c.h}>
            <div className="text-[10px] uppercase tracking-[0.3em] text-gold mb-4">{c.h}</div>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {c.l.map((x) => <li key={x}><a className="hover:text-gold transition-colors" href="#">{x}</a></li>)}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-gold/10 py-5">
        <div className="mx-auto max-w-7xl px-6 flex flex-wrap items-center justify-between gap-2 text-[10px] uppercase tracking-[0.25em] text-muted-foreground font-mono">
          <span>© {new Date().getFullYear()} SKYVONYX SYSTEMS · ALL RIGHTS RESERVED</span>
          <span className="text-gold/60">CLASSIFIED // OPERATIONAL // BUILD 2.4.1</span>
        </div>
      </div>
    </footer>
  );
}
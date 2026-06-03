import logoAsset from "@/assets/skyvonyx-logo.png.asset.json";

export function Logo({ className = "h-7" }: { className?: string }) {
  return (
    <img
      src={logoAsset.url}
      alt="Skyvonyx"
      className={className}
      style={{ filter: "drop-shadow(0 0 14px oklch(0.82 0.14 88 / 0.45))" }}
    />
  );
}
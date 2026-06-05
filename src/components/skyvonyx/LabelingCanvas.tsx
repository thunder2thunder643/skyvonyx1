import { useEffect, useRef, useState, useCallback } from "react";

export interface AnnObject {
  id: string;
  label: string;
  confidence?: number;
  color?: string;
  bbox: { x: number; y: number; width: number; height: number };
  source: "ai" | "manual";
}

export type Tool = "select" | "bbox" | "pan";

interface Props {
  imageUrl: string;
  objects: AnnObject[];
  setObjects: (o: AnnObject[] | ((p: AnnObject[]) => AnnObject[])) => void;
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
  tool: Tool;
  visibleLabels: Set<string>;
  showOverlays: boolean;
}

export function LabelingCanvas({
  imageUrl, objects, setObjects, selectedId, setSelectedId, tool, visibleLabels, showOverlays,
}: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [view, setView] = useState({ scale: 1, tx: 0, ty: 0 });
  const [imgSize, setImgSize] = useState({ w: 0, h: 0 });
  const drawingRef = useRef<{ start: { x: number; y: number }; id: string } | null>(null);
  const dragRef = useRef<{ type: "pan" | "move" | "resize"; startX: number; startY: number; orig: any; handle?: string } | null>(null);

  // Load image
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      imgRef.current = img;
      setImgSize({ w: img.naturalWidth, h: img.naturalHeight });
      fitToView(img.naturalWidth, img.naturalHeight);
    };
    img.src = imageUrl;
  }, [imageUrl]);

  const fitToView = (w: number, h: number) => {
    const el = wrapRef.current;
    if (!el || !w) return;
    const cw = el.clientWidth, ch = el.clientHeight;
    const scale = Math.min(cw / w, ch / h) * 0.92;
    setView({ scale, tx: (cw - w * scale) / 2, ty: (ch - h * scale) / 2 });
  };

  // Render loop
  const render = useCallback(() => {
    const canvas = canvasRef.current, wrap = wrapRef.current, img = imgRef.current;
    if (!canvas || !wrap || !img) return;
    const dpr = window.devicePixelRatio || 1;
    const cw = wrap.clientWidth, ch = wrap.clientHeight;
    if (canvas.width !== cw * dpr || canvas.height !== ch * dpr) {
      canvas.width = cw * dpr; canvas.height = ch * dpr;
      canvas.style.width = cw + "px"; canvas.style.height = ch + "px";
    }
    const ctx = canvas.getContext("2d")!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cw, ch);

    // Background grid
    ctx.fillStyle = "#06060a";
    ctx.fillRect(0, 0, cw, ch);

    // Image
    ctx.save();
    ctx.translate(view.tx, view.ty);
    ctx.scale(view.scale, view.scale);
    ctx.imageSmoothingEnabled = view.scale < 2;
    ctx.drawImage(img, 0, 0);

    if (showOverlays) {
      for (const o of objects) {
        if (!visibleLabels.has(o.label)) continue;
        const { x, y, width, height } = o.bbox;
        const color = o.color ?? "#F5D66B";
        const isSel = o.id === selectedId;
        ctx.lineWidth = (isSel ? 3 : 2) / view.scale;
        ctx.strokeStyle = color;
        ctx.fillStyle = color + "22";
        ctx.fillRect(x, y, width, height);
        ctx.strokeRect(x, y, width, height);
        // Label badge
        const fs = 12 / view.scale;
        ctx.font = `${fs}px 'Rajdhani', sans-serif`;
        const text = `${o.label.toUpperCase()}${o.confidence ? ` ${Math.round(o.confidence * 100)}%` : ""}`;
        const tw = ctx.measureText(text).width + 8 / view.scale;
        ctx.fillStyle = color;
        ctx.fillRect(x, y - fs - 4 / view.scale, tw, fs + 4 / view.scale);
        ctx.fillStyle = "#06060a";
        ctx.fillText(text, x + 4 / view.scale, y - 4 / view.scale);
        if (isSel) {
          // Handles
          const hs = 8 / view.scale;
          ctx.fillStyle = "#F5D66B";
          for (const [hx, hy] of [
            [x, y], [x + width, y], [x, y + height], [x + width, y + height],
          ]) ctx.fillRect(hx - hs / 2, hy - hs / 2, hs, hs);
        }
      }
    }
    ctx.restore();
  }, [view, objects, selectedId, visibleLabels, showOverlays]);

  useEffect(() => { render(); }, [render]);
  useEffect(() => {
    const onResize = () => render();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [render]);

  function toImage(e: React.MouseEvent) {
    const rect = wrapRef.current!.getBoundingClientRect();
    const sx = e.clientX - rect.left, sy = e.clientY - rect.top;
    return { x: (sx - view.tx) / view.scale, y: (sy - view.ty) / view.scale, sx, sy };
  }

  function hitTest(x: number, y: number): AnnObject | null {
    for (let i = objects.length - 1; i >= 0; i--) {
      const o = objects[i];
      if (!visibleLabels.has(o.label)) continue;
      const { x: bx, y: by, width, height } = o.bbox;
      if (x >= bx && x <= bx + width && y >= by && y <= by + height) return o;
    }
    return null;
  }

  function getHandle(o: AnnObject, x: number, y: number): string | null {
    const tol = 10 / view.scale;
    const { x: bx, y: by, width, height } = o.bbox;
    const corners: Array<[string, number, number]> = [
      ["nw", bx, by], ["ne", bx + width, by],
      ["sw", bx, by + height], ["se", bx + width, by + height],
    ];
    for (const [k, hx, hy] of corners) {
      if (Math.abs(x - hx) < tol && Math.abs(y - hy) < tol) return k;
    }
    return null;
  }

  function onMouseDown(e: React.MouseEvent) {
    const p = toImage(e);
    if (e.button === 1 || e.altKey || tool === "pan") {
      dragRef.current = { type: "pan", startX: e.clientX, startY: e.clientY, orig: { ...view } };
      return;
    }
    if (tool === "bbox") {
      const id = `m_${Date.now()}`;
      const newObj: AnnObject = {
        id, label: "object", color: "#F5D66B", source: "manual",
        bbox: { x: p.x, y: p.y, width: 1, height: 1 },
      };
      setObjects((prev) => [...prev, newObj]);
      setSelectedId(id);
      drawingRef.current = { start: p, id };
      return;
    }
    // Select tool
    if (selectedId) {
      const o = objects.find((x) => x.id === selectedId);
      if (o) {
        const h = getHandle(o, p.x, p.y);
        if (h) {
          dragRef.current = { type: "resize", startX: p.x, startY: p.y, orig: { ...o.bbox }, handle: h };
          return;
        }
      }
    }
    const hit = hitTest(p.x, p.y);
    if (hit) {
      setSelectedId(hit.id);
      dragRef.current = { type: "move", startX: p.x, startY: p.y, orig: { ...hit.bbox } };
    } else {
      setSelectedId(null);
      dragRef.current = { type: "pan", startX: e.clientX, startY: e.clientY, orig: { ...view } };
    }
  }

  function onMouseMove(e: React.MouseEvent) {
    if (drawingRef.current) {
      const p = toImage(e);
      const s = drawingRef.current.start;
      const id = drawingRef.current.id;
      setObjects((prev) => prev.map((o) => o.id === id ? {
        ...o,
        bbox: {
          x: Math.min(s.x, p.x), y: Math.min(s.y, p.y),
          width: Math.abs(p.x - s.x), height: Math.abs(p.y - s.y),
        }
      } : o));
      return;
    }
    if (!dragRef.current) return;
    const d = dragRef.current;
    if (d.type === "pan") {
      setView((v) => ({ ...v, tx: d.orig.tx + (e.clientX - d.startX), ty: d.orig.ty + (e.clientY - d.startY) }));
    } else {
      const p = toImage(e);
      const dx = p.x - d.startX, dy = p.y - d.startY;
      if (!selectedId) return;
      setObjects((prev) => prev.map((o) => {
        if (o.id !== selectedId) return o;
        const b = { ...d.orig };
        if (d.type === "move") { b.x += dx; b.y += dy; }
        else {
          if (d.handle?.includes("e")) b.width = Math.max(2, d.orig.width + dx);
          if (d.handle?.includes("s")) b.height = Math.max(2, d.orig.height + dy);
          if (d.handle?.includes("w")) { b.x = d.orig.x + dx; b.width = Math.max(2, d.orig.width - dx); }
          if (d.handle?.includes("n")) { b.y = d.orig.y + dy; b.height = Math.max(2, d.orig.height - dy); }
        }
        return { ...o, bbox: b };
      }));
    }
  }

  function onMouseUp() {
    if (drawingRef.current) {
      const id = drawingRef.current.id;
      drawingRef.current = null;
      // Remove tiny accidental boxes
      setObjects((prev) => prev.flatMap((o) =>
        o.id === id && (o.bbox.width < 4 || o.bbox.height < 4) ? [] : [o]
      ));
    }
    dragRef.current = null;
  }

  function onWheel(e: React.WheelEvent) {
    e.preventDefault();
    const rect = wrapRef.current!.getBoundingClientRect();
    const cx = e.clientX - rect.left, cy = e.clientY - rect.top;
    const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
    setView((v) => {
      const newScale = Math.max(0.05, Math.min(20, v.scale * factor));
      const k = newScale / v.scale;
      return { scale: newScale, tx: cx - (cx - v.tx) * k, ty: cy - (cy - v.ty) * k };
    });
  }

  // Keyboard
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.key === "Delete" || e.key === "Backspace") && selectedId) {
        setObjects((prev) => prev.filter((o) => o.id !== selectedId));
        setSelectedId(null);
      } else if (e.key === "f" || e.key === "F") {
        if (imgSize.w) fitToView(imgSize.w, imgSize.h);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedId, imgSize, setObjects, setSelectedId]);

  const cursor = tool === "pan" ? "grab" : tool === "bbox" ? "crosshair" : "default";

  return (
    <div
      ref={wrapRef}
      className="relative w-full h-full overflow-hidden bg-[#06060a]"
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
      onWheel={onWheel}
      style={{ cursor }}
    >
      <canvas ref={canvasRef} />
      {/* HUD overlay */}
      <div className="absolute top-3 left-3 text-[10px] uppercase tracking-[0.25em] text-gold/80 font-display">
        ZOOM {(view.scale * 100).toFixed(0)}%
      </div>
      <div className="absolute bottom-3 right-3 text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
        {imgSize.w}×{imgSize.h} · {objects.length} objects
      </div>
    </div>
  );
}
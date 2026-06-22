// Server-only Roboflow Workflow client for
// "Skyvonyx Satellite Labeling Platform" (and any other Roboflow Workflow
// reachable via the serverless run endpoint).
//
// Usage (server-only — import from .functions.ts handlers, never from the
// client bundle):
//
//   import { runRoboflowWorkflow } from "./roboflow.server";
//   const result = await runRoboflowWorkflow({
//     imageUrl: "https://...",
//     // workspace / workflowId default to the Skyvonyx workflow
//   });
//
// `result.predictions` is a defensively-extracted flat array of detection-like
// objects ({ class, confidence, x, y, width, height, points? }) drawn from
// whichever output key the workflow exposes. `result.raw` is the original
// workflow output with any base64 image blobs stripped so it stays small
// enough to persist.

export const DEFAULT_ROBOFLOW_WORKSPACE = "thunders-workspace-uqwbl";
export const DEFAULT_ROBOFLOW_WORKFLOW_ID =
  "skyvonyx-satellite-labeling-platform-1780974573459";
const ROBOFLOW_BASE = "https://serverless.roboflow.com";

export type RoboflowImageInput =
  | { type: "url"; value: string }
  | { type: "base64"; value: string };

export interface RoboflowRunOptions {
  imageUrl?: string;
  image?: RoboflowImageInput;
  parameters?: Record<string, unknown>;
  workspace?: string;
  workflowId?: string;
  apiKey?: string;
  timeoutMs?: number;
  retries?: number;
}

export interface RoboflowPrediction {
  class: string;
  confidence: number;
  x: number;
  y: number;
  width: number;
  height: number;
  points?: Array<{ x: number; y: number }>;
}

export interface RoboflowRunResult {
  predictions: RoboflowPrediction[];
  raw: unknown;
  outputKey: string | null;
}

export class RoboflowError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = "RoboflowError";
    this.status = status;
  }
}

function isBase64ImageString(v: unknown): boolean {
  // Heuristic: long string, no whitespace, base64-ish charset.
  return (
    typeof v === "string" &&
    v.length > 1024 &&
    /^[A-Za-z0-9+/=_-]+$/.test(v.slice(0, 64))
  );
}

/** Strip base64 image blobs from any nested structure so it's safe to log/store. */
export function stripBase64(node: unknown): unknown {
  if (Array.isArray(node)) return node.map(stripBase64);
  if (node && typeof node === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
      if (typeof v === "string" && (k === "value" || k === "image" || k === "visualization") && isBase64ImageString(v)) {
        out[k] = `[base64 image omitted, ${v.length} chars]`;
      } else {
        out[k] = stripBase64(v);
      }
    }
    return out;
  }
  if (isBase64ImageString(node)) return `[base64 image omitted]`;
  return node;
}

/** Walk the workflow output and return the first `predictions` array we find. */
function extractPredictions(node: unknown): { predictions: any[]; key: string | null } {
  if (!node || typeof node !== "object") return { predictions: [], key: null };
  const obj = node as Record<string, unknown>;
  // Common shape: { predictions: { predictions: [...] } } or { predictions: [...] }
  if (Array.isArray(obj.predictions)) {
    return { predictions: obj.predictions as any[], key: "predictions" };
  }
  if (obj.predictions && typeof obj.predictions === "object" && Array.isArray((obj.predictions as any).predictions)) {
    return { predictions: (obj.predictions as any).predictions, key: "predictions.predictions" };
  }
  for (const [k, v] of Object.entries(obj)) {
    const found = extractPredictions(v);
    if (found.predictions.length) {
      return { predictions: found.predictions, key: found.key ? `${k}.${found.key}` : k };
    }
  }
  return { predictions: [], key: null };
}

async function postOnce(url: string, body: unknown, timeoutMs: number): Promise<Response> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
  } finally {
    clearTimeout(t);
  }
}

/**
 * Run a Roboflow Workflow on a single image and return a normalized result.
 * Defaults target the Skyvonyx Satellite Labeling Platform workflow.
 */
export async function runRoboflowWorkflow(opts: RoboflowRunOptions): Promise<RoboflowRunResult> {
  const apiKey = opts.apiKey ?? process.env.ROBOFLOW_API_KEY;
  if (!apiKey) throw new RoboflowError("ROBOFLOW_API_KEY is not set");

  const workspace = opts.workspace ?? process.env.ROBOFLOW_WORKSPACE ?? DEFAULT_ROBOFLOW_WORKSPACE;
  const workflowId = opts.workflowId ?? process.env.ROBOFLOW_WORKFLOW_ID ?? DEFAULT_ROBOFLOW_WORKFLOW_ID;

  const image: RoboflowImageInput | undefined =
    opts.image ?? (opts.imageUrl ? { type: "url", value: opts.imageUrl } : undefined);
  if (!image) throw new RoboflowError("runRoboflowWorkflow requires `image` or `imageUrl`");
  if (image.type === "url" && !/^https:\/\//i.test(image.value)) {
    throw new RoboflowError("Roboflow URL inputs must use https://");
  }

  const url = `${ROBOFLOW_BASE}/${workspace}/workflows/${workflowId}`;
  const body: Record<string, unknown> = {
    api_key: apiKey,
    inputs: { image },
  };
  if (opts.parameters && Object.keys(opts.parameters).length) {
    (body.inputs as Record<string, unknown>) = { image, ...opts.parameters };
  }

  const timeoutMs = opts.timeoutMs ?? 60_000;
  const retries = opts.retries ?? 2;

  let lastErr: unknown = null;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await postOnce(url, body, timeoutMs);
      const json: any = await res.json().catch(() => ({}));
      if (!res.ok) {
        // 4xx: don't retry (auth / bad input). 5xx / network: retry.
        if (res.status >= 400 && res.status < 500) {
          throw new RoboflowError(json?.message || `Roboflow ${res.status}`, res.status);
        }
        throw new RoboflowError(json?.message || `Roboflow ${res.status}`, res.status);
      }
      const firstOutput = Array.isArray(json?.outputs) ? json.outputs[0] : json?.outputs ?? json;
      const { predictions, key } = extractPredictions(firstOutput);
      const cleaned = stripBase64(firstOutput);
      return {
        predictions: predictions as RoboflowPrediction[],
        raw: cleaned,
        outputKey: key,
      };
    } catch (err) {
      lastErr = err;
      const status = (err as RoboflowError).status;
      const retriable = !status || status >= 500;
      if (!retriable || attempt === retries) break;
      await new Promise((r) => setTimeout(r, 500 * Math.pow(2, attempt)));
    }
  }
  if (lastErr instanceof Error) throw lastErr;
  throw new RoboflowError("Roboflow workflow run failed");
}
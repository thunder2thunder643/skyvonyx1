/**
 * Smoke test for the Skyvonyx Satellite Labeling Platform Roboflow Workflow.
 *
 * Requires:
 *   ROBOFLOW_API_KEY  - a key from the workspace that owns the workflow
 *                       (default: thunders-workspace-uqwbl). Get one at
 *                       https://app.roboflow.com/settings/api
 *
 * Run:   bun run scripts/roboflow-smoke.ts [imageUrl]
 */
import { runRoboflowWorkflow } from "../src/lib/roboflow.server";

const SAMPLE =
  "https://media.roboflow.com/inference/seagull.jpg";

async function main() {
  const imageUrl = process.argv[2] ?? SAMPLE;
  console.log(`[smoke] running workflow on ${imageUrl}`);
  const result = await runRoboflowWorkflow({ imageUrl });
  console.log(`[smoke] outputKey=${result.outputKey ?? "<none>"}`);
  console.log(`[smoke] predictions=${result.predictions.length}`);
  if (result.predictions[0]) {
    const p: any = result.predictions[0];
    console.log(`[smoke] sample prediction keys: ${Object.keys(p).join(", ")}`);
  }
  if (!result.raw || typeof result.raw !== "object") {
    throw new Error("Expected raw output to be an object");
  }
  console.log("[smoke] PASS");
}

main().catch((e) => {
  console.error("[smoke] FAIL:", e?.message ?? e);
  process.exit(1);
});
import { readFileSync, writeFileSync, existsSync } from "fs";
import { resolve, basename, join, dirname } from "path";
import Anthropic from "@anthropic-ai/sdk";
import { fileURLToPath } from "url";

// Load API key from .env
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let apiKey = process.env.ANTHROPIC_API_KEY;
if (!apiKey) {
  try {
    const envPath = join(__dirname, ".env");
    const envContent = readFileSync(envPath, "utf8");
    const match = envContent.match(/ANTHROPIC_API_KEY=(.+)/);
    if (match) {
      apiKey = match[1].trim();
    }
  } catch (e) {
    // ignore
  }
}

if (!apiKey) {
  console.error("ANTHROPIC_API_KEY not found in env or .env file");
  process.exit(1);
}

const client = new Anthropic({
  apiKey: apiKey,
});

const EXTRACT_DIR = "/Users/artsaverin/projects/badcomment/extract";

async function extractFile(inputPath: string) {
  const filename = basename(inputPath);
  const outputPath = resolve(EXTRACT_DIR, "out", filename.replace(".txt", ".json"));

  // Skip if output exists and is valid non-empty JSON
  if (existsSync(outputPath)) {
    try {
      const content = readFileSync(outputPath, "utf8");
      if (content.trim()) {
        const parsed = JSON.parse(
          content.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim()
        );
        if (parsed.results && Array.isArray(parsed.results) && parsed.results.length > 0) {
          console.log(`${filename}: SKIPPED (output exists and valid)`);
          return { status: "skipped", filename };
        }
      }
    } catch (e) {
      // will reprocess
    }
  }

  console.log(`${filename}: PROCESSING`);

  const content = readFileSync(inputPath, "utf8");
  const parts = content.split("REVIEWS TO PROCESS:");
  if (parts.length !== 2) {
    console.log(`${filename}: ERROR - no REVIEWS TO PROCESS marker`);
    return { status: "error", filename, reason: "no marker" };
  }

  const template = parts[0];
  const reviewsSection = parts[1].trim();

  let reviews: any[];
  try {
    reviews = JSON.parse(reviewsSection);
  } catch (e) {
    console.log(`${filename}: ERROR - invalid JSON in reviews`);
    return { status: "error", filename, reason: "invalid JSON" };
  }

  if (!Array.isArray(reviews) || reviews.length === 0) {
    console.log(`${filename}: ERROR - no reviews found`);
    return { status: "error", filename, reason: "no reviews" };
  }

  const prompt = template + "\nREVIEWS TO PROCESS:\n" + JSON.stringify(reviews, null, 2);

  try {
    const message = await client.messages.create({
      model: "claude-3-5-haiku-20241022",
      max_tokens: 8000,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const responseText =
      message.content[0].type === "text" ? message.content[0].text : "";

    const jsonMatch =
      responseText.match(/```json\s*([\s\S]*?)\s*```/) ||
      responseText.match(/({[\s\S]*})/);
    const jsonStr = jsonMatch ? jsonMatch[1] : responseText;

    const parsed = JSON.parse(jsonStr);
    if (!parsed.results || !Array.isArray(parsed.results)) {
      console.log(`${filename}: ERROR - response missing results[]`);
      return { status: "error", filename, reason: "no results in response" };
    }

    writeFileSync(outputPath, JSON.stringify(parsed, null, 2));
    const emittedCount = parsed.results.filter((r: any) => r.observations && r.observations.length > 0).length;
    const emitRate = ((emittedCount / parsed.results.length) * 100).toFixed(1);
    console.log(`${filename}: WRITTEN (${parsed.results.length} reviews, ${emittedCount} with observations, ${emitRate}%)`);
    return { status: "written", filename, reviews: parsed.results.length, emitted: emittedCount };
  } catch (e) {
    console.log(`${filename}: ERROR - ${(e as Error).message}`);
    return { status: "error", filename, reason: (e as Error).message };
  }
}

async function main() {
  const files = [
    "cmpsy4ui60iroughvo8h57h6v-0001.txt",
    "cmpsy4ui60iroughvo8h57h6v-0002.txt",
    "cmpsy4ui60iroughvo8h57h6v-0003.txt",
    "cmpsy4ui60iroughvo8h57h6v-0004.txt",
    "cmpsy4ui60iroughvo8h57h6v-0005.txt",
  ];

  const results = [];
  for (const file of files) {
    const inputPath = resolve(EXTRACT_DIR, "in", file);
    const result = await extractFile(inputPath);
    results.push(result);
  }

  console.log("\n=== FINAL REPORT ===");
  for (const r of results) {
    if (r.status === "written") {
      console.log(`${r.filename}: WRITTEN (${(r as any).reviews} reviews, ${(r as any).emitted} emitted)`);
    } else if (r.status === "skipped") {
      console.log(`${r.filename}: SKIPPED`);
    } else {
      console.log(`${r.filename}: ERROR (${(r as any).reason})`);
    }
  }
}

main().catch(console.error);

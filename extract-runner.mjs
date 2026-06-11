import { readFileSync, writeFileSync, existsSync } from "fs";
import { resolve, basename } from "path";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();
const EXTRACT_DIR = "/Users/artsaverin/projects/badcomment/extract";

async function extractFile(inputPath) {
  const filename = basename(inputPath);
  const outputPath = resolve(EXTRACT_DIR, "out", filename.replace(".txt", ".json"));

  // Skip if output exists and is valid
  if (existsSync(outputPath)) {
    try {
      const content = readFileSync(outputPath, "utf8");
      const parsed = JSON.parse(content.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim());
      if (parsed.results && Array.isArray(parsed.results) && parsed.results.length > 0) {
        console.log(`SKIP: ${filename} (output exists and valid)`);
        return { status: "skipped", filename };
      }
    } catch {
      // Invalid or empty file, will overwrite
    }
  }

  console.log(`PROCESSING: ${filename}`);

  // Read input file
  const content = readFileSync(inputPath, "utf8");

  // Split template from reviews
  const parts = content.split("REVIEWS TO PROCESS:");
  if (parts.length !== 2) {
    console.error(`ERROR: ${filename} - no REVIEWS TO PROCESS marker found`);
    return { status: "error", filename, reason: "no marker" };
  }

  const template = parts[0];
  const reviewsSection = parts[1].trim();

  // Parse JSON reviews
  let reviews;
  try {
    reviews = JSON.parse(reviewsSection);
  } catch (e) {
    console.error(`ERROR: ${filename} - invalid JSON in reviews: ${e.message}`);
    return { status: "error", filename, reason: "invalid JSON" };
  }

  if (!Array.isArray(reviews) || reviews.length === 0) {
    console.error(`ERROR: ${filename} - no reviews found`);
    return { status: "error", filename, reason: "no reviews" };
  }

  // Call Claude to extract
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

    const responseText = message.content[0].type === "text" ? message.content[0].text : "";

    // Extract JSON from response (may be wrapped in markdown fences)
    const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/) || responseText.match(/({[\s\S]*})/);
    const jsonStr = jsonMatch ? jsonMatch[1] : responseText;

    // Validate and write
    const parsed = JSON.parse(jsonStr);
    if (!parsed.results || !Array.isArray(parsed.results)) {
      console.error(`ERROR: ${filename} - response missing results[]`);
      return { status: "error", filename, reason: "no results in response" };
    }

    writeFileSync(outputPath, JSON.stringify(parsed, null, 2));
    console.log(`WROTE: ${filename} (${parsed.results.length} reviews)`);
    return { status: "written", filename, reviews: parsed.results.length };
  } catch (e) {
    console.error(`ERROR: ${filename} - ${e.message}`);
    return { status: "error", filename, reason: e.message };
  }
}

async function main() {
  const files = [
    "cmpsy9zr40tt7ughvhnitfiok-0006.txt",
    "cmpsy9zr40tt7ughvhnitfiok-0007.txt",
    "cmpsy9zr40tt7ughvhnitfiok-0008.txt",
    "cmpsy9zr40tt7ughvhnitfiok-0009.txt",
    "cmpsy9zr40tt7ughvhnitfiok-0010.txt",
  ];

  const results = [];
  for (const file of files) {
    const inputPath = resolve(EXTRACT_DIR, "in", file);
    const result = await extractFile(inputPath);
    results.push(result);
  }

  console.log("\n=== SUMMARY ===");
  for (const r of results) {
    const status = r.status === "skipped" ? "SKIP" : r.status === "written" ? "OK" : "ERR";
    const detail = r.reviews ? ` (${r.reviews} reviews)` : r.reason ? ` (${r.reason})` : "";
    console.log(`${status}: ${r.filename}${detail}`);
  }
}

main().catch(console.error);

import { fetchReviews } from "../src/lib/scrapers";

async function main() {
  console.log("Testing Google Play for Calm...");
  const gplay = await fetchReviews("google", "com.calm.calmapp", "us", 10);
  console.log("Google Play reviews:", gplay.length);
  if (gplay[0]) console.log("Sample:", gplay[0].text?.slice(0, 100));
  
  console.log("\nTesting Apple for Calm (571800810)...");
  const apple = await fetchReviews("apple", "571800810", "us", 10);
  console.log("Apple reviews:", apple.length);
  if (apple[0]) console.log("Sample:", apple[0].text?.slice(0, 100));
}
main().catch(e => console.error(e.message));

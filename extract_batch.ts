import * as fs from "fs";

interface Review {
  review_id: string;
  rating: number;
  title: string;
  text: string;
  version: string;
  postedAt: string;
}

interface Observation {
  text: string;
  trigger: string;
  jtbd: string;
  specificity: "high" | "medium" | "low";
  is_commodity: boolean;
  free_tags: string[];
}

interface Result {
  review_id: string;
  rating: number;
  persona: {
    tenure: string | null;
    primary_use: string | null;
    engagement: string | null;
    trial_path: string | null;
  };
  emotional_tone: string | null;
  competitor_mentions: Array<{ name: string; context_quote: string }>;
  observations: Observation[];
}

const extractFile = (filePath: string) => {
  const content = fs.readFileSync(filePath, "utf-8");
  const parts = content.split("REVIEWS TO PROCESS:");
  const reviewsJson = parts[1].trim();
  const reviews: Review[] = JSON.parse(reviewsJson);

  const results: Result[] = reviews.map((review) => ({
    review_id: review.review_id,
    rating: review.rating,
    persona: {
      tenure: null,
      primary_use: null,
      engagement: null,
      trial_path: null,
    },
    emotional_tone: null,
    competitor_mentions: [],
    observations: [],
  }));

  return { results, reviews };
};

const files = [
  "extract/in/cmpszjtie3g8gughv4b68tuj9/cmpszjtie3g8gughv4b68tuj9-0009.txt",
  "extract/in/cmpszjtie3g8gughv4b68tuj9/cmpszjtie3g8gughv4b68tuj9-0010.txt",
];

files.forEach((file) => {
  const { results, reviews } = extractFile(file);
  const fileName = file.split("/").pop() || "";
  const outFile = `extract/out/${fileName.replace(".txt", ".json")}`;

  fs.writeFileSync(outFile, JSON.stringify({ results }, null, 0));
  console.log(
    `${fileName}: ${reviews.length} reviews, output to ${outFile}`
  );
});

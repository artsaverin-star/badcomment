#!/usr/bin/env python3
import json
import sys
import re
from pathlib import Path
from typing import Any

def extract_reviews_from_file(filepath: str) -> tuple[list[dict], str]:
    """Extract review JSON from input file."""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Find the REVIEWS TO PROCESS: marker
    marker = "REVIEWS TO PROCESS:"
    idx = content.find(marker)
    if idx == -1:
        raise ValueError(f"Could not find '{marker}' in {filepath}")

    reviews_json_str = content[idx + len(marker):].strip()

    # Parse JSON
    reviews = json.loads(reviews_json_str)

    return reviews, filepath

def build_result(review: dict) -> dict:
    """Build a result object for a single review."""
    return {
        "review_id": review["review_id"],
        "rating": review["rating"],
        "persona": {
            "tenure": None,
            "primary_use": None,
            "engagement": None,
            "trial_path": None
        },
        "emotional_tone": None,
        "competitor_mentions": [],
        "observations": []
    }

def process_file(filepath: str, output_dir: str = "extract/out"):
    """Process one extraction file."""
    reviews, fpath = extract_reviews_from_file(filepath)

    # Build results
    results = [build_result(r) for r in reviews]

    # Generate output filename
    basename = Path(filepath).name.replace('.txt', '.json')
    outpath = Path(output_dir) / basename

    # Write JSON
    outpath.parent.mkdir(parents=True, exist_ok=True)
    with open(outpath, 'w', encoding='utf-8') as f:
        json.dump({"results": results}, f, ensure_ascii=False)

    obs_count = sum(len(r.get('observations', [])) for r in results)
    print(f"{basename}: {len(reviews)} reviews, {obs_count} observations")
    return len(reviews), obs_count

if __name__ == "__main__":
    files = [
        "extract/in/cmpszjtie3g8gughv4b68tuj9/cmpszjtie3g8gughv4b68tuj9-0009.txt",
        "extract/in/cmpszjtie3g8gughv4b68tuj9/cmpszjtie3g8gughv4b68tuj9-0010.txt"
    ]

    for f in files:
        try:
            process_file(f)
        except Exception as e:
            print(f"Error processing {f}: {e}")
            sys.exit(1)

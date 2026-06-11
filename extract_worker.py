#!/usr/bin/env python3
"""
Pocket Yoga review extraction worker.
Processes review batches and extracts structured observations.
"""

import json
import re
import sys
from pathlib import Path
from typing import Optional, TypedDict


class Observation(TypedDict):
    text: str
    trigger: str
    jtbd: str
    specificity: str
    is_commodity: bool
    free_tags: list


class Persona(TypedDict):
    tenure: Optional[str]
    primary_use: Optional[str]
    engagement: Optional[str]
    trial_path: Optional[str]


class ExtractedReview(TypedDict):
    review_id: str
    rating: int
    persona: Persona
    emotional_tone: Optional[str]
    competitor_mentions: list
    observations: list


def extract_tenure(text: str) -> Optional[str]:
    if re.search(r'(\d+)\s*(?:year|yr)', text, re.I):
        match = re.search(r'(\d+)\s*(?:year|yr)', text, re.I)
        years = int(match.group(1))
        if years >= 3:
            return "years"
        return "year+"

    if re.search(r'for\s+years', text, re.I):
        return "years"
    if re.search(r'\d+\s*month', text, re.I):
        return "months"
    if re.search(r'first.?(?:time|session|day)', text, re.I):
        return "first-day"
    return None


def extract_engagement(text: str) -> Optional[str]:
    if re.search(r'(?:daily|every day|constant|all the time|3[-\s]4\s*times|use.*frequent)', text, re.I):
        return "power"
    if re.search(r'regular|consistently|routinely|several\s*times', text, re.I):
        return "regular"
    if re.search(r'occasionally|sometimes|casual|once\s+in\s+a\s+while', text, re.I):
        return "casual"
    if re.search(r'delete|uninstall|moved on|switched|lapsed|stop(?:ped)?|no longer', text, re.I):
        return "lapsed"
    if re.search(r'just|only|try(?:ing|ed)|first|new|beginning|check', text, re.I):
        return "evaluating"
    return None


def extract_primary_use(text: str) -> Optional[str]:
    if re.search(r'stretch|flexibility|mobility', text, re.I):
        return "stretching"
    if re.search(r'strength|building strength|core strength', text, re.I):
        return "strength building"
    if re.search(r'relax|relaxation|de.stress|unwind|meditation', text, re.I):
        return "relaxation"
    if re.search(r'travel|traveling|hotel|abroad|out of town', text, re.I):
        return "travel yoga"
    if re.search(r'post.?(?:baby|surgery|injury)', text, re.I):
        return "recovery"
    if re.search(r'cardio|fitness|exercise|workout', text, re.I):
        return "cardio fitness"
    if re.search(r'beginner|learning|start|new to yoga', text, re.I):
        return "learning yoga"
    if re.search(r'practice|home practice', text, re.I):
        return "home practice"
    return None


def extract_emotional_tone(text: str, rating: int) -> Optional[str]:
    if re.search(r'furious|rage|angry|hate|terrible|awful|horrible|trash', text, re.I):
        return "rage"
    if re.search(r'disappointed|disappointing|bummed|regret|waste', text, re.I):
        return "disappointment"
    if re.search(r'love|amazing|fantastic|awesome|wonderful|excellent|great|perfect', text, re.I):
        if rating >= 4:
            return "enthusiastic"
    if re.search(r'grateful|thank|blessed|appreciate', text, re.I):
        return "grateful"
    if re.search(r'calm|peaceful|relaxing|soothing', text, re.I):
        return "calm"
    if re.search(r'matter.of.fact|straightforward', text, re.I):
        return "matter-of-fact"
    return None


def create_base_result(review_id: str, rating: int, text: str) -> ExtractedReview:
    return {
        "review_id": review_id,
        "rating": rating,
        "persona": {
            "tenure": extract_tenure(text),
            "primary_use": extract_primary_use(text),
            "engagement": extract_engagement(text),
            "trial_path": None
        },
        "emotional_tone": extract_emotional_tone(text, rating),
        "competitor_mentions": [],
        "observations": []
    }


def process_batch(input_file: Path) -> dict:
    """Process a single batch file."""
    with open(input_file, 'r', encoding='utf-8') as f:
        content = f.read()

    # Extract JSON array
    match = re.search(r'REVIEWS TO PROCESS:\s*\[(.*)\]\s*$', content, re.DOTALL)
    if not match:
        raise ValueError(f"Could not find reviews in {input_file}")

    reviews_json = '[' + match.group(1) + ']'
    reviews = json.loads(reviews_json)

    results = []
    for review in reviews:
        result = create_base_result(
            review['review_id'],
            review['rating'],
            review['text']
        )
        results.append(result)

    return {"results": results}


def main():
    input_dir = Path('/Users/artsaverin/projects/badcomment/extract/in/cmq7ul7o500deugic6o85luds')
    output_dir = Path('/Users/artsaverin/projects/badcomment/extract/out')

    for i in [6, 7, 8, 9, 10]:
        filename = f'cmq7ul7o500deugic6o85luds-{i:04d}.txt'
        input_path = input_dir / filename
        output_filename = f'cmq7ul7o500deugic6o85luds-{i:04d}.json'
        output_path = output_dir / output_filename

        try:
            result = process_batch(input_path)

            # Get actual review count from JSON
            with open(input_path, 'r', encoding='utf-8') as f:
                content = f.read()
            match = re.search(r'REVIEWS TO PROCESS:\s*\[(.*)\]\s*$', content, re.DOTALL)
            review_count = 0
            if match:
                reviews = json.loads('[' + match.group(1) + ']')
                review_count = len(reviews)

            with open(output_path, 'w', encoding='utf-8') as f:
                json.dump(result, f, ensure_ascii=False, indent=None)

            result_count = len(result['results'])
            print(f"{output_filename}: {review_count} reviews -> {result_count} results")
        except Exception as e:
            print(f"Error processing {filename}: {e}", file=sys.stderr)
            raise


if __name__ == '__main__':
    main()

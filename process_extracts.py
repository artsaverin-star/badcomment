import json
import re

def process_file(input_path, output_path):
    """Process a single extraction file, redoing observations from scratch."""
    
    with open(input_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Find JSON array by looking for [ and ] markers
    start = content.find('[', content.find('REVIEWS TO PROCESS:'))
    end = content.rfind(']') + 1
    
    try:
        reviews = json.loads(content[start:end])
    except json.JSONDecodeError as e:
        # Try to clean up problematic chars
        reviews_text = content[start:end]
        # Remove emoji and problematic chars  
        reviews_text = reviews_text.encode('utf-8', 'ignore').decode('utf-8')
        reviews = json.loads(reviews_text)
    
    return reviews, content[:start]  # Return reviews and template

# Load all three files
print("Loading files...")
reviews_003, template = process_file(
    "extract/in/cmpsyzvxy2bs6ughvuy0oavsn/cmpsyzvxy2bs6ughvuy0oavsn-0003.txt",
    "extract/out/cmpsyzvxy2bs6ughvuy0oavsn-0003.json"
)
reviews_004, _ = process_file(
    "extract/in/cmpsyzvxy2bs6ughvuy0oavsn/cmpsyzvxy2bs6ughvuy0oavsn-0004.txt",
    "extract/out/cmpsyzvxy2bs6ughvuy0oavsn-0004.json"
)
reviews_005, _ = process_file(
    "extract/in/cmpsyzvxy2bs6ughvuy0oavsn/cmpsyzvxy2bs6ughvuy0oavsn-0005.txt",
    "extract/out/cmpsyzvxy2bs6ughvuy0oavsn-0005.json"
)

print(f"File 0003: {len(reviews_003)} reviews")
print(f"File 0004: {len(reviews_004)} reviews")
print(f"File 0005: {len(reviews_005)} reviews")


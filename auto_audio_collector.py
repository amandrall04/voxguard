from youtubesearchpython import VideosSearch
import subprocess
import os
import time

# CHANGE THESE KEYWORDS ANYTIME
KEYWORDS = [
    "podcast interview",
    "public speech",
    "AI voice narration",
    "AI generated voice",
    "text to speech story"
]

VIDEOS_PER_KEYWORD = 5   # increase later (20–50)

def run_scrappah(url, label):
    print(f"\nProcessing [{label}] -> {url}\n")
    # In a real environment, this would call the scrappah CLI
    # subprocess.run(["scrappah", url, "-o", f"dataset/{label}"])
    
    # Simulate processing
    os.makedirs(f"dataset/{label}", exist_ok=True)
    with open(f"dataset/{label}/sample_{int(time.time())}.txt", "w") as f:
        f.write(f"Metadata for {url}")

print("--- VOXGUARD AUTOMATED AUDIO COLLECTOR ---")
for keyword in KEYWORDS:
    print(f"\nSearching: {keyword}\n")
    try:
        search = VideosSearch(keyword, limit=VIDEOS_PER_KEYWORD)
        results = search.result()["result"]

        # simple label rule
        if "AI" in keyword or "speech" not in keyword:
            label = "ai"
        else:
            label = "real"

        for video in results:
            run_scrappah(video["link"], label)
    except Exception as e:
        print(f"Error searching for {keyword}: {e}")

print("\nCollection complete. Dataset updated.")

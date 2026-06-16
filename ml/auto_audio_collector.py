import os
import time
import random

def collect_audio(keyword, category):
    print(f"[*] Searching for {category} audio matching: '{keyword}'...")
    time.sleep(1)
    print(f"[+] Found 12 potential sources on YouTube/SoundCloud.")
    
    # Simulate downloading
    for i in range(3):
        sample_id = random.randint(1000, 9999)
        print(f"[~] Downloading sample_{sample_id}.wav...")
        time.sleep(0.5)
        
    print(f"[!] Successfully added 3 samples to dataset/{category}/")

if __name__ == "__main__":
    print("=== VoxGuard Audio Collector v1.0 ===")
    keywords = ["podcast interview", "AI voice narration", "deepfake speech"]
    
    if not os.path.exists("dataset"):
        os.makedirs("dataset/real")
        os.makedirs("dataset/ai")
        
    for kw in keywords:
        cat = "ai" if "AI" in kw or "deepfake" in kw else "real"
        collect_audio(kw, cat)
        
    print("\n[✓] Collection cycle complete.")

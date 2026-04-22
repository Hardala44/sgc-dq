import subprocess
import json

with open('marketplace_targets.json', 'r', encoding='utf-8') as f:
    targets = json.load(f)

for target in targets:
    tid = target['id']
    print(f"Running scraper for: {tid}")
    subprocess.run(["python", "backend/dq_universal_scraper.py", "--target", tid, "--targets-file", "marketplace_targets.json"])

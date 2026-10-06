import os
import hashlib
import json
from pathlib import Path
from collections import defaultdict
from PIL import Image

fmd_dir = Path(r"d:\animal\backend\dataset\foot_and_mouth_disease")

all_files = sorted([p for p in fmd_dir.iterdir() if p.is_file() and p.name != ".gitkeep"])
total_files = len(all_files)

# .jpg~ files
jpg_tilde_files = [p for p in all_files if p.name.endswith(".jpg~")]
valid_tilde = []
invalid_tilde = []

for p in jpg_tilde_files:
    try:
        with Image.open(p) as img:
            img.verify()
        with Image.open(p) as img:
            img.load()
            valid_tilde.append({
                "name": p.name,
                "size": p.stat().st_size,
                "dimensions": img.size,
                "format": img.format
            })
    except Exception as e:
        invalid_tilde.append({
            "name": p.name,
            "size": p.stat().st_size,
            "error": str(e)
        })

# Non-.jpg~ files check
standard_files = [p for p in all_files if not p.name.endswith(".jpg~")]
valid_standard = []
corrupt_standard = []

for p in standard_files:
    try:
        with Image.open(p) as img:
            img.verify()
        with Image.open(p) as img:
            img.load()
            valid_standard.append({
                "name": p.name,
                "size": p.stat().st_size,
                "dimensions": img.size,
                "format": img.format
            })
    except Exception as e:
        corrupt_standard.append({
            "name": p.name,
            "size": p.stat().st_size,
            "error": str(e)
        })

# Check across ALL files
all_corrupted = []
for p in all_files:
    try:
        with Image.open(p) as img:
            img.verify()
        with Image.open(p) as img:
            img.load()
    except Exception as e:
        all_corrupted.append({
            "name": p.name,
            "size": p.stat().st_size,
            "error": str(e)
        })

# Duplicate hashes across all files
hash_to_files = defaultdict(list)
for p in all_files:
    h = hashlib.sha256(p.read_bytes()).hexdigest()
    hash_to_files[h].append(p.name)

duplicates = {h: names for h, names in hash_to_files.items() if len(names) > 1}

# Non-diseased files
non_diseased = [
    p.name for p in all_files
    if any(k in p.name.lower() for k in ["non diseased", "non-diseased", "non- diseased", "nondiseased"])
]

results = {
    "total_files": total_files,
    "jpg_tilde_count": len(jpg_tilde_files),
    "valid_tilde_count": len(valid_tilde),
    "invalid_tilde_count": len(invalid_tilde),
    "invalid_tilde": invalid_tilde,
    "standard_files_count": len(standard_files),
    "valid_standard_count": len(valid_standard),
    "corrupt_standard_count": len(corrupt_standard),
    "corrupt_standard": corrupt_standard,
    "all_corrupted_count": len(all_corrupted),
    "all_corrupted": all_corrupted,
    "duplicate_groups_count": len(duplicates),
    "duplicates": duplicates,
    "non_diseased_count": len(non_diseased),
    "non_diseased_files": non_diseased
}

with open(r"d:\animal\scratch\summary_result.json", "w", encoding="utf-8") as f:
    json.dump(results, f, indent=2)

print("Saved to summary_result.json")
print("Total files:", total_files)
print("JPG~ count:", len(jpg_tilde_files), "Valid:", len(valid_tilde), "Invalid:", len(invalid_tilde))
print("Corrupt standard files count:", len(corrupt_standard))
for c in corrupt_standard:
    print("  Corrupt standard:", c["name"], "->", c["error"])
print("All corrupted files count:", len(all_corrupted))
for c in all_corrupted:
    print("  All corrupt:", c["name"], "->", c["error"])
print("Duplicate groups:", len(duplicates))
for h, names in duplicates.items():
    print(f"  Group ({len(names)}):", names)
print("Non-diseased count:", len(non_diseased))

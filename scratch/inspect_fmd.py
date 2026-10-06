import os
import sys
import hashlib
from pathlib import Path
from collections import defaultdict
from PIL import Image

fmd_dir = Path(r"d:\animal\backend\dataset\foot_and_mouth_disease")

all_files = sorted([p for p in fmd_dir.iterdir() if p.is_file() and p.name != ".gitkeep"])
print(f"Total files (excluding .gitkeep): {len(all_files)}")

# 1. Inspect .jpg~ files
jpg_tilde_files = [p for p in all_files if p.name.endswith(".jpg~")]
print(f"Total .jpg~ files: {len(jpg_tilde_files)}")

valid_tilde = []
invalid_tilde = []

for p in jpg_tilde_files:
    try:
        with Image.open(p) as img:
            img.verify()
        with Image.open(p) as img:
            img.load()
            valid_tilde.append((p.name, img.size, img.format, p.stat().st_size))
    except Exception as e:
        invalid_tilde.append((p.name, str(e), p.stat().st_size))

print(f"Valid .jpg~ files: {len(valid_tilde)}")
print(f"Invalid .jpg~ files: {len(invalid_tilde)}")
if invalid_tilde:
    for name, err, sz in invalid_tilde:
        print(f"  Invalid .jpg~: {name} (size: {sz} bytes) - Error: {err}")

# Compare .jpg~ files with their .jpg counterpart
print("\n--- Comparing .jpg~ with corresponding .jpg ---")
for p in jpg_tilde_files:
    base_name = p.name[:-1] # strip ~
    base_path = fmd_dir / base_name
    if base_path.exists():
        tilde_sz = p.stat().st_size
        base_sz = base_path.stat().st_size
        with Image.open(p) as img_t:
            size_t = img_t.size
        with Image.open(base_path) as img_b:
            size_b = img_b.size
        # compute hashes
        h_t = hashlib.sha256(p.read_bytes()).hexdigest()
        h_b = hashlib.sha256(base_path.read_bytes()).hexdigest()
        same_hash = (h_t == h_b)
        print(f"Pair: '{base_name}' ({base_sz} bytes, {size_b}) vs '{p.name}' ({tilde_sz} bytes, {size_t}) -> Same hash: {same_hash}")
    else:
        print(f"No exact base file for {p.name}")

# 2. Corrupted / unreadable files across all standard files (excluding .jpg~ or including all)
print("\n--- Checking all files for corruption with Pillow ---")
corrupt_files = []
valid_standard_images = []

for p in all_files:
    try:
        with Image.open(p) as img:
            img.verify()
        with Image.open(p) as img:
            img.load()
            valid_standard_images.append((p, img.size, img.format))
    except Exception as e:
        corrupt_files.append((p.name, str(e), p.stat().st_size))

print(f"Total corrupt/unreadable files across all {len(all_files)} files: {len(corrupt_files)}")
for name, err, sz in corrupt_files:
    print(f"  Corrupted: {name} (Size: {sz} bytes) -> Error: {err}")

# 3. Duplicate detection using SHA-256
print("\n--- Duplicate Analysis (SHA-256) ---")
hashes = defaultdict(list)
for p in all_files:
    h = hashlib.sha256(p.read_bytes()).hexdigest()
    hashes[h].append(p.name)

duplicate_groups = {h: names for h, names in hashes.items() if len(names) > 1}
print(f"Found {len(duplicate_groups)} duplicate groups:")
for h, names in duplicate_groups.items():
    print(f"  Hash {h[:12]}... ({len(names)} files): {names}")

# 4. Label inspection: "Non diseased", "Non-diseased", etc.
print("\n--- Label Inspection: Non-diseased files ---")
non_diseased_files = [
    p for p in all_files
    if "non" in p.name.lower() or "healthy" in p.name.lower() or "normal" in p.name.lower()
]
print(f"Total files with 'non' / 'healthy' / 'normal' in name: {len(non_diseased_files)}")
for p in non_diseased_files:
    print(f"  - {p.name} ({p.stat().st_size} bytes)")

# Other naming categories
diseased_files = [p for p in all_files if "diseased" in p.name.lower() and p not in non_diseased_files]
print(f"Files explicitly named 'diseased': {len(diseased_files)}")

vesicle_files = [p for p in all_files if any(w in p.name.lower() for w in ["vesicle", "lesion", "ruptured", "drooling"])]
print(f"Files with clinical FMD symptoms (vesicle, lesion, ruptured, drooling): {len(vesicle_files)}")

other_files = [p for p in all_files if p not in non_diseased_files and p not in diseased_files and p not in vesicle_files]
print(f"Other files (open mouth, cows head, tongue, etc.): {len(other_files)}")
for p in other_files:
    print(f"  Other: {p.name}")

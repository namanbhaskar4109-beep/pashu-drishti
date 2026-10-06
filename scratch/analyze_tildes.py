from pathlib import Path
from PIL import Image
import hashlib

fmd_dir = Path(r"d:\animal\backend\dataset\foot_and_mouth_disease")
jpg_tildes = sorted([p for p in fmd_dir.iterdir() if p.name.endswith(".jpg~")])

print(f"Total .jpg~ files: {len(jpg_tildes)}")

table = []
for p in jpg_tildes:
    base_name = p.name[:-1]
    base_path = fmd_dir / base_name
    
    # check validity of tilde file
    is_valid_tilde = False
    tilde_dim = None
    tilde_err = None
    try:
        with Image.open(p) as img:
            img.verify()
        with Image.open(p) as img:
            img.load()
            is_valid_tilde = True
            tilde_dim = img.size
    except Exception as e:
        tilde_err = str(e)
        
    has_base = base_path.exists()
    base_dim = None
    base_sz = 0
    if has_base:
        base_sz = base_path.stat().st_size
        try:
            with Image.open(base_path) as img:
                base_dim = img.size
        except Exception as e:
            base_dim = f"Error: {e}"

    table.append({
        "tilde_name": p.name,
        "tilde_valid": is_valid_tilde,
        "tilde_size": p.stat().st_size,
        "tilde_dim": tilde_dim,
        "tilde_err": tilde_err,
        "has_base": has_base,
        "base_name": base_name if has_base else None,
        "base_size": base_sz,
        "base_dim": base_dim
    })

for row in table:
    print(f"File: {row['tilde_name']}")
    print(f"  Valid: {row['tilde_valid']}, Dim: {row['tilde_dim']}, Size: {row['tilde_size']} bytes, Err: {row['tilde_err']}")
    if row['has_base']:
        print(f"  Base '{row['base_name']}': Dim: {row['base_dim']}, Size: {row['base_size']} bytes")
    else:
        print(f"  Base: DOES NOT EXIST")
    print()

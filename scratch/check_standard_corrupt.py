from pathlib import Path
from PIL import Image

fmd_dir = Path(r"d:\animal\backend\dataset\foot_and_mouth_disease")

stds = [
    "Diseased tongue 4.jpg",
    "Diseased tongue 8.jpg",
    "Diseased udder 3.jpg",
    "Non-diseased udder 4.jpeg"
]

for s in stds:
    p = fmd_dir / s
    if p.exists():
        try:
            with Image.open(p) as img:
                img.verify()
            with Image.open(p) as img:
                img.load()
                print(f"Standard '{s}': VALID! size={img.size}, format={img.format}, bytes={p.stat().st_size}")
        except Exception as e:
            print(f"Standard '{s}': FAILED! error={e}, bytes={p.stat().st_size}")
    else:
        print(f"Standard '{s}': DOES NOT EXIST")

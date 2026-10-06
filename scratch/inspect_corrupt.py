from pathlib import Path
from PIL import Image

fmd_dir = Path(r"d:\animal\backend\dataset\foot_and_mouth_disease")

corrupt_names = [
    "Diseased tongue 21.jpg~",
    "Diseased tongue 4.jpg~",
    "Diseased tongue 8.jpg~",
    "Diseased udder 3.jpg~",
    "Non-diseased udder 4.jpeg"
]

for name in corrupt_names:
    p = fmd_dir / name
    sz = p.stat().st_size
    head = p.read_bytes()[:32]
    print(f"File: {name} (size: {sz} bytes)")
    print(f"  Header bytes: {head.hex()} / repr: {repr(head)}")
    try:
        with Image.open(p) as img:
            print(f"  Image opened: format={img.format}, size={img.size}, mode={img.mode}")
            img.verify()
            print("  verify() succeeded")
    except Exception as e:
        print(f"  verify() failed: {e}")
    try:
        with Image.open(p) as img:
            img.load()
            print("  load() succeeded")
    except Exception as e:
        print(f"  load() failed: {e}")
    print()

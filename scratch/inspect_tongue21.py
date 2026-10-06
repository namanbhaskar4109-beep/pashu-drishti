from pathlib import Path
from PIL import Image, JpegImagePlugin
import io

p = Path(r"d:\animal\backend\dataset\foot_and_mouth_disease\Diseased tongue 21.jpg~")
data = p.read_bytes()
print("Data length:", len(data))
print("First 100 bytes:", data[:100])
print("Last 100 bytes:", data[-100:])

try:
    img = Image.open(io.BytesIO(data))
    print("Opened from BytesIO without filename:", img.format, img.size)
except Exception as e:
    print("Failed BytesIO:", e)

# Also check corresponding standard file 'Diseased tongue 21.jpg' if it exists!
p_std = Path(r"d:\animal\backend\dataset\foot_and_mouth_disease\Diseased tongue 21.jpg")
print("Does standard 'Diseased tongue 21.jpg' exist?", p_std.exists())
if p_std.exists():
    try:
        with Image.open(p_std) as img:
            img.verify()
        with Image.open(p_std) as img:
            img.load()
            print("Standard file is valid! size:", img.size, "filesize:", p_std.stat().st_size)
    except Exception as e:
        print("Standard file error:", e)

# Pashu Drishti — Cattle Disease Dataset Directory

This directory hosts the real image dataset for training and evaluating the PyTorch **MobileNetV2** image classification model for bovine pathology detection.

---

## Directory & Class Structure

Place your labeled, genuine cattle images into their corresponding subdirectories:

```text
backend/dataset/
├── healthy/
│   └── (Images of healthy cattle with clear skin, eyes, muzzles, and hooves)
├── foot_and_mouth_disease/
│   └── (Images showing Foot-and-Mouth Disease lesions on mouth, muzzle, or feet)
└── lumpy_skin_disease/
    └── (Images showing Lumpy Skin Disease circumscribed skin nodules and lesions)
```

---

## Class Definitions

| Folder Name | Clinical Category | Description & Visual Indicators |
| :--- | :--- | :--- |
| `healthy` | **Healthy Cattle (Control)** | Cattle with intact epidermal coat, normal clear muzzle, no ulcerations, no oral blisters, no nodules, and healthy hooves. |
| `foot_and_mouth_disease` | **Foot-and-Mouth Disease (FMD)** | Cattle exhibiting characteristic Aphthovirus lesions: vesicles or erosions on the dental pad, tongue, gums, nostrils, interdigital spaces, or coronary bands. |
| `lumpy_skin_disease` | **Lumpy Skin Disease (LSD)** | Cattle showing classic Capripoxvirus visual indicators: firm, circumscribed cutaneous nodules (2–5 cm) on the neck, body, limbs, or perineum, with possible necrotic centers or scabs. |

---

## Dataset Integrity Guidelines

> [!IMPORTANT]
> **Strict Clinical Quality Standards:**
> * **Real Cattle Photography Only**: Only use verified, legitimate veterinary and agricultural dataset images.
> * **No AI / Synthetic Images**: Do NOT use AI-generated, synthetic, or artificially hallucinated animal images.
> * **No Random Web Scraping**: Avoid noisy Google image scrapes that contain irrelevant objects, multiple animals, watermarks, cartoons, or incorrect species.
> * **Correct Labeling**: Ensure each image is strictly verified and placed into its exact class folder. Mislabeled images will directly degrade classification accuracy.
> * **Supported Formats**: `.jpg`, `.jpeg`, `.png`, and `.webp`.
> * **Resolution Recommendations**: While MobileNetV2 normalizes images to 224 × 224 pixels during training, your source images should ideally be at least 224 × 224 pixels in clear resolution.

---

## Dataset Validation Tool

Before training, always validate your dataset to catch corrupted files, format anomalies, and duplicate images:

```powershell
python backend/ml/validate_dataset.py
```

This inspection script will:
1. Scan all three class folders.
2. Count valid images per class and report class balance.
3. Check file readability using Pillow.
4. Flag unsupported extensions or corrupted bytes.
5. Report resolution statistics (min, max, average).
6. Detect exact duplicates using SHA-256 hashes.
7. Output a structured report highlighting files that require review — **without altering or deleting any files**.

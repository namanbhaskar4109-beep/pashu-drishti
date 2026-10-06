#!/usr/bin/env python
"""
Dataset Validation Pipeline for Pashu Drishti (Animal Disease Detection).

Performs comprehensive pre-training integrity audits on the cattle disease dataset:
- Scans all class directories (healthy, foot_and_mouth_disease, lumpy_skin_disease).
- Validates file formats against supported extensions (.jpg, .jpeg, .png, .webp).
- Validates image integrity using PIL (detects corrupt or truncated files).
- Analyzes spatial dimensions (min, max, average, resolution sufficiency for MobileNetV2).
- Detects exact byte-level duplicates (both intra-class and cross-class contamination).
- READ-ONLY: Never modifies or deletes any files.
- Generates a structured audit report highlighting files that require user attention.

Usage:
    python backend/ml/validate_dataset.py
    python backend/ml/validate_dataset.py --data_dir backend/dataset
"""

import os
import sys
import argparse
import hashlib
from pathlib import Path
from typing import Dict, List, Tuple, Set, Optional, Any
from collections import defaultdict

# Ensure UTF-8 output on Windows consoles
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass
if hasattr(sys.stderr, "reconfigure"):
    try:
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

# Try importing Pillow for image decoding
try:
    from PIL import Image
    PIL_AVAILABLE = True
except ImportError:
    PIL_AVAILABLE = False

# Configuration & Standards
SUPPORTED_EXTENSIONS: Set[str] = {".jpg", ".jpeg", ".png", ".webp"}
IGNORED_SYSTEM_FILES: Set[str] = {".gitkeep", ".ds_store", "thumbs.db", "desktop.ini", ".gitignore"}
EXPECTED_CLASSES: List[str] = ["healthy", "foot_and_mouth_disease", "lumpy_skin_disease"]
RECOMMENDED_MIN_DIM: int = 224  # Standard MobileNetV2 input resolution (224x224)


class ImageAuditRecord:
    """Holds audit metadata for a single image file."""
    def __init__(self, file_path: Path, class_name: str):
        self.path: Path = file_path
        self.class_name: str = class_name
        self.filename: str = file_path.name
        self.file_size_bytes: int = 0
        self.extension: str = file_path.suffix.lower()
        self.is_supported_format: bool = False
        self.is_readable: bool = False
        self.width: int = 0
        self.height: int = 0
        self.aspect_ratio: float = 0.0
        self.color_mode: str = ""
        self.sha256: str = ""
        self.error_message: Optional[str] = None
        self.warnings: List[str] = []


def compute_sha256(filepath: Path) -> str:
    """Computes SHA-256 checksum of a file in 64KB binary chunks."""
    hasher = hashlib.sha256()
    with open(filepath, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            hasher.update(chunk)
    return hasher.hexdigest()


def audit_single_file(file_path: Path, class_name: str) -> Optional[ImageAuditRecord]:
    """
    Audits a single file without modifying it.
    Returns None if the file is an ignored system file (e.g., .gitkeep).
    """
    if file_path.name.lower() in IGNORED_SYSTEM_FILES:
        return None

    record = ImageAuditRecord(file_path, class_name)

    # 1. Check file size
    try:
        stat = file_path.stat()
        record.file_size_bytes = stat.st_size
    except Exception as e:
        record.error_message = f"Cannot access file metadata: {e}"
        return record

    if record.file_size_bytes == 0:
        record.error_message = "File is empty (0 bytes / zero-length payload)."
        return record

    # 2. Check format extension
    record.is_supported_format = record.extension in SUPPORTED_EXTENSIONS
    if not record.is_supported_format:
        record.error_message = f"Unsupported file extension '{record.extension}'. Expected: .jpg, .jpeg, .png, .webp"
        return record

    # 3. Compute SHA-256 for exact duplicate detection
    try:
        record.sha256 = compute_sha256(file_path)
    except Exception as e:
        record.error_message = f"Failed to compute file checksum: {e}"
        return record

    # 4. Check image decoding & dimensions with Pillow
    if not PIL_AVAILABLE:
        record.warnings.append("Pillow is not installed; pixel verification was skipped. Run: pip install pillow")
        record.is_readable = True
        return record

    try:
        with Image.open(file_path) as img:
            record.width, record.height = img.size
            record.color_mode = img.mode
            record.aspect_ratio = round(record.width / record.height, 2) if record.height > 0 else 0.0

            # Verify structural integrity
            img.verify()

        # Re-open and load pixel data (verify() invalidates image object for subsequent operations)
        with Image.open(file_path) as img:
            img.load()

        record.is_readable = True

        # Check resolution thresholds for MobileNetV2
        if record.width < RECOMMENDED_MIN_DIM or record.height < RECOMMENDED_MIN_DIM:
            record.warnings.append(
                f"Low resolution ({record.width}x{record.height}px). "
                f"MobileNetV2 trains at {RECOMMENDED_MIN_DIM}x{RECOMMENDED_MIN_DIM}px; image may lose detail when upscaled."
            )

        if record.aspect_ratio > 3.0 or record.aspect_ratio < 0.33:
            record.warnings.append(
                f"Extreme aspect ratio ({record.aspect_ratio}:1). Image cropping during training may discard key lesions."
            )

    except Exception as e:
        record.is_readable = False
        record.error_message = f"Image corrupted or unreadable: {str(e)}"

    return record


class DatasetValidator:
    def __init__(self, dataset_dir: Path):
        self.dataset_dir = dataset_dir.resolve()
        self.class_records: Dict[str, List[ImageAuditRecord]] = defaultdict(list)
        self.unsupported_files: List[ImageAuditRecord] = []
        self.corrupted_files: List[ImageAuditRecord] = []
        self.hash_to_files: Dict[str, List[ImageAuditRecord]] = defaultdict(list)
        self.all_records: List[ImageAuditRecord] = []

    def scan(self) -> None:
        """Discovers and scans all class folders in the dataset directory."""
        if not self.dataset_dir.exists():
            return

        # Scan expected classes first, followed by any other directories present
        discovered_dirs: List[Path] = [
            d for d in self.dataset_dir.iterdir()
            if d.is_dir() and not d.name.startswith(".")
        ]

        # Prioritize expected order
        discovered_names = {d.name for d in discovered_dirs}
        classes_to_scan = [c for c in EXPECTED_CLASSES if c in discovered_names]
        classes_to_scan += [d.name for d in discovered_dirs if d.name not in EXPECTED_CLASSES]

        for cls_name in classes_to_scan:
            cls_dir = self.dataset_dir / cls_name
            for item in sorted(cls_dir.rglob("*")):
                if item.is_file():
                    record = audit_single_file(item, cls_name)
                    if record is not None:
                        self.all_records.append(record)
                        self.class_records[cls_name].append(record)
                        if record.sha256:
                            self.hash_to_files[record.sha256].append(record)

                        if not record.is_supported_format:
                            self.unsupported_files.append(record)
                        elif not record.is_readable:
                            self.corrupted_files.append(record)

    def print_report(self) -> bool:
        """
        Prints the complete dataset audit report.
        Returns True if dataset is 100% valid and ready, False if issues need attention.
        """
        print("\n" + "=" * 78)
        print("           PASHU DRISHTI — DATASET INTEGRITY & VALIDATION REPORT           ")
        print("=" * 78)
        print(f"Dataset Root:      {self.dataset_dir}")
        print(f"PIL / Pillow:      {'Available (full pixel verification active)' if PIL_AVAILABLE else 'NOT INSTALLED (run: pip install pillow)'}")
        print(f"Supported Formats: {', '.join(sorted(SUPPORTED_EXTENSIONS))}")
        print(f"Target Resolution: {RECOMMENDED_MIN_DIM}x{RECOMMENDED_MIN_DIM}px (PyTorch MobileNetV2 Standard)")
        print("=" * 78 + "\n")

        if not self.dataset_dir.exists():
            print(f"[ERROR] Target dataset directory does not exist: {self.dataset_dir}")
            print(f"        Please create it or specify: python backend/ml/validate_dataset.py --data_dir <path>\n")
            return False

        # Class presence check
        missing_classes = [c for c in EXPECTED_CLASSES if not (self.dataset_dir / c).is_dir()]
        if missing_classes:
            print(f"[WARNING] Missing expected class directories: {', '.join(missing_classes)}")
            print("          Please create the missing folder(s) before training.\n")

        # ---------------------------------------------------- Class Summary Table
        print("  CLASS INVENTORY & IMAGE COUNTS")
        print("  " + "-" * 74)
        print(f"  {'Class Folder':<28} | {'Total':<7} | {'Valid':<7} | {'Corrupt':<8} | {'Bad Ext':<8} | {'Status'}")
        print("  " + "-" * 74)

        total_scanned = len(self.all_records)
        total_valid = 0
        total_corrupt = len(self.corrupted_files)
        total_bad_format = len(self.unsupported_files)

        class_names = list(self.class_records.keys())
        # Ensure expected classes appear even if 0 files
        for ec in EXPECTED_CLASSES:
            if ec not in class_names and (self.dataset_dir / ec).is_dir():
                class_names.append(ec)

        if not class_names:
            print("  [No class directories found in target folder]")

        for cls in class_names:
            records = self.class_records.get(cls, [])
            valid_recs = [r for r in records if r.is_supported_format and r.is_readable]
            corrupt_recs = [r for r in records if not r.is_readable and r.is_supported_format]
            bad_ext_recs = [r for r in records if not r.is_supported_format]

            total_valid += len(valid_recs)

            if len(valid_recs) == 0 and len(records) == 0:
                status_str = "Empty (Awaiting Images)"
            elif len(corrupt_recs) > 0 or len(bad_ext_recs) > 0:
                status_str = "Needs Attention"
            else:
                status_str = "Clean"

            print(f"  {cls:<28} | {len(records):<7} | {len(valid_recs):<7} | {len(corrupt_recs):<8} | {len(bad_ext_recs):<8} | {status_str}")

        print("  " + "-" * 74)
        print(f"  {'TOTAL':<28} | {total_scanned:<7} | {total_valid:<7} | {total_corrupt:<8} | {total_bad_format:<8} |")
        print("\n")

        # ---------------------------------------------------- Resolution Analysis
        print("  IMAGE DIMENSION METRICS (Per Class)")
        print("  " + "-" * 74)
        print(f"  {'Class Folder':<28} | {'Min (WxH)':<14} | {'Max (WxH)':<14} | {'Average (WxH)':<15}")
        print("  " + "-" * 74)

        low_res_records: List[ImageAuditRecord] = []

        has_dimension_data = False
        for cls in class_names:
            valid_recs = [r for r in self.class_records.get(cls, []) if r.is_readable and r.width > 0]
            if not valid_recs:
                print(f"  {cls:<28} | {'N/A':<14} | {'N/A':<14} | {'N/A':<15}")
                continue

            has_dimension_data = True
            widths = [r.width for r in valid_recs]
            heights = [r.height for r in valid_recs]

            min_w, min_h = min(widths), min(heights)
            max_w, max_h = max(widths), max(heights)
            avg_w = int(sum(widths) / len(widths))
            avg_h = int(sum(heights) / len(heights))

            for r in valid_recs:
                if r.width < RECOMMENDED_MIN_DIM or r.height < RECOMMENDED_MIN_DIM:
                    low_res_records.append(r)

            print(f"  {cls:<28} | {f'{min_w}x{min_h}px':<14} | {f'{max_w}x{max_h}px':<14} | {f'{avg_w}x{avg_h}px':<15}")

        print("  " + "-" * 74 + "\n")

        # ---------------------------------------------------- Duplicate Detection
        duplicates_found = False
        cross_class_duplicates: List[Tuple[str, List[ImageAuditRecord]]] = []
        intra_class_duplicates: List[Tuple[str, List[ImageAuditRecord]]] = []

        for sha, files in self.hash_to_files.items():
            if len(files) > 1:
                duplicates_found = True
                classes_involved = {f.class_name for f in files}
                if len(classes_involved) > 1:
                    cross_class_duplicates.append((sha, files))
                else:
                    intra_class_duplicates.append((sha, files))

        print("  EXACT DUPLICATE DETECTION (SHA-256 Hash Matching)")
        print("  " + "-" * 74)
        if not duplicates_found:
            print("  No duplicate images detected. All scanned files have unique checksums.")
        else:
            if cross_class_duplicates:
                print(f"  [CRITICAL] Found {len(cross_class_duplicates)} CROSS-CLASS duplicate instance(s)!")
                print("             (Same image appears under multiple disease labels — will confuse the model!):")
                for sha, files in cross_class_duplicates:
                    print(f"             - Hash: {sha[:12]}...")
                    for f in files:
                        print(f"               * [{f.class_name}] {f.path.relative_to(self.dataset_dir)}")

            if intra_class_duplicates:
                print(f"  [WARNING] Found {len(intra_class_duplicates)} INTRA-CLASS duplicate instance(s):")
                for sha, files in intra_class_duplicates:
                    print(f"             - Hash: {sha[:12]}... ({files[0].class_name}):")
                    for f in files:
                        print(f"               * {f.path.relative_to(self.dataset_dir)}")
        print("\n")

        # ---------------------------------------------------- Issues Requiring Attention
        has_critical_issues = bool(self.corrupted_files or self.unsupported_files or cross_class_duplicates)
        has_warnings = bool(low_res_records or intra_class_duplicates or total_valid == 0)

        print("=" * 78)
        print("  ACTION REQUIRED: FILES REQUIRING ATTENTION")
        print("=" * 78)

        if not has_critical_issues and not has_warnings:
            print("  None! All scanned images are valid, correctly formatted, and unique.")
        else:
            issue_count = 1

            # 1. Corrupted Files
            if self.corrupted_files:
                print(f"\n  [!] CORRUPTED / UNREADABLE IMAGES ({len(self.corrupted_files)}):")
                for rec in self.corrupted_files:
                    rel_p = rec.path.relative_to(self.dataset_dir)
                    print(f"      {issue_count}. {rel_p}")
                    print(f"         Reason: {rec.error_message}")
                    issue_count += 1

            # 2. Unsupported Extensions
            if self.unsupported_files:
                print(f"\n  [!] UNSUPPORTED FORMATS ({len(self.unsupported_files)}):")
                for rec in self.unsupported_files:
                    rel_p = rec.path.relative_to(self.dataset_dir)
                    print(f"      {issue_count}. {rel_p}")
                    print(f"         Reason: {rec.error_message}")
                    issue_count += 1

            # 3. Cross-Class Duplicates
            if cross_class_duplicates:
                print(f"\n  [!] CROSS-CLASS DUPLICATES ({len(cross_class_duplicates)}):")
                for sha, files in cross_class_duplicates:
                    print(f"      {issue_count}. Identical image placed in different folders (SHA-256: {sha[:12]}...):")
                    for f in files:
                        print(f"         -> {f.path.relative_to(self.dataset_dir)} (Class: {f.class_name})")
                    print(f"         Fix: Review visually and delete the incorrectly labeled duplicate.")
                    issue_count += 1

            # 4. Intra-Class Duplicates
            if intra_class_duplicates:
                print(f"\n  [i] INTRA-CLASS DUPLICATES ({len(intra_class_duplicates)}):")
                for sha, files in intra_class_duplicates:
                    print(f"      {issue_count}. Duplicate copies in same folder (SHA-256: {sha[:12]}...):")
                    for f in files:
                        print(f"         -> {f.path.relative_to(self.dataset_dir)}")
                    print(f"         Recommendation: Remove duplicate copies so model isn't overfitted on single samples.")
                    issue_count += 1

            # 5. Low Resolution
            if low_res_records:
                print(f"\n  [i] SUB-OPTIMAL RESOLUTION (<{RECOMMENDED_MIN_DIM}x{RECOMMENDED_MIN_DIM}px) ({len(low_res_records)}):")
                for rec in low_res_records[:10]:  # limit to first 10
                    rel_p = rec.path.relative_to(self.dataset_dir)
                    print(f"      - {rel_p} ({rec.width}x{rec.height}px)")
                if len(low_res_records) > 10:
                    print(f"      ... and {len(low_res_records) - 10} more images below recommended resolution.")

        # ---------------------------------------------------- Final Verdict
        print("\n" + "=" * 78)
        print("  SUMMARY & VERDICT")
        print("=" * 78)

        if total_scanned == 0:
            print("  Status:     AWAITING IMAGES")
            print("  Message:    The dataset folders are ready, but currently empty.")
            print("  Next Step:  1. Download legitimate cattle disease image datasets.")
            print("              2. Place them into backend/dataset/healthy, foot_and_mouth_disease, or lumpy_skin_disease.")
            print("              3. Re-run: python backend/ml/validate_dataset.py")
            print("=" * 78 + "\n")
            return False

        if has_critical_issues:
            print("  Status:     VALIDATION FAILED — ATTENTION REQUIRED")
            print("  Message:    Corrupted files, unsupported formats, or label-conflicting duplicates detected.")
            print("  Safety:     No files were altered or deleted. Please review the listed files manually.")
            print("=" * 78 + "\n")
            return False

        if total_valid < 10:
            print("  Status:     VALID BUT SMALL SAMPLE SIZE")
            print(f"  Message:    All {total_valid} scanned images are valid. For quality training results,")
            print("              it is recommended to collect at least 50-100 real images per class.")
            print("=" * 78 + "\n")
            return True

        print("  Status:     PASSED — READY FOR MOBILENETV2 TRAINING")
        print(f"  Message:    {total_valid} valid, correctly formatted images verified across all classes.")
        print(f"  Next Step:  When ready to train, execute:")
        print(f"              python backend/ml/train_mobilenetv2.py --data_dir backend/dataset --epochs 25")
        print("=" * 78 + "\n")
        return True


def main():
    default_dir = Path(__file__).resolve().parent.parent / "dataset"
    parser = argparse.ArgumentParser(
        description="Dataset integrity validation tool for Pashu Drishti MobileNetV2 classification."
    )
    parser.add_argument(
        "--data_dir",
        type=str,
        default=str(default_dir),
        help=f"Path to dataset directory (default: {default_dir})"
    )
    args = parser.parse_args()

    validator = DatasetValidator(Path(args.data_dir))
    validator.scan()
    success = validator.print_report()
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()

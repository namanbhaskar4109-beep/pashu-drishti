"""
MobileNetV2 Training Pipeline for Animal Disease Image Classification.

Use this script to train your custom MobileNetV2 model once your labeled
animal-disease dataset is ready.

Usage:
    python backend/ml/train_mobilenetv2.py --data_dir /path/to/dataset --epochs 25 --batch_size 32

Dataset Directory Structure:
    dataset/
      ├── train/
      │     ├── Lumpy_Skin_Disease/
      │     ├── Bovine_Mastitis/
      │     ├── Foot_And_Mouth_Disease/
      │     └── Healthy_Animal/
      └── val/
            ├── Lumpy_Skin_Disease/
            ├── Bovine_Mastitis/
            ├── Foot_And_Mouth_Disease/
            └── Healthy_Animal/
"""

import os
import sys
import json
import argparse
from pathlib import Path

try:
    import torch
    import torch.nn as nn
    import torch.optim as optim
    from torch.utils.data import DataLoader, random_split
    from torchvision import datasets, transforms, models
    from torchvision.models import MobileNet_V2_Weights
except ImportError:
    print("Error: PyTorch and torchvision are required for training. Install them using:")
    print("    pip install torch torchvision")
    sys.exit(1)


def parse_args():
    parser = argparse.ArgumentParser(description="Train MobileNetV2 Animal Disease Classifier")
    parser.add_argument("--data_dir", type=str, required=True, help="Path to labeled animal disease dataset directory")
    parser.add_argument("--output_dir", type=str, default="backend/models", help="Directory to save trained model and class indices")
    parser.add_argument("--epochs", type=int, default=25, help="Number of training epochs")
    parser.add_argument("--batch_size", type=int, default=32, help="Batch size for training")
    parser.add_argument("--lr", type=float, default=1e-4, help="Learning rate")
    parser.add_argument("--val_split", type=float, default=0.2, help="Validation split fraction if no 'val' directory exists")
    parser.add_argument("--device", type=str, default="cuda" if torch.cuda.is_available() else "cpu", help="Device to use (cuda/cpu)")
    return parser.parse_args()


def get_data_transforms():
    train_transforms = transforms.Compose([
        transforms.RandomResizedCrop(224, scale=(0.8, 1.0)),
        transforms.RandomHorizontalFlip(),
        transforms.RandomRotation(15),
        transforms.ColorJitter(brightness=0.2, contrast=0.2),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
    ])

    val_transforms = transforms.Compose([
        transforms.Resize(256),
        transforms.CenterCrop(224),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
    ])

    return train_transforms, val_transforms


def load_datasets(data_dir: Path, val_split: float):
    train_transforms, val_transforms = get_data_transforms()

    train_dir = data_dir / "train"
    val_dir = data_dir / "val"

    if train_dir.exists() and val_dir.exists():
        print(f"[Data] Found separate 'train' and 'val' subdirectories in {data_dir}")
        train_dataset = datasets.ImageFolder(str(train_dir), transform=train_transforms)
        val_dataset = datasets.ImageFolder(str(val_dir), transform=val_transforms)
        class_to_idx = train_dataset.class_to_idx
    else:
        print(f"[Data] Using single directory with automatic {int(val_split * 100)}% validation split")
        full_dataset = datasets.ImageFolder(str(data_dir), transform=train_transforms)
        class_to_idx = full_dataset.class_to_idx

        val_size = int(len(full_dataset) * val_split)
        train_size = len(full_dataset) - val_size
        train_dataset, val_dataset = random_split(full_dataset, [train_size, val_size])

    return train_dataset, val_dataset, class_to_idx


def main():
    args = parse_args()
    data_dir = Path(args.data_dir)
    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    if not data_dir.exists():
        print(f"Error: Dataset directory '{data_dir}' does not exist.")
        sys.exit(1)

    print(f"============================================================")
    print(f"   MobileNetV2 Animal Disease Classifier Training")
    print(f"============================================================")
    print(f"Dataset:     {data_dir}")
    print(f"Output:      {output_dir}")
    print(f"Epochs:      {args.epochs}")
    print(f"Batch Size:  {args.batch_size}")
    print(f"Learning Rt: {args.lr}")
    print(f"Device:      {args.device}")

    # Load datasets
    train_dataset, val_dataset, class_to_idx = load_datasets(data_dir, args.val_split)
    class_indices = {idx: name for name, idx in class_to_idx.items()}
    num_classes = len(class_indices)

    print(f"[Data] Detected {num_classes} animal disease classes:")
    for idx, name in sorted(class_indices.items()):
        print(f"   [{idx}] {name}")
    print(f"[Data] Training samples: {len(train_dataset)}, Validation samples: {len(val_dataset)}")

    train_loader = DataLoader(train_dataset, batch_size=args.batch_size, shuffle=True, num_workers=2)
    val_loader = DataLoader(val_dataset, batch_size=args.batch_size, shuffle=False, num_workers=2)

    # Initialize pretrained MobileNetV2
    print(f"[Model] Initializing MobileNetV2 with ImageNet pretrained backbone...")
    model = models.mobilenet_v2(weights=MobileNet_V2_Weights.DEFAULT)

    # Replace classifier head for animal disease classes
    in_features = model.classifier[1].in_features
    model.classifier = nn.Sequential(
        nn.Dropout(p=0.2),
        nn.Linear(in_features, num_classes)
    )

    device = torch.device(args.device)
    model = model.to(device)

    criterion = nn.CrossEntropyLoss()
    optimizer = optim.AdamW(model.parameters(), lr=args.lr, weight_decay=1e-4)
    scheduler = optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=args.epochs)

    best_val_acc = 0.0
    best_model_weights = None

    for epoch in range(1, args.epochs + 1):
        # Training Phase
        model.train()
        train_loss = 0.0
        train_correct = 0
        total_train = 0

        for inputs, targets in train_loader:
            inputs, targets = inputs.to(device), targets.to(device)

            optimizer.zero_grad()
            outputs = model(inputs)
            loss = criterion(outputs, targets)
            loss.backward()
            optimizer.step()

            train_loss += loss.item() * inputs.size(0)
            _, predicted = outputs.max(1)
            total_train += targets.size(0)
            train_correct += predicted.eq(targets).sum().item()

        scheduler.step()

        # Validation Phase
        model.eval()
        val_loss = 0.0
        val_correct = 0
        total_val = 0

        with torch.no_grad():
            for inputs, targets in val_loader:
                inputs, targets = inputs.to(device), targets.to(device)
                outputs = model(inputs)
                loss = criterion(outputs, targets)

                val_loss += loss.item() * inputs.size(0)
                _, predicted = outputs.max(1)
                total_val += targets.size(0)
                val_correct += predicted.eq(targets).sum().item()

        train_acc = (train_correct / total_train) * 100.0 if total_train > 0 else 0
        val_acc = (val_correct / total_val) * 100.0 if total_val > 0 else 0
        avg_train_loss = train_loss / total_train if total_train > 0 else 0
        avg_val_loss = val_loss / total_val if total_val > 0 else 0

        print(f"Epoch [{epoch:02d}/{args.epochs:02d}] "
              f"Train Loss: {avg_train_loss:.4f} | Train Acc: {train_acc:.2f}% | "
              f"Val Loss: {avg_val_loss:.4f} | Val Acc: {val_acc:.2f}%")

        if val_acc > best_val_acc:
            best_val_acc = val_acc
            best_model_weights = model.state_dict().copy()

    # Save best model
    if best_model_weights is None:
        best_model_weights = model.state_dict()

    weights_out = output_dir / "mobilenetv2_animal_disease.pth"
    torch.save(best_model_weights, weights_out)
    print(f"\n[Export] Saved best MobileNetV2 weights to: {weights_out} (Best Val Acc: {best_val_acc:.2f}%)")

    # Save class indices
    classes_out = output_dir / "class_indices.json"
    with open(classes_out, "w", encoding="utf-8") as f:
        json.dump(class_indices, f, indent=2)
    print(f"[Export] Saved class indices mapping to: {classes_out}")
    print("\nTraining completed successfully! The model is now ready for FastAPI inference.")


if __name__ == "__main__":
    main()

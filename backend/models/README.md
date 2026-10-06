# MobileNetV2 Model Storage & Labeled Dataset Weights

This directory holds the trained PyTorch MobileNetV2 image classification model weights and class label index for the Animal Disease Detection architecture.

## Required Files for Inference

To activate live disease prediction:
1. **`mobilenetv2_animal_disease.pth`**: Trained PyTorch weights file for the custom MobileNetV2 image classifier.
2. **`class_indices.json`**: Mapping of class indices to disease names:
   ```json
   {
     "0": "Bovine Mastitis",
     "1": "Foot and Mouth Disease (FMD)",
     "2": "Lumpy Skin Disease (LSD)",
     "3": "Normal / Healthy Bovine Specimen"
   }
   ```

## Model Training

When you are ready to train on your labeled animal disease dataset, run the provided training script:

```bash
python backend/ml/train_mobilenetv2.py --data_dir /path/to/dataset --epochs 25 --batch_size 32
```

The training script will automatically train the MobileNetV2 CNN, evaluate validation accuracy, and export:
- `backend/models/mobilenetv2_animal_disease.pth`
- `backend/models/class_indices.json`

Until a trained model is installed here, the prediction endpoint will strictly report that the model has not been trained/installed yet. No fake predictions or hardcoded results are returned.

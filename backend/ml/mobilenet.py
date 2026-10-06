import os
import io
import json
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple

ROOT_DIR = Path(__file__).resolve().parent.parent.parent
BACKEND_DIR = Path(__file__).resolve().parent.parent
MODELS_DIR = BACKEND_DIR / "models"
DEFAULT_WEIGHTS_PATH = MODELS_DIR / "mobilenetv2_animal_disease.pth"
DEFAULT_CLASSES_PATH = MODELS_DIR / "class_indices.json"
METADATA_PATH = MODELS_DIR / "disease_metadata.json"

# Check PyTorch availability
try:
    import torch
    import torch.nn as nn
    from torchvision import transforms, models
    from PIL import Image
    TORCH_AVAILABLE = True
except ImportError:
    TORCH_AVAILABLE = False


class ModelNotInstalledError(Exception):
    """Raised when an inference is requested but the MobileNetV2 model has not been trained or installed."""
    pass


class MobileNetClassifier:
    def __init__(
        self,
        weights_path: Path = DEFAULT_WEIGHTS_PATH,
        classes_path: Path = DEFAULT_CLASSES_PATH,
        metadata_path: Path = METADATA_PATH
    ):
        self.weights_path = Path(os.environ.get("MODEL_WEIGHTS_PATH", str(weights_path)))
        self.classes_path = Path(os.environ.get("CLASS_INDICES_PATH", str(classes_path)))
        self.metadata_path = Path(metadata_path)
        self.model = None
        self.class_indices: Dict[int, str] = {}
        self.device = "cuda" if TORCH_AVAILABLE and torch.cuda.is_available() else "cpu"
        self._load_classes()

    def _load_classes(self) -> None:
        if self.classes_path.exists():
            try:
                with open(self.classes_path, "r", encoding="utf-8") as f:
                    raw_classes = json.load(f)
                    self.class_indices = {int(k): str(v) for k, v in raw_classes.items()}
            except Exception as e:
                print(f"[MobileNetV2] Error loading class indices from {self.classes_path}: {e}")
                self.class_indices = {}
        else:
            self.class_indices = {}

    def is_installed(self) -> bool:
        """Returns True ONLY if weights file and class indices file exist."""
        return (
            TORCH_AVAILABLE and
            self.weights_path.exists() and
            self.weights_path.is_file() and
            len(self.class_indices) > 0
        )

    def get_status(self) -> Dict[str, Any]:
        """Provides diagnostic information about MobileNetV2 model availability."""
        installed = self.is_installed()
        classes_list = [self.class_indices[i] for i in sorted(self.class_indices.keys())]

        if not TORCH_AVAILABLE:
            message = "PyTorch/torchvision is not installed in the Python environment."
        elif not self.weights_path.exists():
            message = f"Model weights not found at '{self.weights_path.name}'. Train your model using your labeled animal disease dataset to enable prediction."
        elif len(self.class_indices) == 0:
            message = f"Class labels index '{self.classes_path.name}' is missing or empty."
        else:
            message = f"Custom MobileNetV2 model is loaded and ready for veterinary inference ({len(classes_list)} disease classes)."

        return {
            "installed": installed,
            "trained": installed,
            "architecture": "MobileNetV2",
            "modelName": "Custom MobileNetV2 Animal Disease Classifier",
            "activeEngine": "Custom MobileNetV2 CNN" if installed else "Custom MobileNetV2 (Not trained/installed yet)",
            "modelPath": str(self.weights_path),
            "weightsFound": self.weights_path.exists(),
            "classesFound": len(self.class_indices) > 0,
            "numClasses": len(self.class_indices),
            "classes": classes_list,
            "torchAvailable": TORCH_AVAILABLE,
            "device": self.device,
            "message": message
        }

    def _get_transforms(self):
        return transforms.Compose([
            transforms.Resize(256),
            transforms.CenterCrop(224),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
        ])

    def load_model(self) -> None:
        """Loads MobileNetV2 architecture and custom trained weights."""
        if not TORCH_AVAILABLE:
            raise ModelNotInstalledError("PyTorch is not available. Please install torch and torchvision.")

        if not self.is_installed():
            raise ModelNotInstalledError(
                f"Custom MobileNetV2 model has not been trained or installed yet. "
                f"Expected weights file at: {self.weights_path}"
            )

        if self.model is not None:
            return

        num_classes = len(self.class_indices)

        # Build MobileNetV2 architecture
        model = models.mobilenet_v2(weights=None)
        in_features = model.classifier[1].in_features
        model.classifier[1] = nn.Linear(in_features, num_classes)

        # Load trained weights
        state_dict = torch.load(self.weights_path, map_location=self.device)
        model.load_state_dict(state_dict)
        model.to(self.device)
        model.eval()

        self.model = model
        print(f"[MobileNetV2] Loaded custom weights successfully from {self.weights_path} with {num_classes} classes.")

    def predict(self, image_bytes: bytes, animal_type: str = "Cattle", symptoms: Optional[List[str]] = None) -> Dict[str, Any]:
        """
        Executes disease classification inference on the provided animal photograph bytes.
        Raises ModelNotInstalledError if model weights have not been trained/installed.
        """
        # Re-check classes in case newly added
        if not self.class_indices:
            self._load_classes()

        if not self.is_installed():
            raise ModelNotInstalledError(
                "Custom MobileNetV2 disease detection model has not been trained or installed yet. "
                f"Please train the model using your labeled animal-disease dataset and place the weights file at: {self.weights_path}"
            )

        self.load_model()

        # Image preprocessing
        try:
            image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        except Exception as e:
            raise ValueError(f"Failed to decode image: {str(e)}")

        transform = self._get_transforms()
        input_tensor = transform(image).unsqueeze(0).to(self.device)

        with torch.no_grad():
            outputs = self.model(input_tensor)
            probabilities = torch.softmax(outputs, dim=1)[0]

        top_k = min(5, len(self.class_indices))
        top_probs, top_indices = torch.topk(probabilities, top_k)

        top_idx = int(top_indices[0].item())
        top_disease = self.class_indices.get(top_idx, f"Class {top_idx}")
        top_conf = float(top_probs[0].item()) * 100.0

        alternatives = []
        for i in range(1, top_k):
            idx = int(top_indices[i].item())
            prob = float(top_probs[i].item()) * 100.0
            if prob >= 1.0:
                name = self.class_indices.get(idx, f"Class {idx}")
                alternatives.append(f"{name} ({prob:.1f}%)")

        # Clinical enrichment metadata
        metadata = {}
        if self.metadata_path.exists():
            try:
                with open(self.metadata_path, "r", encoding="utf-8") as f:
                    meta_db = json.load(f)
                    metadata = meta_db.get(top_disease, {})
            except Exception:
                pass

        is_healthy = "healthy" in top_disease.lower() or "normal" in top_disease.lower()
        severity = metadata.get("severity", "healthy" if is_healthy else "high" if top_conf > 85 else "moderate")

        confidence_level = "High" if top_conf >= 80 else "Moderate" if top_conf >= 55 else "Low"

        recommended_next_steps = metadata.get(
            "recommendedNextSteps",
            "Maintain observation and consult a certified veterinarian for confirmatory diagnosis." if not is_healthy
            else "Maintain regular animal husbandry, clean hydration, and scheduled vaccinations."
        )

        veterinarian_recommendation = metadata.get(
            "veterinarianRecommendation",
            "Consult a veterinarian if abnormal symptoms or lesions worsen." if not is_healthy
            else "Routine bi-annual veterinary wellness checkup."
        )

        pathogen = metadata.get(
            "pathogen",
            "None detected" if is_healthy else "Identified via MobileNetV2 visual classification"
        )

        return {
            "animalType": animal_type,
            "possibleDisease": top_disease,
            "alternativePossibilities": alternatives,
            "visibleSymptoms": symptoms or ["Identified via MobileNetV2 feature extraction"],
            "severity": severity,
            "confidenceLevel": confidence_level,
            "confidence": round(top_conf, 1),
            "explanation": f"MobileNetV2 classification detected image features associated with '{top_disease}' with {round(top_conf, 1)}% probability.",
            "recommendedNextSteps": recommended_next_steps,
            "veterinarianRecommendation": veterinarian_recommendation,
            "pathogen": pathogen,
            "engineUsed": "Custom MobileNetV2 CNN"
        }


classifier = MobileNetClassifier()

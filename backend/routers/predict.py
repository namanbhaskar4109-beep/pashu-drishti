import base64
import re
from fastapi import APIRouter, Request, HTTPException, status
from pydantic import BaseModel
from typing import Optional, List

from backend.database import db
from backend.routers.auth import get_current_user
from backend.ml.mobilenet import classifier, ModelNotInstalledError

router = APIRouter(prefix="/predict", tags=["Prediction"])


class PredictRequest(BaseModel):
    image: str
    animalType: Optional[str] = "Cattle"
    symptoms: Optional[List[str]] = None


def extract_image_bytes(image_data: str) -> bytes:
    """Extracts raw bytes from base64 data URI or raw base64 string."""
    clean = image_data.strip()
    if clean.startswith("data:"):
        match = re.match(r"^data:[^;]+;base64,(.+)$", clean)
        if match:
            clean = match.group(1)
        else:
            raise ValueError("Malformed data URI format.")

    try:
        raw_bytes = base64.b64decode(clean)
    except Exception as e:
        raise ValueError(f"Invalid base64 encoding: {e}")

    if len(raw_bytes) < 200:
        raise ValueError("Image file is too small or corrupt. Please upload a clear photo.")

    if len(raw_bytes) > 15 * 1024 * 1024:
        raise ValueError("Image file exceeds the 15MB limit. Please upload a smaller image.")

    return raw_bytes


@router.post("")
async def predict_disease(body: PredictRequest, request: Request):
    # 1. Require authenticated user
    user = get_current_user(request)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required to run animal disease detection."
        )

    # 2. Validate image input
    if not body.image or not body.image.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An animal photograph is required for analysis."
        )

    try:
        image_bytes = extract_image_bytes(body.image)
    except ValueError as val_err:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(val_err))

    species = body.animalType.strip() if body.animalType else "Cattle"
    user_symptoms = [s.strip() for s in (body.symptoms or []) if s.strip()]

    # 3. MobileNetV2 Inference Execution
    # Strictly checks if the custom model has been trained and installed.
    # No fake predictions and no hardcoded disease results.
    try:
        prediction = classifier.predict(
            image_bytes=image_bytes,
            animal_type=species,
            symptoms=user_symptoms
        )
    except ModelNotInstalledError as model_err:
        # Clearly report that the model has not been trained or installed yet
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={
                "message": str(model_err),
                "modelReady": False,
                "architecture": "MobileNetV2",
                "instructions": (
                    "Custom MobileNetV2 model has not been trained or installed yet. "
                    "Please train the model on your labeled animal disease dataset using "
                    "'python backend/ml/train_mobilenetv2.py' and place the weights file at "
                    "backend/models/mobilenetv2_animal_disease.pth."
                )
            }
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Inference error: {str(exc)}"
        )

    # 4. Save image to storage
    try:
        saved_image_url = db.save_uploaded_image(body.image, f"{species.lower().replace(' ', '-')}-scan.jpg")
    except Exception:
        saved_image_url = "/uploads/default-scan.jpg"

    # 5. Save analysis record into database
    new_analysis = db.create_analysis({
        "userId": user["id"],
        "animalType": prediction["animalType"],
        "imageUrl": saved_image_url,
        "predictedDisease": prediction["possibleDisease"],
        "possibleDisease": prediction["possibleDisease"],
        "pathogen": prediction.get("pathogen", "Identified via MobileNetV2 visual pathology"),
        "confidence": prediction["confidence"],
        "confidenceLevel": prediction["confidenceLevel"],
        "severity": prediction["severity"],
        "symptoms": user_symptoms or prediction.get("visibleSymptoms", []),
        "visibleSymptoms": prediction.get("visibleSymptoms", []),
        "possibleCauses": prediction.get("alternativePossibilities", []),
        "alternativePossibilities": prediction.get("alternativePossibilities", []),
        "recommendedCare": [prediction["recommendedNextSteps"], prediction["veterinarianRecommendation"]],
        "recommendedNextSteps": prediction["recommendedNextSteps"],
        "quarantineProtocol": prediction["recommendedNextSteps"],
        "urgency": prediction["veterinarianRecommendation"],
        "veterinarianRecommendation": prediction["veterinarianRecommendation"],
        "summary": prediction["explanation"],
        "explanation": prediction["explanation"]
    })

    # 6. Return structured prediction result
    return {
        "success": True,
        "result": {
            "animalType": prediction["animalType"],
            "possibleDisease": prediction["possibleDisease"],
            "alternativePossibilities": prediction["alternativePossibilities"],
            "visibleSymptoms": prediction["visibleSymptoms"],
            "severity": prediction["severity"],
            "confidenceLevel": prediction["confidenceLevel"],
            "confidence": prediction["confidence"],
            "explanation": prediction["explanation"],
            "recommendedNextSteps": prediction["recommendedNextSteps"],
            "veterinarianRecommendation": prediction["veterinarianRecommendation"],
            "imageUrl": saved_image_url,
            "engineUsed": prediction["engineUsed"]
        },
        "analysis": new_analysis
    }

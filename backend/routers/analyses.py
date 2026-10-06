from fastapi import APIRouter, Request, HTTPException, status
from pydantic import BaseModel
from typing import Optional, List, Any, Dict

from backend.database import db
from backend.routers.auth import get_current_user

router = APIRouter(prefix="/analyses", tags=["Analyses"])


class SaveAnalysisRequest(BaseModel):
    animalType: Optional[str] = "Cattle"
    imageUrl: str
    predictedDisease: Optional[str] = None
    possibleDisease: Optional[str] = None
    pathogen: Optional[str] = None
    confidence: Optional[float] = 85.0
    confidenceLevel: Optional[str] = "High"
    severity: Optional[str] = "moderate"
    symptoms: Optional[List[str]] = None
    visibleSymptoms: Optional[List[str]] = None
    possibleCauses: Optional[List[str]] = None
    alternativePossibilities: Optional[List[str]] = None
    recommendedCare: Optional[List[str]] = None
    recommendedNextSteps: Optional[str] = None
    quarantineProtocol: Optional[str] = None
    urgency: Optional[str] = None
    veterinarianRecommendation: Optional[str] = None
    summary: Optional[str] = None
    explanation: Optional[str] = None


@router.get("")
async def get_all_analyses(request: Request):
    user = get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized.")
    analyses = db.get_analyses_by_user_id(user["id"])
    return {"analyses": analyses}


@router.get("/{analysis_id}")
async def get_single_analysis(analysis_id: str, request: Request):
    user = get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized.")
    analysis = db.get_analysis_by_id(analysis_id, user["id"])
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis record not found or unauthorized.")
    return {"analysis": analysis}


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_analysis(body: SaveAnalysisRequest, request: Request):
    user = get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required to save analysis history.")

    final_disease = body.possibleDisease or body.predictedDisease
    if not final_disease or not body.imageUrl:
        raise HTTPException(status_code=400, detail="Missing required analysis fields (predictedDisease/possibleDisease, imageUrl).")

    final_symptoms = body.visibleSymptoms or body.symptoms or []
    final_alternatives = body.alternativePossibilities or body.possibleCauses or []
    final_summary = body.explanation or body.summary or "Clinical evaluation recorded."
    final_protocol = body.recommendedNextSteps or body.quarantineProtocol or "Standard observation protocol."
    final_urgency = body.veterinarianRecommendation or body.urgency or "Standard triage"

    confidence_val = float(body.confidence) if body.confidence else 85.0
    conf_level = body.confidenceLevel or ("High" if confidence_val >= 80 else "Moderate" if confidence_val >= 60 else "Low")

    record = {
        "userId": user["id"],
        "animalType": body.animalType or "Cattle",
        "imageUrl": body.imageUrl,
        "predictedDisease": final_disease,
        "possibleDisease": final_disease,
        "pathogen": body.pathogen or "Unspecified",
        "confidence": confidence_val,
        "confidenceLevel": conf_level,
        "severity": body.severity or "moderate",
        "symptoms": final_symptoms,
        "visibleSymptoms": final_symptoms,
        "possibleCauses": final_alternatives,
        "alternativePossibilities": final_alternatives,
        "recommendedCare": body.recommendedCare or [final_protocol, final_urgency],
        "recommendedNextSteps": final_protocol,
        "quarantineProtocol": final_protocol,
        "urgency": final_urgency,
        "veterinarianRecommendation": final_urgency,
        "summary": final_summary,
        "explanation": final_summary
    }

    new_record = db.create_analysis(record)
    return {
        "message": "Analysis record saved successfully.",
        "analysis": new_record
    }


@router.delete("/{analysis_id}")
async def delete_analysis(analysis_id: str, request: Request):
    user = get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized.")
    deleted = db.delete_analysis(analysis_id, user["id"])
    if not deleted:
        raise HTTPException(status_code=404, detail="Analysis not found or unauthorized to delete.")
    return {"message": "Analysis record deleted successfully."}

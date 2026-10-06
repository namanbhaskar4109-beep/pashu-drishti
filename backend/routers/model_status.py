from fastapi import APIRouter
from backend.ml.mobilenet import classifier

router = APIRouter(tags=["Model Status"])


@router.get("/model/status")
async def get_model_status():
    """Returns status and readiness of the custom MobileNetV2 animal disease classifier."""
    return classifier.get_status()


@router.get("/ai/status")
async def get_ai_status_legacy():
    """
    Legacy route alias to seamlessly support existing UI calls while enforcing
    local MobileNetV2 architecture with zero external API key requirements.
    """
    status = classifier.get_status()
    return {
        **status,
        "configured": status["installed"],
        "provider": "mobilenetv2",
        "model": "mobilenet_v2",
        "hasKey": False,
        "maskedKey": "",
        "activeEngine": status["activeEngine"]
    }

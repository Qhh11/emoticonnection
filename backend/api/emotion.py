from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from backend.core.emotion import EmotionService

router = APIRouter()
emotion_service = EmotionService()

class AnalyzeRequest(BaseModel):
    """
    情绪分析请求模型
    """
    text: str

class AnalyzeResponse(BaseModel):
    """
    情绪分析响应模型
    """
    emotion: str

@router.post("/analyze", response_model=AnalyzeResponse)
async def analyze_emotion(request: AnalyzeRequest):
    """
    情绪分析接口
    
    分析输入文本的情绪类别。
    """
    try:
        emotion = await emotion_service.analyze_emotion(request.text)
        return AnalyzeResponse(emotion=emotion)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

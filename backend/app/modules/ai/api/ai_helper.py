from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from app.modules.ai.core.ai_helper import AIHelperService

router = APIRouter()
ai_helper_service = AIHelperService()

class RewriteRequest(BaseModel):
    text: str
    context: Optional[str] = None
    styles: Optional[List[str]] = None

class RewriteResponse(BaseModel):
    rewritten_text: str # Could be JSON string if styles used

class SuggestReplyRequest(BaseModel):
    history: List[dict] # List of {role, parts}
    context: Optional[str] = None
    styles: Optional[List[str]] = None

class SuggestReplyResponse(BaseModel):
    suggestions: str

class SuggestTopicRequest(BaseModel):
    history: List[dict]
    context: Optional[str] = None

class SuggestTopicResponse(BaseModel):
    suggestions: str

@router.post("/rewrite", response_model=RewriteResponse)
async def rewrite_content(request: RewriteRequest):
    """
    Rewrite user input to be more fluent.
    """
    try:
        req_text = request.text
        if not req_text:
             raise HTTPException(status_code=400, detail="Text is required")
             
        result = await ai_helper_service.rewrite_content(req_text, request.context, request.styles)
        return RewriteResponse(rewritten_text=result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/suggest-reply", response_model=SuggestReplyResponse)
async def suggest_reply(request: SuggestReplyRequest):
    """
    Suggest replies based on history.
    """
    try:
        result = await ai_helper_service.suggest_reply(request.history, request.context, request.styles)
        return SuggestReplyResponse(suggestions=result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/suggest-topic", response_model=SuggestTopicResponse)
async def suggest_topic(request: SuggestTopicRequest):
    """
    Suggest topics when stuck.
    """
    try:
        result = await ai_helper_service.suggest_topic(request.history, request.context)
        return SuggestTopicResponse(suggestions=result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

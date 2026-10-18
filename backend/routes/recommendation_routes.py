import os
import logging
from typing import Optional
import jwt
from fastapi import APIRouter, Header, Query, HTTPException, status
from models.recommendation_models import (
    RecommendationResponse,
    InteractionRequest,
    AssessmentResultRequest,
)
from services.recommendation_service import RecommendationService
from services.youtube_service import YouTubeService

logger = logging.getLogger(__name__)

recommendation_router = APIRouter(prefix="/recommendations", tags=["Recommendations"])

# Lazy singleton
_rec_service: Optional[RecommendationService] = None

def get_recommendation_service() -> RecommendationService:
    global _rec_service
    if _rec_service is None:
        _rec_service = RecommendationService()
    return _rec_service

def extract_email_from_token(authorization: Optional[str], fallback_email: Optional[str]) -> str:
    """Safely extract authenticated student email from JWT Bearer token or fallback."""
    secret_key = os.getenv("JWT_SECRET", "synaptiqsecret2026")

    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ")[1]
        try:
            payload = jwt.decode(token, secret_key, algorithms=["HS256"])
            email = payload.get("email")
            if email:
                return email
        except Exception as e:
            logger.debug(f"JWT decode non-blocking notice: {e}")

    if fallback_email and fallback_email.strip():
        return fallback_email.strip()

    return "student@campus.edu"


@recommendation_router.get("", response_model=RecommendationResponse)
async def get_personalized_recommendations(
    topic: Optional[str] = Query(None, description="Optional subject or topic filter"),
    email: Optional[str] = Query(None, description="Optional student email override"),
    limit: int = Query(5, ge=1, le=20, description="Max number of recommendations"),
    authorization: Optional[str] = Header(None)
):
    """
    Generate transparent, AI-ranked personalized YouTube learning recommendations
    based on student quiz weaknesses, uploaded notes (RAG), and vector similarity.
    """
    student_email = extract_email_from_token(authorization, email)
    service = get_recommendation_service()

    try:
        response = service.get_recommendations_for_student(
            email=student_email,
            topic=topic,
            limit=limit
        )
        return response
    except Exception as ex:
        logger.error(f"Error generating recommendations: {ex}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate recommendations. Please try again later."
        )


@recommendation_router.get("/youtube")
async def get_youtube_raw_candidates(
    topic: str = Query(..., min_length=2, description="Topic to search on YouTube"),
    limit: int = Query(5, ge=1, le=20),
):
    """
    Direct candidate retrieval from YouTube Data API (with caching & graceful fallback).
    """
    yt = YouTubeService()
    try:
        candidates = yt.search(query=topic, limit=limit)
        return {
            "topic": topic,
            "count": len(candidates),
            "candidates": candidates
        }
    except Exception as ex:
        logger.error(f"YouTube search error: {ex}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="YouTube search failed."
        )


@recommendation_router.post("/interaction", status_code=status.HTTP_201_CREATED)
async def record_recommendation_interaction(
    payload: InteractionRequest,
    email: Optional[str] = Query(None),
    authorization: Optional[str] = Header(None)
):
    """
    Record user action on a video: 'recommended', 'clicked', 'watched', 'completed', 'skipped'.
    """
    student_email = extract_email_from_token(authorization, email)
    service = get_recommendation_service()

    try:
        service.record_interaction(
            email=student_email,
            video_id=payload.video_id,
            topic=payload.topic,
            action=payload.action,
            watch_time=payload.watch_time_seconds or 0
        )
        return {"status": "success", "message": f"Recorded action '{payload.action}'"}
    except Exception as ex:
        logger.error(f"Failed to record interaction: {ex}")
        raise HTTPException(status_code=500, detail="Database write failure.")


@recommendation_router.post("/assessment-result", status_code=status.HTTP_201_CREATED)
async def record_quiz_assessment(
    payload: AssessmentResultRequest,
    email: Optional[str] = Query(None),
    authorization: Optional[str] = Header(None)
):
    """
    Record an exam or quiz score to dynamically trigger personalized learning gap detection.
    """
    student_email = extract_email_from_token(authorization, email)
    service = get_recommendation_service()

    try:
        service.learning_gap_service.record_assessment(
            email=student_email,
            subject=payload.subject,
            topic=payload.topic,
            score_pct=payload.score_percentage,
            total=payload.total_questions,
            correct=payload.correct_answers,
            missed=payload.missed_topics or []
        )
        return {
            "status": "success",
            "message": f"Assessment recorded. Learning gaps updated for {payload.topic}."
        }
    except Exception as ex:
        logger.error(f"Failed to record assessment result: {ex}")
        raise HTTPException(status_code=500, detail="Database write failure.")

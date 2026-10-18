from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class VideoRecommendation(BaseModel):
    video_id: str
    title: str
    channel: str
    thumbnail: str
    url: str
    topic: str
    duration: Optional[str] = None
    published_at: Optional[str] = None
    difficulty: str = "Intermediate"
    semantic_score: float = Field(..., ge=0.0, le=1.0)
    learning_gap_score: float = Field(..., ge=0.0, le=1.0)
    difficulty_score: float = Field(..., ge=0.0, le=1.0)
    freshness_score: float = Field(..., ge=0.0, le=1.0)
    engagement_score: float = Field(..., ge=0.0, le=1.0)
    final_score: float = Field(..., ge=0.0, le=1.0)
    reason: str

class LearningGapDetail(BaseModel):
    topic: str
    subtopic: Optional[str] = None
    source: str  # "quiz_assessment" | "rag_document" | "student_profile" | "cold_start"
    severity_score: float = Field(..., ge=0.0, le=1.0)
    explanation: str
    suggested_difficulty: str = "Beginner"

class RecommendationResponse(BaseModel):
    topic: str
    reason: str
    learning_gap: LearningGapDetail
    source: str  # "youtube_api" | "cached" | "curated_fallback"
    weights: Dict[str, float]
    recommendations: List[VideoRecommendation]

class InteractionRequest(BaseModel):
    video_id: str
    topic: str
    action: str = Field(..., description="recommended | clicked | watched | completed | skipped")
    watch_time_seconds: Optional[int] = 0

class AssessmentResultRequest(BaseModel):
    subject: str
    topic: str
    score_percentage: float = Field(..., ge=0.0, le=100.0)
    total_questions: int
    correct_answers: int
    missed_topics: Optional[List[str]] = []

import os
import math
import logging
from dataclasses import dataclass
from datetime import datetime
from typing import List, Dict, Any, Optional
from pymongo import MongoClient

from .youtube_service import YouTubeService
from .embedding_service import EmbeddingService
from .learning_gap_service import LearningGapService
from models.recommendation_models import VideoRecommendation, RecommendationResponse, LearningGapDetail

logger = logging.getLogger(__name__)

@dataclass
class RecommendationWeights:
    semantic: float = 0.50
    learning_gap: float = 0.20
    difficulty: float = 0.10
    freshness: float = 0.10
    engagement: float = 0.10

    def as_dict(self) -> Dict[str, float]:
        return {
            "semantic_similarity": self.semantic,
            "learning_gap_alignment": self.learning_gap,
            "difficulty_match": self.difficulty,
            "freshness": self.freshness,
            "community_engagement": self.engagement,
        }

class RecommendationService:
    """
    Core AI recommendation engine for SYNAPTIQ.
    Combines student diagnostic performance, vector embeddings, multi-factor scoring,
    channel diversity, and explainable recommendations.
    """

    def __init__(
        self,
        youtube_service: Optional[YouTubeService] = None,
        embedding_service: Optional[EmbeddingService] = None,
        learning_gap_service: Optional[LearningGapService] = None,
        weights: Optional[RecommendationWeights] = None,
    ):
        self.youtube_service = youtube_service or YouTubeService()
        self.embedding_service = embedding_service or EmbeddingService()
        self.learning_gap_service = learning_gap_service or LearningGapService()
        self.weights = weights or RecommendationWeights()

        # Database connection for interaction history
        mongo_uri = os.getenv("MONGODB_URI", "mongodb://localhost:27017/")
        mongo_db = os.getenv("MONGODB_DB", "ai_campus")
        try:
            self.mongo_client = MongoClient(mongo_uri, serverSelectionTimeoutMS=2000)
            self.db = self.mongo_client[mongo_db]
        except Exception:
            self.mongo_client = None
            self.db = None

    def get_recommendations_for_student(
        self,
        email: str,
        topic: Optional[str] = None,
        limit: int = 5
    ) -> RecommendationResponse:
        """
        Full recommendation pipeline:
        Gap detection -> YouTube candidates -> Embeddings -> Multi-factor ranking -> Diversity filter -> Response
        """
        # 1. Detect Student Learning Gap
        gap_info = self.learning_gap_service.detect_primary_gap(email, explicit_topic=topic)
        target_topic = gap_info["topic"]
        subtopic = gap_info.get("subtopic", target_topic)
        difficulty_target = gap_info.get("suggested_difficulty", "Beginner")

        # 2. Fetch candidate resources
        candidates = self.youtube_service.search(query=target_topic, limit=max(limit * 3, 12))
        if not candidates:
            candidates = self.youtube_service._get_fallback_candidates(target_topic, limit=10)

        # 3. Retrieve student interaction history to filter completed/skipped videos
        excluded_ids = self._get_interacted_video_ids(email)
        filtered_candidates = [c for c in candidates if c.get("video_id") not in excluded_ids]
        if not filtered_candidates:
            filtered_candidates = candidates  # Fallback if student interacted with all

        # 4. Formulate learning need prompt & Candidate texts
        learning_need_text = (
            f"Student needs a comprehensive educational lesson explaining {target_topic} "
            f"focusing on {subtopic}. Level: {difficulty_target}. Goal: Concept mastery with worked examples."
        )

        candidate_texts = [
            f"Title: {c.get('title', '')} | Channel: {c.get('channel', '')} | "
            f"Description: {c.get('description', '')[:300]} | Subject: {target_topic}"
            for c in filtered_candidates
        ]

        # 5. Compute semantic embeddings & similarities
        semantic_scores = self.embedding_service.compute_batch_similarities(
            query_text=learning_need_text,
            candidate_texts=candidate_texts
        )

        # 6. Multi-Factor Scoring
        scored_recommendations: List[VideoRecommendation] = []
        channel_counts: Dict[str, int] = {}

        for i, cand in enumerate(filtered_candidates):
            sem_score = semantic_scores[i] if i < len(semantic_scores) else 0.70
            gap_score = self._calc_learning_gap_score(cand, subtopic)
            diff_score, inferred_diff = self._calc_difficulty_score(cand, difficulty_target)
            fresh_score = self._calc_freshness_score(cand.get("published_at"))
            engage_score = self._calc_engagement_score(cand.get("view_count", 0), cand.get("like_count", 0))

            # Weighted final score calculation
            raw_final = (
                self.weights.semantic * sem_score
                + self.weights.learning_gap * gap_score
                + self.weights.difficulty * diff_score
                + self.weights.freshness * fresh_score
                + self.weights.engagement * engage_score
            )

            # Diversity adjustment: slightly penalize duplicate channels in top results
            channel_name = cand.get("channel", "Unknown")
            count = channel_counts.get(channel_name, 0)
            diversity_penalty = min(count * 0.05, 0.15)
            final_score = max(0.0, min(1.0, raw_final - diversity_penalty))
            channel_counts[channel_name] = count + 1

            # Generate transparent human explainability reason
            reason_text = self._generate_recommendation_reason(
                sem_score=sem_score,
                gap_score=gap_score,
                subtopic=subtopic,
                diff_label=inferred_diff,
                source=gap_info["source"]
            )

            rec = VideoRecommendation(
                video_id=cand.get("video_id", ""),
                title=cand.get("title", ""),
                channel=cand.get("channel", ""),
                thumbnail=cand.get("thumbnail", ""),
                url=cand.get("url", ""),
                topic=target_topic,
                duration=cand.get("duration", "15:00"),
                published_at=cand.get("published_at", ""),
                difficulty=inferred_diff,
                semantic_score=round(sem_score, 3),
                learning_gap_score=round(gap_score, 3),
                difficulty_score=round(diff_score, 3),
                freshness_score=round(fresh_score, 3),
                engagement_score=round(engage_score, 3),
                final_score=round(final_score, 3),
                reason=reason_text,
            )
            scored_recommendations.append(rec)

        # 7. Rank by final score descending
        scored_recommendations.sort(key=lambda r: r.final_score, reverse=True)
        top_recommendations = scored_recommendations[:limit]

        provider_source = "youtube_api" if self.youtube_service.api_key else "curated_fallback"

        learning_gap_model = LearningGapDetail(
            topic=target_topic,
            subtopic=subtopic,
            source=gap_info["source"],
            severity_score=gap_info["severity_score"],
            explanation=gap_info["explanation"],
            suggested_difficulty=difficulty_target
        )

        return RecommendationResponse(
            topic=target_topic,
            reason=gap_info["explanation"],
            learning_gap=learning_gap_model,
            source=provider_source,
            weights=self.weights.as_dict(),
            recommendations=top_recommendations,
        )

    def record_interaction(self, email: str, video_id: str, topic: str, action: str, watch_time: int = 0):
        """Track user interaction (recommended, clicked, watched, completed, skipped)."""
        if self.db is None:
            return

        import datetime
        try:
            self.db["recommendation_interactions"].insert_one({
                "email": email,
                "video_id": video_id,
                "topic": topic,
                "action": action,
                "watch_time_seconds": watch_time,
                "timestamp": datetime.datetime.utcnow()
            })
            logger.info(f"Recorded interaction '{action}' by {email} on video {video_id}")
        except Exception as e:
            logger.error(f"Failed to record interaction: {e}")

    def _get_interacted_video_ids(self, email: str) -> set:
        """Return video IDs marked as completed or skipped to avoid duplicate recommendations."""
        if self.db is None:
            return set()

        try:
            records = self.db["recommendation_interactions"].find(
                {"email": email, "action": {"$in": ["completed", "skipped"]}},
                {"video_id": 1}
            )
            return {r["video_id"] for r in records if "video_id" in r}
        except Exception:
            return set()

    def _calc_learning_gap_score(self, candidate: Dict[str, Any], subtopic: str) -> float:
        """Score how explicitly the candidate addresses the targeted subtopic."""
        text = f"{candidate.get('title', '')} {candidate.get('description', '')}".lower()
        subtopic_keywords = [w.lower() for w in subtopic.split() if len(w) > 3]

        if not subtopic_keywords:
            return 0.75

        matches = sum(1 for kw in subtopic_keywords if kw in text)
        ratio = matches / len(subtopic_keywords)
        return round(min(1.0, 0.40 + (0.60 * ratio)), 3)

    def _calc_difficulty_score(self, candidate: Dict[str, Any], target_level: str) -> tuple[float, str]:
        """Infer difficulty from duration and keywords, and return (score, label)."""
        duration_sec = candidate.get("duration_seconds", 900)
        title = candidate.get("title", "").lower()

        # Keyword heuristics
        if any(w in title for w in ["advanced", "internals", "in-depth", "architecture", "under the hood"]):
            inferred = "Advanced"
        elif any(w in title for w in ["beginner", "fundamentals", "basics", "intro", "explained simply", "crash course"]):
            inferred = "Beginner"
        else:
            inferred = "Intermediate" if duration_sec < 1800 else "Comprehensive"

        if target_level.lower() == inferred.lower():
            score = 1.0
        elif target_level == "Beginner" and inferred == "Intermediate":
            score = 0.80
        elif target_level == "Intermediate" and inferred in ["Beginner", "Comprehensive"]:
            score = 0.85
        else:
            score = 0.65

        return score, inferred

    def _calc_freshness_score(self, published_at: Optional[str]) -> float:
        """Normalized freshness decay based on video publication year."""
        if not published_at:
            return 0.70

        try:
            pub_year = int(published_at[:4])
            current_year = datetime.utcnow().year
            diff = max(0, current_year - pub_year)
            # 0 years old -> 1.0; 1 yr -> 0.90; 2 yr -> 0.82; 5 yr -> 0.60
            freshness = math.exp(-0.10 * diff)
            return round(min(1.0, max(0.40, freshness)), 3)
        except Exception:
            return 0.70

    def _calc_engagement_score(self, views: int, likes: int) -> float:
        """Log-scaled community engagement score based on views and like counts."""
        if views <= 0:
            return 0.60

        # Log scale: 10k views ~ 0.65, 100k views ~ 0.80, 1M+ views ~ 0.95
        log_views = math.log10(views + 1)
        normalized = min(1.0, max(0.30, log_views / 7.0))
        return round(normalized, 3)

    def _generate_recommendation_reason(
        self,
        sem_score: float,
        gap_score: float,
        subtopic: str,
        diff_label: str,
        source: str
    ) -> str:
        """Generate human-readable, transparent explanation for WHY the video was picked."""
        match_pct = int(sem_score * 100)

        if source == "quiz_assessment":
            return f"{match_pct}% semantic match for your assessment weak point: {subtopic}. Matches {diff_label} learning pace."
        elif source == "rag_document":
            return f"Alters directly to syllabus concepts in your uploaded notes. Highly rated {diff_label} breakdown."
        elif source == "explicit_request":
            return f"Top curated {diff_label} tutorial covering {subtopic} with strong community verification."
        else:
            return f"{match_pct}% relevance to university core curriculum. Step-by-step {diff_label} explanation."

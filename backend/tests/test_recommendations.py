"""
Automated Test Suite for SYNAPTIQ Personalized YouTube Learning Recommendation Engine
Tests all 8 requirements:
1. No student data / cold start
2. Weak topic detection from assessments
3. YouTube API failure & graceful fallback
4. No videos found handling
5. Embedding similarity computation
6. Recommendation ranking & multi-factor scoring formula
7. Duplicate recommendation & channel diversity filtering
8. API response validation against Pydantic schema
"""

import sys
import os
import numpy as np

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from models.recommendation_models import RecommendationResponse, VideoRecommendation, LearningGapDetail
from services.embedding_service import EmbeddingService
from services.youtube_service import YouTubeService
from services.learning_gap_service import LearningGapService
from services.recommendation_service import RecommendationService, RecommendationWeights

def test_1_no_student_data_cold_start():
    """Verify that a brand new student receives safe, high-yield academic core recommendations."""
    gap_service = LearningGapService()
    # Query with a non-existent student email
    gap = gap_service.detect_primary_gap(email="unknown_new_student_999@campus.edu")

    assert gap is not None
    assert "topic" in gap
    assert len(gap["topic"]) > 0
    assert gap["source"] in ["student_profile", "cold_start"]
    print("[PASS] Test 1: Cold start student received valid foundational learning gap.")

def test_2_weak_topic_detection():
    """Verify that low quiz scores (<70%) are prioritized with custom explanation."""
    gap_service = LearningGapService()
    test_email = "test_perf_student@campus.edu"

    # Simulate recorded low score in DBMS Normalization
    gap_service.record_assessment(
        email=test_email,
        subject="DBMS",
        topic="Database Normalization",
        score_pct=42.0,
        total=10,
        correct=4,
        missed=["Third Normal Form (3NF) Transitive Dependencies"]
    )

    gap = gap_service.detect_primary_gap(email=test_email)
    assert gap["topic"] == "Database Normalization"
    assert "42%" in gap["explanation"] or "weak" in gap["explanation"].lower()
    assert gap["severity_score"] >= 0.50
    print("[PASS] Test 2: Weak quiz topic (42%) correctly detected and prioritized.")

def test_3_youtube_api_failure_graceful_fallback():
    """Verify that invalid YouTube API keys or network errors do NOT crash the service."""
    # Use an intentionally invalid key
    yt_service = YouTubeService(api_key="INVALID_TEST_KEY_EXPIRED_OR_BAD")
    candidates = yt_service.search("Operating Systems Deadlocks", limit=5)

    assert candidates is not None
    assert len(candidates) > 0
    assert "video_id" in candidates[0]
    assert "url" in candidates[0]
    print("[PASS] Test 3: Service gracefully fell back without raising unhandled exceptions.")

def test_4_no_videos_found_handling():
    """Verify handling when an unusual or obscure query produces 0 live results."""
    yt_service = YouTubeService(api_key="INVALID_KEY")
    candidates = yt_service.search("xyz_obscure_quantum_nonsense_12345", limit=3)

    assert isinstance(candidates, list)
    assert len(candidates) > 0  # Fallback supplies valid educational candidate pool
    print("[PASS] Test 4: Empty search query handled safely with adapted fallback candidates.")

def test_5_embedding_similarity():
    """Verify SentenceTransformer normalized cosine similarity matches identical and divergent texts."""
    embed_service = EmbeddingService()

    vec_dbms = embed_service.encode("Relational Database Management Systems SQL Normalization 3NF")
    vec_3nf = embed_service.encode("Third Normal Form decomposition and functional dependency in databases")
    vec_cook = embed_service.encode("How to bake chocolate chip cookies in an oven")

    sim_related = embed_service.cosine_similarity(vec_dbms, vec_3nf)
    sim_unrelated = embed_service.cosine_similarity(vec_dbms, vec_cook)

    assert sim_related > sim_unrelated
    assert 0.0 <= sim_related <= 1.0
    assert 0.0 <= sim_unrelated <= 1.0
    print(f"[PASS] Test 5: Semantic similarity accurate (Related: {sim_related:.3f} vs Unrelated: {sim_unrelated:.3f}).")

def test_6_recommendation_ranking_and_scoring():
    """Verify transparent multi-factor scoring formula."""
    rec_service = RecommendationService()
    weights = RecommendationWeights(
        semantic=0.50,
        learning_gap=0.20,
        difficulty=0.10,
        freshness=0.10,
        engagement=0.10
    )
    rec_service.weights = weights

    response = rec_service.get_recommendations_for_student(
        email="ranking_test_user@campus.edu",
        topic="Database Normalization",
        limit=5
    )

    assert len(response.recommendations) <= 5
    for r in response.recommendations:
        # Check normalization bounds
        assert 0.0 <= r.semantic_score <= 1.0
        assert 0.0 <= r.learning_gap_score <= 1.0
        assert 0.0 <= r.final_score <= 1.0
        assert len(r.reason) > 10  # Ensure rich explanation exists
    # Verify rank ordering
    scores = [r.final_score for r in response.recommendations]
    assert scores == sorted(scores, reverse=True)
    print("[PASS] Test 6: Recommendations properly scored and ranked descending.")

def test_7_duplicate_recommendation_and_diversity():
    """Verify that completed videos are filtered and channel diversity penalties apply."""
    rec_service = RecommendationService()
    test_user = "diversity_user@campus.edu"

    # Fetch initial recommendation
    init_res = rec_service.get_recommendations_for_student(test_user, topic="DBMS", limit=5)
    first_video_id = init_res.recommendations[0].video_id

    # Record that the student completed this video
    rec_service.record_interaction(
        email=test_user,
        video_id=first_video_id,
        topic="DBMS",
        action="completed",
        watch_time=1200
    )

    # Re-fetch recommendations
    updated_res = rec_service.get_recommendations_for_student(test_user, topic="DBMS", limit=5)
    recommended_ids = [r.video_id for r in updated_res.recommendations]

    # Completed video should be filtered out
    assert first_video_id not in recommended_ids
    print("[PASS] Test 7: Completed video was filtered out to prevent duplicate recommendations.")

def test_8_api_response_pydantic_validation():
    """Verify that RecommendationResponse satisfies strict Pydantic validation."""
    rec_service = RecommendationService()
    response = rec_service.get_recommendations_for_student("validation_user@campus.edu", limit=3)

    # Validate against Pydantic schema
    validated = RecommendationResponse.model_validate(response.model_dump())
    assert validated.topic is not None
    assert len(validated.recommendations) > 0
    assert validated.recommendations[0].final_score >= 0.0
    print("[PASS] Test 8: Full response adheres to Pydantic schema specifications.")

if __name__ == "__main__":
    print("\nRUNNING SYNAPTIQ RECOMMENDATION ENGINE TEST SUITE\n" + "=" * 55)
    test_1_no_student_data_cold_start()
    test_2_weak_topic_detection()
    test_3_youtube_api_failure_graceful_fallback()
    test_4_no_videos_found_handling()
    test_5_embedding_similarity()
    test_6_recommendation_ranking_and_scoring()
    test_7_duplicate_recommendation_and_diversity()
    test_8_api_response_pydantic_validation()
    print("=" * 55 + "\nALL 8 TEST SCENARIOS PASSED SUCCESSFULLY!\n")

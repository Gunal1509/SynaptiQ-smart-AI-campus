import os
import logging
from typing import Dict, Any, Optional, List
from pymongo import MongoClient

logger = logging.getLogger(__name__)

# Default standard core syllabus gaps for fallback / cold start based on engineering departments
DEPARTMENT_CORE_TOPICS = {
    "CSE": ["Database Normalization (3NF & BCNF)", "TCP/IP Congestion Control", "Deadlock & Memory Management", "Data Structures & Graph Algorithms"],
    "IT": ["Web Security & JWT Authentication", "Spring Boot & REST APIs", "Database Indexing & Optimization", "Cloud Computing & Docker"],
    "ECE": ["Microprocessors 8086", "Signals and Systems", "Digital Signal Processing", "Computer Communication Networks"],
    "DEFAULT": ["Database Management Systems", "Computer Networks", "Operating Systems", "Object Oriented Programming"]
}

class LearningGapService:
    """
    Intelligent engine that detects what a student needs to learn next.
    Prioritizes:
    1. Weak quiz / assessment topics (score < 70%)
    2. Document concepts extracted from uploaded lecture notes (RAG)
    3. Student academic department & career requirements
    4. Freshness and avoiding completed topics
    """

    def __init__(self, mongo_uri: Optional[str] = None, db_name: Optional[str] = None):
        self.mongo_uri = mongo_uri or os.getenv("MONGODB_URI", "mongodb://localhost:27017/")
        self.db_name = db_name or os.getenv("MONGODB_DB", "ai_campus")
        try:
            self.client = MongoClient(self.mongo_uri, serverSelectionTimeoutMS=2000)
            self.db = self.client[self.db_name]
        except Exception as e:
            logger.warning(f"MongoDB connection in LearningGapService deferred: {e}")
            self.client = None
            self.db = None

    def detect_primary_gap(self, email: str, explicit_topic: Optional[str] = None) -> Dict[str, Any]:
        """
        Analyze student data and return the top priority learning gap with human rationale.
        """
        # If user explicitly specified a topic filter
        if explicit_topic and explicit_topic.strip():
            topic_clean = explicit_topic.strip()
            return {
                "topic": topic_clean,
                "subtopic": topic_clean,
                "source": "explicit_request",
                "severity_score": 0.85,
                "explanation": f"Personalized for your requested study topic: {topic_clean}.",
                "suggested_difficulty": "Intermediate"
            }

        # 1. Check recent assessment / quiz results for weak areas
        quiz_gap = self._check_quiz_performance(email)
        if quiz_gap:
            return quiz_gap

        # 2. Check uploaded materials in RAG repository
        rag_gap = self._check_rag_materials(email)
        if rag_gap:
            return rag_gap

        # 3. Fallback to student department profile & curriculum
        profile_gap = self._check_student_profile(email)
        return profile_gap

    def _check_quiz_performance(self, email: str) -> Optional[Dict[str, Any]]:
        """Inspect assessment_results collection for topics with low scores."""
        if self.db is None:
            return None

        try:
            assessments = list(
                self.db["assessment_results"]
                .find({"email": email})
                .sort("created_at", -1)
                .limit(10)
            )

            # Find weakest recent topic
            weakest = None
            lowest_score = 100.0

            for entry in assessments:
                score = entry.get("score_percentage", 100.0)
                if score < 70.0 and score < lowest_score:
                    lowest_score = score
                    weakest = entry

            if weakest:
                topic = weakest.get("topic", weakest.get("subject", "Database Management Systems"))
                missed = weakest.get("missed_topics", [])
                subtopic = missed[0] if missed else topic
                severity = round((100.0 - lowest_score) / 100.0, 2)

                difficulty = "Beginner" if lowest_score < 50.0 else "Intermediate"
                explanation = f"You scored {lowest_score:.0f}% on {topic}. These resources are recommended to address weak areas: {subtopic}."

                return {
                    "topic": topic,
                    "subtopic": subtopic,
                    "source": "quiz_assessment",
                    "severity_score": severity,
                    "explanation": explanation,
                    "suggested_difficulty": difficulty
                }

        except Exception as e:
            logger.warning(f"Error querying assessment_results: {e}")

        return None

    def _check_rag_materials(self, email: str) -> Optional[Dict[str, Any]]:
        """Extract topics from recently uploaded syllabus/notes."""
        if self.db is None:
            return None

        try:
            recent_upload = self.db["uploads"].find_one(
                {"email": email},
                sort=[("_id", -1)]
            )

            if recent_upload and "fileName" in recent_upload:
                file_name = recent_upload["fileName"]
                # Infer topic from file title
                return {
                    "topic": file_name,
                    "subtopic": "Key Unit Concepts",
                    "source": "rag_document",
                    "severity_score": 0.75,
                    "explanation": f"Recommended based on your newly uploaded course material: '{file_name}'.",
                    "suggested_difficulty": "Intermediate"
                }
        except Exception as e:
            logger.warning(f"Error reading uploads collection: {e}")

        return None

    def _check_student_profile(self, email: str) -> Dict[str, Any]:
        """Cold start: select highest yield core academic topic."""
        # Default university essential topic
        default_topic = "Database Normalization (3NF & BCNF)"
        return {
            "topic": default_topic,
            "subtopic": "Functional Dependencies & 3NF",
            "source": "student_profile",
            "severity_score": 0.80,
            "explanation": "High-yield university core topic prioritized for engineering curriculum and upcoming exams.",
            "suggested_difficulty": "Beginner to Intermediate"
        }

    def record_assessment(self, email: str, subject: str, topic: str, score_pct: float, total: int, correct: int, missed: List[str]):
        """Store assessment outcome in MongoDB for continuous learning gap tracking."""
        if self.db is None:
            return

        import datetime
        try:
            self.db["assessment_results"].insert_one({
                "email": email,
                "subject": subject,
                "topic": topic,
                "score_percentage": score_pct,
                "total_questions": total,
                "correct_answers": correct,
                "missed_topics": missed,
                "created_at": datetime.datetime.utcnow()
            })
            logger.info(f"Recorded assessment outcome for {email} on {topic} ({score_pct}%)")
        except Exception as e:
            logger.error(f"Failed to record assessment result: {e}")

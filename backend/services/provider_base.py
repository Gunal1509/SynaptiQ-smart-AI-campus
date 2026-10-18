from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional

class LearningResourceProvider(ABC):
    """
    Abstract base provider for educational content sources.
    Enables future pluggable providers (YouTube, Coursera, Udemy, LMS, Institutional Repositories)
    without rewriting the recommendation scoring and ranking pipeline.
    """

    @abstractmethod
    def search(self, query: str, limit: int = 10, **kwargs) -> List[Dict[str, Any]]:
        """
        Search learning resources matching query.
        Returns a list of standardized resource dictionaries.
        """
        pass

    @abstractmethod
    def get_resource(self, resource_id: str) -> Optional[Dict[str, Any]]:
        """Retrieve single resource details and metadata."""
        pass

    @abstractmethod
    def get_metadata(self) -> Dict[str, Any]:
        """Provider identification and capability metadata."""
        pass

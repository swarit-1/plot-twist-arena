"""
Content moderation filter for plot twists
Blocks unsafe/inappropriate content
"""
from typing import Dict, List
import re


class ContentModerator:
    def __init__(self):
        # Blocklist of inappropriate terms (simplified)
        self.blocklist_patterns = [
            r'\b(explicit|sexual|violent|gore)\b',
            r'\b(hate|racist|sexist)\b',
        ]

        # Severity thresholds
        self.severity_scores = {
            'violence': ['kill', 'murder', 'blood', 'death'],
            'sexual': ['sexual', 'explicit'],
            'hate': ['hate', 'racist'],
        }

    def moderate(self, text: str) -> Dict:
        """
        Moderate content and return result

        Returns:
        {
            'approved': bool,
            'flagged_categories': List[str],
            'severity': str,  # 'safe', 'mild', 'moderate', 'severe'
            'message': str
        }
        """

        text_lower = text.lower()

        # Check blocklist
        flagged = []

        for pattern in self.blocklist_patterns:
            if re.search(pattern, text_lower):
                flagged.append(pattern)

        # Score severity by category
        category_scores = {}

        for category, terms in self.severity_scores.items():
            score = sum(1 for term in terms if term in text_lower)
            if score > 0:
                category_scores[category] = score

        # Determine overall severity
        if not category_scores:
            severity = 'safe'
            approved = True
            message = 'Content approved'
        elif max(category_scores.values()) == 1:
            severity = 'mild'
            approved = True  # Allow mild references in context
            message = 'Content contains mild elements but is approved'
        elif max(category_scores.values()) <= 3:
            severity = 'moderate'
            approved = False
            message = 'Content contains moderate inappropriate elements'
        else:
            severity = 'severe'
            approved = False
            message = 'Content contains severe inappropriate elements and is blocked'

        return {
            'approved': approved,
            'flagged_categories': list(category_scores.keys()),
            'severity': severity,
            'message': message
        }


# Global instance
_moderator = None


def get_moderator() -> ContentModerator:
    """Get or create moderator instance"""
    global _moderator
    if _moderator is None:
        _moderator = ContentModerator()
    return _moderator

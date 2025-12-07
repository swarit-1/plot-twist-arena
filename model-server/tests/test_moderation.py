"""
Tests for content moderation
"""
import pytest
from moderation import ContentModerator


@pytest.fixture
def moderator():
    return ContentModerator()


def test_safe_content_approved(moderator):
    """Safe content should be approved"""
    result = moderator.moderate("The protagonist discovers they are the chosen one")

    assert result['approved'] is True
    assert result['severity'] == 'safe'


def test_mild_content_approved(moderator):
    """Mild content should be approved with warning"""
    result = moderator.moderate("The detective solves the murder case")

    assert result['approved'] is True
    assert result['severity'] in ['safe', 'mild']


def test_severe_content_blocked(moderator):
    """Severe violent content should be blocked"""
    result = moderator.moderate("Explicit violent gore blood kill death sexual")

    assert result['approved'] is False
    assert result['severity'] in ['moderate', 'severe']


def test_returns_flagged_categories(moderator):
    """Should identify flagged content categories"""
    result = moderator.moderate("violent murder death")

    assert 'violence' in result['flagged_categories']

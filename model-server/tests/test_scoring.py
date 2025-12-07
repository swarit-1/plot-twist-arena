"""
Tests for hybrid scoring module
"""
import pytest
from scoring import TwistScorer


@pytest.fixture
def scorer():
    return TwistScorer()


def test_identical_twists_score_high(scorer):
    """Identical twists should score very high"""
    twist = "The protagonist was dead all along"
    result = scorer.score_guess(twist, twist)

    assert result['score'] >= 95
    assert result['confidence'] > 0.7


def test_paraphrase_scores_higher_than_unrelated(scorer):
    """Paraphrases should score higher than unrelated text"""
    reference = "The butler committed the murder"

    paraphrase = "The servant killed the victim"
    unrelated = "The spaceship landed on Mars"

    para_result = scorer.score_guess(paraphrase, reference)
    unrel_result = scorer.score_guess(unrelated, reference)

    assert para_result['score'] > unrel_result['score']
    assert para_result['breakdown']['semantic_similarity'] > unrel_result['breakdown']['semantic_similarity']


def test_lexical_overlap_detection(scorer):
    """Should detect shared and missing tokens"""
    guess = "The detective was the killer"
    reference = "The detective committed the murder"

    result = scorer.score_guess(guess, reference)

    assert 'detective' in result['breakdown']['shared_tokens']
    assert len(result['breakdown']['missing_tokens']) > 0


def test_tag_matching_boosts_score(scorer):
    """Tags should influence score"""
    guess = "The narrator was unreliable"
    reference = "The narrator lied about everything"

    with_tags = scorer.score_guess(
        guess,
        reference,
        guess_tags=['unreliable narrator'],
        reference_tags=['unreliable narrator', 'deception']
    )

    without_tags = scorer.score_guess(guess, reference)

    # With matching tags should score slightly higher
    assert with_tags['score'] >= without_tags['score']


def test_justification_generated(scorer):
    """Should generate human-readable justification"""
    guess = "The protagonist discovers they are an AI"
    reference = "The main character is revealed to be artificial intelligence"

    result = scorer.score_guess(guess, reference)

    assert isinstance(result['justification'], str)
    assert len(result['justification']) > 20  # Substantial text
    assert any(word in result['justification'].lower() for word in ['match', 'close', 'guess', 'correct'])


def test_score_range_valid(scorer):
    """Scores should be in valid 0-100 range"""
    examples = [
        ("The twist is X", "The twist is Y"),
        ("A is B", "C is D"),
        ("Same thing", "Same thing"),
    ]

    for guess, ref in examples:
        result = scorer.score_guess(guess, ref)
        assert 0 <= result['score'] <= 100
        assert 0 <= result['confidence'] <= 1


def test_confidence_increases_with_text_length(scorer):
    """Longer, clearer texts should have higher confidence"""
    short_guess = "X is Y"
    long_guess = "The protagonist discovers that they have been living in a simulated reality controlled by an AI"

    reference = "The character learns they are in a simulation"

    short_result = scorer.score_guess(short_guess, reference)
    long_result = scorer.score_guess(long_guess, reference)

    # Longer text should generally have higher confidence
    assert long_result['confidence'] >= short_result['confidence'] * 0.8  # Allow some variance

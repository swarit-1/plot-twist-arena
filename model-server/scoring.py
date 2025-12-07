"""
Hybrid scoring module for plot twist similarity
Combines semantic, lexical, and tag-based scoring with explanations
"""
from typing import List, Dict, Optional
from sentence_transformers import SentenceTransformer, util
import numpy as np
from collections import Counter
import re


class TwistScorer:
    def __init__(self, embedding_model_name: str = 'all-MiniLM-L6-v2'):
        """Initialize the scoring system"""
        self.embedding_model = SentenceTransformer(embedding_model_name)

    def _tokenize(self, text: str) -> List[str]:
        """Simple tokenization for lexical matching"""
        return re.findall(r'\w+', text.lower())

    def _compute_semantic_similarity(self, guess: str, reference: str) -> float:
        """Compute cosine similarity between embeddings"""
        guess_embedding = self.embedding_model.encode(guess, convert_to_tensor=True)
        reference_embedding = self.embedding_model.encode(reference, convert_to_tensor=True)

        similarity = util.cos_sim(guess_embedding, reference_embedding).item()
        return max(0.0, min(1.0, similarity))

    def _compute_lexical_overlap(self, guess: str, reference: str) -> Dict[str, float]:
        """Compute BLEU-like lexical overlap"""
        guess_tokens = set(self._tokenize(guess))
        reference_tokens = set(self._tokenize(reference))

        if not reference_tokens:
            return {'overlap': 0.0, 'shared_tokens': [], 'missing_tokens': []}

        shared = guess_tokens & reference_tokens
        missing = reference_tokens - guess_tokens

        overlap = len(shared) / len(reference_tokens)

        return {
            'overlap': overlap,
            'shared_tokens': sorted(list(shared))[:10],  # Top 10
            'missing_tokens': sorted(list(missing))[:10]
        }

    def _compute_tag_match(self, guess_tags: List[str], reference_tags: List[str]) -> float:
        """Compute tag overlap score"""
        if not reference_tags:
            return 0.5  # Neutral if no tags provided

        guess_set = set(tag.lower() for tag in (guess_tags or []))
        reference_set = set(tag.lower() for tag in reference_tags)

        if not reference_set:
            return 0.5

        intersection = guess_set & reference_set
        return len(intersection) / len(reference_set)

    def _calibrate_score(self, semantic: float, lexical: float, tag: float) -> int:
        """
        Calibrate raw similarities to 0-100 scale with weighted combination

        Weights:
        - Semantic: 60% (most important)
        - Lexical: 30%
        - Tag: 10%
        """
        weights = {
            'semantic': 0.6,
            'lexical': 0.3,
            'tag': 0.1
        }

        raw_score = (
            semantic * weights['semantic'] +
            lexical * weights['lexical'] +
            tag * weights['tag']
        )

        # Apply calibration curve (sigmoid-like)
        # Boost scores in mid-range, compress extremes
        calibrated = raw_score

        if raw_score < 0.3:
            # Low scores stay low
            calibrated = raw_score * 0.8
        elif raw_score > 0.7:
            # High scores get slight boost
            calibrated = 0.7 + (raw_score - 0.7) * 1.2
        else:
            # Mid-range gets standard scaling
            calibrated = raw_score

        score = int(max(0, min(100, calibrated * 100)))
        return score

    def _generate_justification(
        self,
        score: int,
        semantic_sim: float,
        lexical_data: Dict,
        tag_match: float,
        confidence: float
    ) -> str:
        """Generate human-readable explanation"""

        # Score tier
        if score >= 90:
            tier = "Excellent match!"
        elif score >= 75:
            tier = "Very close guess."
        elif score >= 60:
            tier = "Good attempt."
        elif score >= 40:
            tier = "Partially correct."
        else:
            tier = "Quite different from the actual twist."

        # Semantic analysis
        if semantic_sim > 0.8:
            semantic_desc = "Your guess captures the core meaning very well."
        elif semantic_sim > 0.6:
            semantic_desc = "Your guess shares significant thematic elements."
        elif semantic_sim > 0.4:
            semantic_desc = "Your guess has some conceptual overlap."
        else:
            semantic_desc = "Your guess differs substantially in meaning."

        # Lexical analysis
        shared = lexical_data.get('shared_tokens', [])
        missing = lexical_data.get('missing_tokens', [])

        if len(shared) > 5:
            lexical_desc = f"You used many key terms: {', '.join(shared[:5])}."
        elif len(shared) > 0:
            lexical_desc = f"You identified some keywords: {', '.join(shared)}."
        else:
            lexical_desc = "Few matching keywords were found."

        if len(missing) > 0:
            missing_desc = f" Important missing elements: {', '.join(missing[:3])}."
        else:
            missing_desc = ""

        # Combine
        justification = f"{tier} {semantic_desc} {lexical_desc}{missing_desc}"

        # Add confidence note
        if confidence < 0.6:
            justification += " Note: This score has moderate uncertainty."

        return justification

    def score_guess(
        self,
        guess: str,
        reference: str,
        reference_tags: Optional[List[str]] = None,
        guess_tags: Optional[List[str]] = None
    ) -> Dict:
        """
        Comprehensive scoring with breakdown and explanation

        Returns:
        {
            'score': int (0-100),
            'confidence': float (0-1),
            'breakdown': {
                'semantic_similarity': float,
                'lexical_overlap': float,
                'tag_match': float,
                'shared_tokens': List[str],
                'missing_tokens': List[str]
            },
            'justification': str
        }
        """

        # Compute component scores
        semantic_sim = self._compute_semantic_similarity(guess, reference)
        lexical_data = self._compute_lexical_overlap(guess, reference)
        tag_match = self._compute_tag_match(guess_tags or [], reference_tags or [])

        # Calibrate to 0-100
        score = self._calibrate_score(semantic_sim, lexical_data['overlap'], tag_match)

        # Compute confidence (based on text lengths and semantic strength)
        guess_len = len(self._tokenize(guess))
        ref_len = len(self._tokenize(reference))

        # Confidence is higher when texts are substantial and semantic score is clear
        length_factor = min(guess_len, ref_len) / 20.0  # Normalize by ~20 tokens
        length_factor = min(1.0, max(0.3, length_factor))

        # Semantic certainty (scores near 0 or 1 are more certain)
        semantic_certainty = 1.0 - abs(semantic_sim - 0.5) * 2
        semantic_certainty = max(0.5, semantic_certainty)

        confidence = (length_factor + semantic_certainty) / 2

        # Generate explanation
        justification = self._generate_justification(
            score, semantic_sim, lexical_data, tag_match, confidence
        )

        return {
            'score': score,
            'confidence': round(confidence, 3),
            'breakdown': {
                'semantic_similarity': round(semantic_sim, 3),
                'lexical_overlap': round(lexical_data['overlap'], 3),
                'tag_match': round(tag_match, 3),
                'shared_tokens': lexical_data['shared_tokens'],
                'missing_tokens': lexical_data['missing_tokens']
            },
            'justification': justification
        }


# Global scorer instance
_scorer = None


def get_scorer() -> TwistScorer:
    """Get or create global scorer instance"""
    global _scorer
    if _scorer is None:
        _scorer = TwistScorer()
    return _scorer

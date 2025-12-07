"""
RAG-enhanced twist prediction
Uses retrieval to seed few-shot examples
"""
import json
import os
from pathlib import Path
from typing import List, Dict, Optional
import numpy as np
from sentence_transformers import SentenceTransformer
import yaml

try:
    import faiss
    FAISS_AVAILABLE = True
except ImportError:
    FAISS_AVAILABLE = False


class RAGTwistPredictor:
    def __init__(self, config_path: str = "config.yaml"):
        """Initialize RAG predictor"""
        # Load config
        with open(config_path, 'r') as f:
            self.config = yaml.safe_load(f)

        # Load embedding model
        self.embedding_model = SentenceTransformer(
            self.config['embedding_model']
        )

        # Load index and metadata
        self.index = None
        self.embeddings = None
        self.metadata = None

        self._load_index()

    def _load_index(self):
        """Load FAISS index and metadata"""
        rag_config = self.config['rag']

        # Load metadata
        metadata_path = Path(rag_config['metadata_path'])
        if metadata_path.exists():
            with open(metadata_path, 'r', encoding='utf-8') as f:
                self.metadata = json.load(f)
            print(f"Loaded {len(self.metadata)} twist metadata entries")
        else:
            print(f"Warning: Metadata not found at {metadata_path}")
            self.metadata = []

        # Load embeddings
        embeddings_path = Path(rag_config['embeddings_path'])
        if embeddings_path.exists():
            self.embeddings = np.load(embeddings_path)
            print(f"Loaded embeddings: {self.embeddings.shape}")
        else:
            print(f"Warning: Embeddings not found at {embeddings_path}")

        # Load FAISS index
        if FAISS_AVAILABLE:
            index_path = Path(rag_config['index_path'])
            if index_path.exists():
                self.index = faiss.read_index(str(index_path))
                print(f"Loaded FAISS index with {self.index.ntotal} entries")
            else:
                print(f"Warning: FAISS index not found at {index_path}")
        else:
            print("FAISS not available, using fallback retrieval")

    def retrieve_similar_twists(
        self,
        query_setup: str,
        top_k: int = None
    ) -> List[Dict]:
        """
        Retrieve top-K similar twists from the index

        Returns list of dictionaries with:
        - id, story_setup, twist, genre, tags, score
        """
        if top_k is None:
            top_k = self.config['rag']['top_k']

        if not self.metadata:
            return []

        # Encode query
        query_embedding = self.embedding_model.encode(
            query_setup,
            convert_to_tensor=False
        )

        if FAISS_AVAILABLE and self.index:
            # Use FAISS for fast retrieval
            query_norm = query_embedding / np.linalg.norm(query_embedding)
            query_norm = np.expand_dims(query_norm, 0)

            distances, indices = self.index.search(query_norm, top_k)

            results = []
            for idx, score in zip(indices[0], distances[0]):
                if idx < len(self.metadata):
                    result = self.metadata[idx].copy()
                    result['retrieval_score'] = float(score)
                    results.append(result)

            return results

        else:
            # Fallback: compute similarities manually
            from sentence_transformers import util

            query_tensor = self.embedding_model.encode(
                query_setup,
                convert_to_tensor=True
            )

            # Encode all setups (inefficient but works)
            corpus_texts = [m['story_setup'] for m in self.metadata]
            corpus_embeddings = self.embedding_model.encode(
                corpus_texts,
                convert_to_tensor=True
            )

            similarities = util.cos_sim(query_tensor, corpus_embeddings)[0]

            # Get top K
            top_indices = similarities.argsort(descending=True)[:top_k]

            results = []
            for idx in top_indices:
                idx_int = int(idx)
                result = self.metadata[idx_int].copy()
                result['retrieval_score'] = float(similarities[idx])
                results.append(result)

            return results

    def build_few_shot_prompt(
        self,
        query_setup: str,
        genre: Optional[str] = None,
        num_predictions: int = 3
    ) -> str:
        """
        Build a prompt with retrieved examples as few-shot context
        """

        # Retrieve similar examples
        retrieved = self.retrieve_similar_twists(query_setup, top_k=5)

        # Build prompt
        system_msg = """You are a plot twist prediction expert. Given a story setup, predict the most likely plot twist.

Here are some examples of story setups and their twists:
"""

        # Add few-shot examples
        for i, example in enumerate(retrieved[:3], 1):
            system_msg += f"\nExample {i}:\n"
            system_msg += f"Setup: {example['story_setup']}\n"
            system_msg += f"Twist: {example['twist']}\n"

        # Add user query
        user_msg = f"""
Now, predict {num_predictions} possible plot twists for this story:

Genre: {genre or 'unknown'}
Setup: {query_setup}

List {num_predictions} possible twists (number each):
"""

        prompt = f"""<|begin_of_text|><|start_header_id|>system<|end_header_id|>
{system_msg}<|eot_id|><|start_header_id|>user<|end_header_id|>
{user_msg}<|eot_id|><|start_header_id|>assistant<|end_header_id|>
"""

        return prompt, [r['id'] for r in retrieved]

    def predict_with_rag(
        self,
        query_setup: str,
        genre: Optional[str] = None,
        num_predictions: int = 3,
        model_pipeline=None
    ) -> Dict:
        """
        Generate twist predictions using RAG

        Returns:
        {
            'predictions': List[str],
            'retrieved_ids': List[str],
            'retrieved_snippets': List[str]
        }
        """

        # Build RAG prompt
        prompt, retrieved_ids = self.build_few_shot_prompt(
            query_setup, genre, num_predictions
        )

        # Generate with model (if available)
        if model_pipeline:
            try:
                outputs = model_pipeline(
                    prompt,
                    max_new_tokens=self.config['generation']['max_tokens'],
                    temperature=self.config['generation']['temperature'],
                    top_p=self.config['generation']['top_p'],
                    num_return_sequences=1,
                    do_sample=True
                )

                generated_text = outputs[0]['generated_text']
                response = generated_text.split("<|start_header_id|>assistant<|end_header_id|>")[-1].strip()

                # Parse predictions
                predictions = []
                for line in response.split('\n'):
                    line = line.strip()
                    if line and (line[0].isdigit() or line.startswith('-')):
                        clean = line.lstrip('0123456789.-) ').strip()
                        if clean and len(clean) > 10:
                            predictions.append(clean)

                predictions = predictions[:num_predictions]

            except Exception as e:
                print(f"Error in generation: {e}")
                predictions = []
        else:
            predictions = []

        # Fallback predictions
        while len(predictions) < num_predictions:
            predictions.append(f"An unexpected {genre or 'narrative'} twist occurs.")

        # Get retrieved snippets
        retrieved_data = self.retrieve_similar_twists(query_setup)
        retrieved_snippets = [r['twist'][:100] + "..." for r in retrieved_data]

        return {
            'predictions': predictions,
            'retrieved_ids': retrieved_ids,
            'retrieved_snippets': retrieved_snippets
        }


# Global instance
_rag_predictor = None


def get_rag_predictor(config_path: str = "config.yaml") -> RAGTwistPredictor:
    """Get or create global RAG predictor"""
    global _rag_predictor
    if _rag_predictor is None:
        _rag_predictor = RAGTwistPredictor(config_path)
    return _rag_predictor

"""
Deduplication pipeline for plot twist dataset
Uses embeddings and clustering to identify near-duplicates
"""
import json
import numpy as np
from sentence_transformers import SentenceTransformer
from sklearn.cluster import AgglomerativeClustering
from typing import List, Dict
import argparse


def deduplicate_dataset(
    input_file: str,
    output_file: str,
    similarity_threshold: float = 0.95,
    model_name: str = "all-MiniLM-L6-v2"
):
    """
    Deduplicate twists using embedding similarity

    Args:
        input_file: Path to input JSON dataset
        output_file: Path to output deduplicated dataset
        similarity_threshold: Cosine similarity threshold (0-1)
        model_name: Sentence transformer model name
    """

    print(f"Loading dataset from {input_file}...")
    with open(input_file, 'r', encoding='utf-8') as f:
        data = json.load(f)

    print(f"Loaded {len(data)} twists")

    # Load embedding model
    print(f"Loading model: {model_name}")
    model = SentenceTransformer(model_name)

    # Encode twist texts
    print("Encoding twists...")
    twist_texts = [item['twist'] for item in data]
    embeddings = model.encode(twist_texts, show_progress_bar=True)

    # Compute pairwise similarities
    print("Computing similarities...")
    from sklearn.metrics.pairwise import cosine_similarity

    sim_matrix = cosine_similarity(embeddings)

    # Cluster using agglomerative clustering
    print(f"Clustering with threshold {similarity_threshold}...")

    # Convert similarity to distance
    distance_threshold = 1 - similarity_threshold

    clustering = AgglomerativeClustering(
        n_clusters=None,
        distance_threshold=distance_threshold,
        linkage='average',
        metric='cosine'
    )

    labels = clustering.fit_predict(embeddings)

    print(f"Found {len(set(labels))} unique clusters")

    # Select canonical example from each cluster
    canonical_items = []
    cluster_map = {}

    for cluster_id in set(labels):
        cluster_indices = [i for i, label in enumerate(labels) if label == cluster_id]

        # Choose the longest/most detailed twist as canonical
        best_idx = max(cluster_indices, key=lambda i: len(data[i]['twist']))

        canonical_item = data[best_idx].copy()
        canonical_item['canonical_id'] = canonical_item['id']
        canonical_item['cluster_size'] = len(cluster_indices)
        canonical_item['cluster_members'] = [data[i]['id'] for i in cluster_indices]

        canonical_items.append(canonical_item)
        cluster_map[cluster_id] = canonical_item['id']

    # Save deduplicated dataset
    print(f"Saving {len(canonical_items)} canonical twists to {output_file}...")
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(canonical_items, f, indent=2, ensure_ascii=False)

    # Save cluster mapping
    mapping_file = output_file.replace('.json', '_cluster_map.json')
    with open(mapping_file, 'w', encoding='utf-8') as f:
        json.dump(cluster_map, f, indent=2)

    print(f"\nDeduplication complete!")
    print(f"Original: {len(data)} twists")
    print(f"Deduplicated: {len(canonical_items)} unique twists")
    print(f"Reduction: {len(data) - len(canonical_items)} duplicates removed")
    print(f"Compression ratio: {len(canonical_items) / len(data) * 100:.1f}%")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True, help="Input dataset JSON")
    parser.add_argument("--output", required=True, help="Output deduplicated JSON")
    parser.add_argument("--threshold", type=float, default=0.95, help="Similarity threshold")
    parser.add_argument("--model", default="all-MiniLM-L6-v2", help="Embedding model")

    args = parser.parse_args()

    deduplicate_dataset(args.input, args.output, args.threshold, args.model)

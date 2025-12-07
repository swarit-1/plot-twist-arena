"""
Build FAISS index of plot twist embeddings for RAG
"""
import json
import os
from pathlib import Path
import numpy as np
from sentence_transformers import SentenceTransformer
try:
    import faiss
    FAISS_AVAILABLE = True
except ImportError:
    FAISS_AVAILABLE = False
    print("Warning: faiss not available, will use fallback")


def build_embeddings_index(
    dataset_path: str = "dataset/processed/train.json",
    output_dir: str = "dataset/embeddings",
    model_name: str = "all-MiniLM-L6-v2"
):
    """
    Build embeddings index from training dataset

    Creates:
    - embeddings/twist_embeddings.npy: numpy array of embeddings
    - embeddings/twist_metadata.json: twist IDs and texts
    - embeddings/index.faiss: FAISS index (if available)
    """

    print(f"Loading dataset from {dataset_path}...")
    with open(dataset_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    print(f"Loaded {len(data)} twists")

    # Load model
    print(f"Loading embedding model: {model_name}")
    model = SentenceTransformer(model_name)

    # Prepare texts
    metadata = []
    twist_texts = []

    for item in data:
        # Combine setup and twist for better retrieval
        combined_text = f"{item['story_setup']} {item['twist']}"
        twist_texts.append(combined_text)

        metadata.append({
            'id': item['id'],
            'story_setup': item['story_setup'],
            'twist': item['twist'],
            'genre': item.get('story_genre', 'unknown'),
            'tags': item.get('tags', [])
        })

    # Encode
    print("Encoding twists...")
    embeddings = model.encode(
        twist_texts,
        show_progress_bar=True,
        convert_to_numpy=True
    )

    # Save
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)

    # Save embeddings
    embeddings_file = output_path / "twist_embeddings.npy"
    np.save(embeddings_file, embeddings)
    print(f"Saved embeddings to {embeddings_file}")

    # Save metadata
    metadata_file = output_path / "twist_metadata.json"
    with open(metadata_file, 'w', encoding='utf-8') as f:
        json.dump(metadata, f, indent=2, ensure_ascii=False)
    print(f"Saved metadata to {metadata_file}")

    # Build FAISS index if available
    if FAISS_AVAILABLE:
        print("Building FAISS index...")
        dimension = embeddings.shape[1]

        # Use IndexFlatIP for cosine similarity (after normalization)
        # Normalize embeddings
        faiss.normalize_L2(embeddings)

        index = faiss.IndexFlatIP(dimension)
        index.add(embeddings)

        index_file = output_path / "index.faiss"
        faiss.write_index(index, str(index_file))
        print(f"Saved FAISS index to {index_file}")
    else:
        print("FAISS not available, skipping index creation")

    print(f"\nIndex building complete!")
    print(f"Total twists indexed: {len(metadata)}")
    print(f"Embedding dimension: {embeddings.shape[1]}")


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser()
    parser.add_argument("--dataset", default="dataset/processed/train.json")
    parser.add_argument("--output", default="dataset/embeddings")
    parser.add_argument("--model", default="all-MiniLM-L6-v2")

    args = parser.parse_args()

    build_embeddings_index(args.dataset, args.output, args.model)

# Dataset Builder

Tools for creating, augmenting, and maintaining the plot twist dataset.

## Overview

The dataset builder provides:
- Twist scraping and synthesis (`scrape_twists.py`)
- Deduplication (`dedupe.py`)
- Augmentation (`augment.py`)
- Embedding index building (`index_embeddings.py`)
- Taxonomy management (`taxonomy.yml`)

## Usage

### 1. Generate Base Dataset

```bash
python scrape_twists.py
```

Creates:
- `dataset/raw/plot_twists.json` - Full dataset
- `dataset/processed/train.json`, `val.json`, `test.json` - Splits

### 2. Deduplicate

```bash
python dedupe.py \
  --input dataset/raw/plot_twists.json \
  --output dataset/processed/deduplicated.json \
  --threshold 0.95
```

Removes near-duplicate twists using embedding similarity.

### 3. Augment

```bash
python augment.py \
  --input dataset/processed/deduplicated.json \
  --output dataset/processed/augmented.json \
  --factor 3
```

Creates paraphrased variations to expand the dataset.

### 4. Build Embeddings Index

```bash
python index_embeddings.py \
  --dataset dataset/processed/train.json \
  --output dataset/embeddings
```

Creates FAISS index for fast retrieval (RAG).

## Dataset Format

Each twist entry:

```json
{
  "id": "twist_000001",
  "canonical_id": "twist_000001",
  "story_genre": "mystery",
  "story_setup": "A detective investigates...",
  "twist": "The detective is the killer...",
  "tags": ["unreliable_narrator", "self-blame"],
  "source": "original",
  "cluster_size": 1
}
```

## Taxonomy

See `taxonomy.yml` for the complete twist type classification.

## Parameters

### Deduplication
- `--threshold`: Cosine similarity threshold (default: 0.95)
  - Higher = more aggressive deduplication
  - Range: 0.0-1.0

### Augmentation
- `--factor`: Number of variations per twist (default: 2)
  - Creates paraphrases while preserving meaning

## Advanced

### Custom Model

```bash
python index_embeddings.py \
  --model sentence-transformers/all-mpnet-base-v2
```

### Quality Control

After augmentation, manually review samples:

```bash
python -c "import json; data=json.load(open('dataset/processed/augmented.json')); print(data[:5])"
```

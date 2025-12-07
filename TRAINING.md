# Model Training Guide

Complete guide to training the plot twist prediction model.

## Prerequisites

- Python 3.10+
- CUDA-capable GPU (recommended) or CPU
- 16GB+ RAM
- 50GB+ disk space

## Quick Start

```bash
# 1. Generate dataset
cd dataset-builder
python scrape_twists.py

# 2. Build embeddings index
python index_embeddings.py --dataset dataset/processed/train.json

# 3. Train model (CPU mode for testing)
cd ../model-server
python train_model.py \
  --model_name "TinyLlama/TinyLlama-1.1B-Chat-v1.0" \
  --dataset_path "../dataset/processed" \
  --output_dir "models/fine_tuned_model"
```

## Full Training (GPU)

### Hardware Requirements

- **GPU**: NVIDIA GPU with 16GB+ VRAM (e.g., RTX 4090, A100)
- **RAM**: 32GB+ system RAM
- **Storage**: 100GB+ free space

### Environment Setup

```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows

# Install dependencies
pip install -r model-server/requirements.txt

# Verify CUDA
python -c "import torch; print(torch.cuda.is_available())"
```

### Dataset Preparation

#### 1. Generate Base Dataset

```bash
cd dataset-builder
python scrape_twists.py
```

Generates ~1000 plot twists in `dataset/raw/plot_twists.json`.

#### 2. Deduplicate

```bash
python dedupe.py \
  --input dataset/raw/plot_twists.json \
  --output dataset/processed/deduplicated.json \
  --threshold 0.95
```

#### 3. Augment

```bash
python augment.py \
  --input dataset/processed/deduplicated.json \
  --output dataset/processed/augmented.json \
  --factor 3
```

Expands dataset to ~3000+ examples.

#### 4. Build Embeddings Index

```bash
python index_embeddings.py \
  --dataset dataset/processed/train.json \
  --output dataset/embeddings \
  --model all-MiniLM-L6-v2
```

### Training

#### Option A: Fast Training (TinyLlama)

```bash
cd model-server

python train_model.py \
  --model_name "TinyLlama/TinyLlama-1.1B-Chat-v1.0" \
  --dataset_path "../dataset/processed" \
  --output_dir "models/fine_tuned_model"
```

**Training time**: ~1-2 hours on RTX 4090

#### Option B: Better Quality (Llama-3.2)

```bash
python train_model.py \
  --model_name "meta-llama/Llama-3.2-1B-Instruct" \
  --dataset_path "../dataset/processed" \
  --output_dir "models/fine_tuned_model"
```

**Training time**: ~3-4 hours on RTX 4090

**Note**: Requires Hugging Face token for Llama models:
```bash
huggingface-cli login
```

### Hyperparameters

Default configuration in `train_model.py`:

```python
{
  "num_train_epochs": 3,
  "per_device_train_batch_size": 4,
  "gradient_accumulation_steps": 4,
  "learning_rate": 2e-4,
  "lora_r": 16,
  "lora_alpha": 32
}
```

For better quality (slower):
- Increase `num_train_epochs` to 5
- Increase `lora_r` to 32

For faster training:
- Reduce `num_train_epochs` to 2
- Increase `per_device_train_batch_size` to 8 (if VRAM allows)

### Evaluation

After training, evaluate on test set:

```bash
python -c "
from train_model import PlotTwistTrainer
trainer = PlotTwistTrainer(
    model_name='models/fine_tuned_model',
    dataset_path='../dataset/processed'
)
# Load test set and evaluate
"
```

## Troubleshooting

### Out of Memory (OOM)

**Symptoms**: CUDA out of memory errors

**Solutions**:
1. Reduce batch size:
   ```python
   per_device_train_batch_size=2
   ```

2. Increase gradient accumulation:
   ```python
   gradient_accumulation_steps=8
   ```

3. Use smaller model (TinyLlama)

4. Enable 8-bit training (add to train_model.py):
   ```python
   load_in_8bit=True
   ```

### Slow Training

**Solutions**:
- Use GPU instead of CPU
- Increase batch size if VRAM allows
- Reduce dataset size for experimentation

### Poor Model Quality

**Solutions**:
1. Increase dataset size (augmentation)
2. Train for more epochs
3. Use larger model
4. Check data quality (deduplicate)

## Versioning

Track model versions:

```bash
# Tag model with version
mkdir -p models/v1.0
cp -r models/fine_tuned_model/* models/v1.0/

# Document in README
echo "v1.0 - Trained on 3000 examples, TinyLlama base" >> models/VERSION_HISTORY.md
```

## Production Deployment

After training:

1. **Test locally**:
   ```bash
   MODEL_PATH=models/fine_tuned_model python -m uvicorn main:app --reload
   ```

2. **Run inference tests**:
   ```bash
   curl -X POST http://localhost:8001/predict-twist \
     -H "Content-Type: application/json" \
     -d '{"story_setup": "A detective investigates a murder", "num_predictions": 3}'
   ```

3. **Deploy to production**:
   - Upload model to cloud storage (S3, GCS)
   - Update `MODEL_PATH` in deployment config
   - Restart model-server service

## Cost Estimation

### Training Costs

**Cloud GPU (AWS p3.2xlarge @ $3.06/hr)**:
- TinyLlama: ~$5-10
- Llama-3.2: ~$15-20

**Cloud GPU (GCP T4 @ $0.35/hr)**:
- TinyLlama: ~$1-2
- Llama-3.2: ~$3-5

### Storage

- Model: ~2-4GB
- Dataset: ~50MB
- Embeddings: ~500MB

**Total**: ~3-5GB per model version

## Automation

Automated training pipeline (future):

```bash
#!/bin/bash
# auto-train.sh

# Generate dataset
python dataset-builder/scrape_twists.py

# Dedupe and augment
python dataset-builder/dedupe.py --input dataset/raw/plot_twists.json --output dataset/processed/deduplicated.json
python dataset-builder/augment.py --input dataset/processed/deduplicated.json --output dataset/processed/augmented.json

# Train
python model-server/train_model.py --model_name TinyLlama/TinyLlama-1.1B-Chat-v1.0

# Evaluate and upload if metrics pass threshold
python scripts/evaluate_and_deploy.py
```

## References

- [LoRA Paper](https://arxiv.org/abs/2106.09685)
- [Llama Models](https://huggingface.co/meta-llama)
- [Sentence Transformers](https://www.sbert.net/)

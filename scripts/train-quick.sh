#!/bin/bash
set -e

echo "=== Quick Training Script ==="
echo "This will generate a dataset and train the model."
echo ""

# Generate dataset
echo "Step 1: Generating dataset..."
cd dataset-builder
python scrape_twists.py
cd ..

echo ""
echo "Step 2: Training model..."
echo "Using TinyLlama for fast training..."
cd model-server
python train_model.py \
  --model_name "TinyLlama/TinyLlama-1.1B-Chat-v1.0" \
  --dataset_path "../dataset/processed" \
  --output_dir "models/fine_tuned_model"
cd ..

echo ""
echo "=== Training Complete! ==="
echo "Model saved to: model-server/models/fine_tuned_model"
echo ""

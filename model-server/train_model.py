"""
Fine-tuning script for Plot Twist prediction model
Uses LoRA/QLoRA for efficient training
"""
import os
import json
import torch
from datasets import load_dataset, Dataset
from transformers import (
    AutoTokenizer,
    AutoModelForCausalLM,
    TrainingArguments,
    Trainer,
    DataCollatorForLanguageModeling
)
from peft import LoraConfig, get_peft_model, prepare_model_for_kbit_training
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class PlotTwistTrainer:
    def __init__(
        self,
        model_name: str = "meta-llama/Llama-3.2-1B-Instruct",
        dataset_path: str = "dataset/processed",
        output_dir: str = "models/fine_tuned_model"
    ):
        self.model_name = model_name
        self.dataset_path = dataset_path
        self.output_dir = output_dir
        self.device = "cuda" if torch.cuda.is_available() else "cpu"

        logger.info(f"Using device: {self.device}")

    def load_datasets(self):
        """Load train/val/test splits"""
        logger.info(f"Loading datasets from {self.dataset_path}")

        datasets = {}
        for split in ["train", "val", "test"]:
            file_path = os.path.join(self.dataset_path, f"{split}.json")
            if os.path.exists(file_path):
                with open(file_path, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                datasets[split] = Dataset.from_list(data)
                logger.info(f"Loaded {split}: {len(data)} examples")
            else:
                logger.warning(f"{split} split not found at {file_path}")

        return datasets

    def format_prompt(self, example):
        """Format example into training prompt"""
        # Mode 1: Predict twist from setup
        prompt = f"""<|begin_of_text|><|start_header_id|>system<|end_header_id|>
You are a plot twist prediction expert. Given a story setup, predict the most likely plot twist.<|eot_id|><|start_header_id|>user<|end_header_id|>
Story Genre: {example['story_genre']}
Story Setup: {example['story_setup']}

What is the plot twist?<|eot_id|><|start_header_id|>assistant<|end_header_id|>
{example['twist']}<|eot_id|>"""
        return prompt

    def format_generation_prompt(self, example):
        """Format example for story generation task"""
        prompt = f"""<|begin_of_text|><|start_header_id|>system<|end_header_id|>
You are a creative story writer. Generate a story setup and a hidden plot twist.<|eot_id|><|start_header_id|>user<|end_header_id|>
Generate a {example['story_genre']} story with a clever plot twist.<|eot_id|><|start_header_id|>assistant<|end_header_id|>
SETUP: {example['story_setup']}
TWIST: {example['twist']}<|eot_id|>"""
        return prompt

    def preprocess_function(self, examples, tokenizer):
        """Tokenize examples"""
        # Mix both tasks
        prompts = []
        for i in range(len(examples['story_setup'])):
            example = {k: v[i] for k, v in examples.items()}
            # Alternate between tasks
            if i % 2 == 0:
                prompts.append(self.format_prompt(example))
            else:
                prompts.append(self.format_generation_prompt(example))

        # Tokenize
        tokenized = tokenizer(
            prompts,
            truncation=True,
            max_length=512,
            padding="max_length"
        )

        # For causal LM, labels are same as input_ids
        tokenized["labels"] = tokenized["input_ids"].copy()

        return tokenized

    def train(self):
        """Main training loop"""
        logger.info("Starting training pipeline...")

        # Load datasets
        datasets = self.load_datasets()
        if "train" not in datasets:
            raise ValueError("Training dataset not found!")

        # Load tokenizer and model
        logger.info(f"Loading model: {self.model_name}")

        try:
            tokenizer = AutoTokenizer.from_pretrained(self.model_name)
        except:
            logger.warning(f"Failed to load {self.model_name}, falling back to TinyLlama")
            self.model_name = "TinyLlama/TinyLlama-1.1B-Chat-v1.0"
            tokenizer = AutoTokenizer.from_pretrained(self.model_name)

        # Set padding token
        if tokenizer.pad_token is None:
            tokenizer.pad_token = tokenizer.eos_token

        # Load model
        model = AutoModelForCausalLM.from_pretrained(
            self.model_name,
            torch_dtype=torch.float16 if self.device == "cuda" else torch.float32,
            device_map="auto" if self.device == "cuda" else None
        )

        # Configure LoRA
        logger.info("Configuring LoRA...")
        lora_config = LoraConfig(
            r=16,
            lora_alpha=32,
            target_modules=["q_proj", "k_proj", "v_proj", "o_proj"],
            lora_dropout=0.05,
            bias="none",
            task_type="CAUSAL_LM"
        )

        model = get_peft_model(model, lora_config)
        model.print_trainable_parameters()

        # Tokenize datasets
        logger.info("Tokenizing datasets...")
        tokenized_train = datasets["train"].map(
            lambda x: self.preprocess_function(x, tokenizer),
            batched=True,
            remove_columns=datasets["train"].column_names
        )

        tokenized_val = None
        if "val" in datasets:
            tokenized_val = datasets["val"].map(
                lambda x: self.preprocess_function(x, tokenizer),
                batched=True,
                remove_columns=datasets["val"].column_names
            )

        # Training arguments
        training_args = TrainingArguments(
            output_dir=self.output_dir,
            num_train_epochs=3,
            per_device_train_batch_size=4,
            per_device_eval_batch_size=4,
            gradient_accumulation_steps=4,
            learning_rate=2e-4,
            fp16=self.device == "cuda",
            logging_steps=10,
            save_steps=100,
            eval_steps=100,
            evaluation_strategy="steps" if tokenized_val else "no",
            save_total_limit=3,
            load_best_model_at_end=True if tokenized_val else False,
            report_to="none",
            remove_unused_columns=False,
        )

        # Data collator
        data_collator = DataCollatorForLanguageModeling(
            tokenizer=tokenizer,
            mlm=False
        )

        # Trainer
        trainer = Trainer(
            model=model,
            args=training_args,
            train_dataset=tokenized_train,
            eval_dataset=tokenized_val,
            data_collator=data_collator,
        )

        # Train
        logger.info("Starting training...")
        trainer.train()

        # Save final model
        logger.info(f"Saving model to {self.output_dir}")
        trainer.save_model()
        tokenizer.save_pretrained(self.output_dir)

        logger.info("Training complete!")

        # Evaluate on test set if available
        if "test" in datasets:
            logger.info("Evaluating on test set...")
            tokenized_test = datasets["test"].map(
                lambda x: self.preprocess_function(x, tokenizer),
                batched=True,
                remove_columns=datasets["test"].column_names
            )
            test_results = trainer.evaluate(tokenized_test)
            logger.info(f"Test results: {test_results}")

        return self.output_dir

def main():
    """Run training"""
    import argparse

    parser = argparse.ArgumentParser()
    parser.add_argument("--model_name", default="TinyLlama/TinyLlama-1.1B-Chat-v1.0", help="Base model name")
    parser.add_argument("--dataset_path", default="dataset/processed", help="Path to dataset")
    parser.add_argument("--output_dir", default="models/fine_tuned_model", help="Output directory")
    args = parser.parse_args()

    trainer = PlotTwistTrainer(
        model_name=args.model_name,
        dataset_path=args.dataset_path,
        output_dir=args.output_dir
    )

    trainer.train()

if __name__ == "__main__":
    main()

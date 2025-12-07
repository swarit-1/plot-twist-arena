"""
Dataset augmentation using controlled transformations
Generates paraphrases and variations while preserving meaning
"""
import json
import random
from typing import List, Dict
import argparse


class TwistAugmenter:
    def __init__(self):
        self.pov_transforms = [
            ("The protagonist", "The main character"),
            ("discovers", "learns"),
            ("reveals", "shows"),
            ("is", "was"),
        ]

        self.genre_swaps = {
            "detective": ["investigator", "sleuth", "agent"],
            "murder": ["crime", "killing", "death"],
            "villain": ["antagonist", "enemy", "adversary"],
        }

    def paraphrase_twist(self, twist: str) -> List[str]:
        """Generate paraphrased versions of a twist"""
        variations = [twist]  # Include original

        # Simple token substitution
        for original, replacement in self.pov_transforms:
            if original.lower() in twist.lower():
                variant = twist.replace(original, replacement)
                if variant != twist:
                    variations.append(variant)

        return variations[:3]  # Limit to 3 variations

    def change_perspective(self, twist: str) -> str:
        """Rewrite from different POV"""
        # Simple heuristic transformation
        if "The protagonist" in twist:
            return twist.replace("The protagonist", "They")
        elif "A character" in twist:
            return twist.replace("A character", "Someone")
        return twist

    def augment_dataset(
        self,
        dataset: List[Dict],
        augmentation_factor: int = 2
    ) -> List[Dict]:
        """
        Augment dataset with controlled variations

        Args:
            dataset: Original dataset
            augmentation_factor: How many variations per original

        Returns:
            Augmented dataset with canonical_id tracking
        """
        augmented = []

        for item in dataset:
            # Add original with canonical_id
            original = item.copy()
            original['canonical_id'] = original['id']
            original['source'] = 'original'
            augmented.append(original)

            # Generate variations
            variations = self.paraphrase_twist(item['twist'])

            for i, variant_twist in enumerate(variations[1:augmentation_factor+1], 1):
                variant = item.copy()
                variant['id'] = f"{item['id']}_var{i}"
                variant['twist'] = variant_twist
                variant['canonical_id'] = item['id']
                variant['source'] = 'augmented_paraphrase'
                augmented.append(variant)

        return augmented


def augment_dataset_file(
    input_file: str,
    output_file: str,
    augmentation_factor: int = 2
):
    """Augment dataset from file"""

    print(f"Loading dataset from {input_file}...")
    with open(input_file, 'r', encoding='utf-8') as f:
        data = json.load(f)

    print(f"Loaded {len(data)} twists")

    augmenter = TwistAugmenter()

    print(f"Augmenting with factor {augmentation_factor}...")
    augmented = augmenter.augment_dataset(data, augmentation_factor)

    print(f"Saving {len(augmented)} twists to {output_file}...")
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(augmented, f, indent=2, ensure_ascii=False)

    print(f"\nAugmentation complete!")
    print(f"Original: {len(data)} twists")
    print(f"Augmented: {len(augmented)} twists")
    print(f"Expansion ratio: {len(augmented) / len(data):.1f}x")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True, help="Input dataset JSON")
    parser.add_argument("--output", required=True, help="Output augmented JSON")
    parser.add_argument("--factor", type=int, default=2, help="Augmentation factor")

    args = parser.parse_args()

    augment_dataset_file(args.input, args.output, args.factor)

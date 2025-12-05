#!/usr/bin/env python3
"""
Plot Twist Dataset Builder
Scrapes and consolidates plot twist data from public sources
"""
import json
import os
import re
from pathlib import Path
from typing import List, Dict
import requests
from bs4 import BeautifulSoup
import time
from tqdm import tqdm

class PlotTwistScraper:
    def __init__(self, output_dir: str = "dataset/raw"):
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self.twists = []
        self.twist_id_counter = 0

    def scrape_tvtropes_samples(self):
        """Generate synthetic examples based on common TV Tropes patterns"""
        print("Generating TV Tropes-inspired synthetic examples...")

        trope_patterns = [
            {
                "genre": "mystery",
                "setup": "A detective investigates a murder at a mansion where everyone has an alibi.",
                "twist": "The victim faked their own death to escape debts and frame someone else.",
                "tags": ["fake death", "frame-up", "mystery"]
            },
            {
                "genre": "thriller",
                "setup": "A woman receives threatening letters from a stalker.",
                "twist": "She wrote the letters herself to gain sympathy and attention.",
                "tags": ["unreliable narrator", "self-deception", "psychological"]
            },
            {
                "genre": "sci-fi",
                "setup": "A man discovers he can see the future through dreams.",
                "twist": "His dreams are actually memories from his past life in a time loop.",
                "tags": ["time loop", "reincarnation", "temporal"]
            },
            {
                "genre": "horror",
                "setup": "A family moves into a haunted house with a dark history.",
                "twist": "The family members are ghosts who don't realize they died in a car crash.",
                "tags": ["dead all along", "ghost", "supernatural"]
            },
            {
                "genre": "drama",
                "setup": "A therapist helps patients overcome trauma while dealing with her own past.",
                "twist": "Her star patient is actually her split personality.",
                "tags": ["split personality", "psychological", "identity"]
            },
            {
                "genre": "mystery",
                "setup": "A journalist investigates corruption in a small town.",
                "twist": "The journalist is actually an AI created by the corrupt officials to control the narrative.",
                "tags": ["AI reveal", "technology", "manipulation"]
            },
            {
                "genre": "thriller",
                "setup": "An amnesiac wakes up in a hospital with no memory of who they are.",
                "twist": "They're a serial killer who had their memory erased as punishment.",
                "tags": ["amnesia", "dark past", "criminal"]
            },
            {
                "genre": "sci-fi",
                "setup": "Humans on a generation ship travel to a new planet.",
                "twist": "They've already arrived centuries ago and are living in a simulation on the planet.",
                "tags": ["simulation", "virtual reality", "deception"]
            },
            {
                "genre": "fantasy",
                "setup": "A hero quests to defeat an evil sorcerer threatening the kingdom.",
                "twist": "The hero is the sorcerer's younger self sent back in time.",
                "tags": ["time paradox", "self-fulfilling prophecy", "temporal"]
            },
            {
                "genre": "mystery",
                "setup": "A locked room murder has no logical explanation.",
                "twist": "The room was never locked; the victim used ice to create a melting lock mechanism.",
                "tags": ["locked room", "clever mechanism", "deduction"]
            }
        ]

        for pattern in trope_patterns:
            self.add_twist(
                genre=pattern["genre"],
                setup=pattern["setup"],
                twist=pattern["twist"],
                tags=pattern["tags"]
            )

    def generate_synthetic_twists(self, count: int = 500):
        """Generate synthetic plot twists using templates"""
        print(f"Generating {count} synthetic plot twists...")

        templates = [
            {
                "genres": ["mystery", "thriller"],
                "setups": [
                    "A {profession} investigates {crime} in a {location}.",
                    "Someone discovers {object} that reveals {secret}.",
                    "A {relationship} receives {mysterious_item} with no explanation."
                ],
                "twists": [
                    "The {profession} was actually {role} all along.",
                    "The {victim} staged everything to {motive}.",
                    "Everyone involved was {state} from the beginning."
                ],
                "variables": {
                    "profession": ["detective", "journalist", "lawyer", "doctor", "teacher"],
                    "crime": ["murder", "theft", "disappearance", "fraud", "conspiracy"],
                    "location": ["mansion", "small town", "corporation", "university", "island"],
                    "object": ["diary", "photograph", "recording", "letter", "artifact"],
                    "secret": ["conspiracy", "hidden identity", "past crime", "forbidden knowledge"],
                    "relationship": ["couple", "family", "business partner", "friend group"],
                    "mysterious_item": ["anonymous letter", "package", "phone call", "message"],
                    "victim": ["victim", "missing person", "accused", "witness"],
                    "role": ["the mastermind", "working with the villain", "the actual victim"],
                    "motive": ["escape debt", "frame someone", "inherit fortune", "hide identity"],
                    "state": ["dead", "in on it", "being manipulated", "living in simulation"]
                }
            },
            {
                "genres": ["sci-fi", "horror"],
                "setups": [
                    "People in {location} experience {phenomenon}.",
                    "A {profession} discovers {tech} that {capability}.",
                    "Reality begins to {distortion} for {characters}."
                ],
                "twists": [
                    "They're all {simulated_state} and don't know it.",
                    "The {tech} was {manipulation} by {entity}.",
                    "Everything was {temporal_state} from the start."
                ],
                "variables": {
                    "location": ["space station", "underground facility", "virtual world", "colony"],
                    "phenomenon": ["time loops", "shared dreams", "memory loss", "telepathy"],
                    "profession": ["scientist", "astronaut", "programmer", "researcher"],
                    "tech": ["device", "AI system", "portal", "experiment"],
                    "capability": ["reads minds", "predicts future", "alters reality", "controls time"],
                    "distortion": ["fragment", "loop", "merge", "shift"],
                    "characters": ["protagonist", "entire cast", "one character"],
                    "simulated_state": ["in a simulation", "AI constructs", "clones", "dead"],
                    "manipulation": ["created", "controlled", "infected"],
                    "entity": ["AI", "aliens", "future humans", "the protagonist"],
                    "temporal_state": ["a time loop", "a dying dream", "a memory", "a prophecy"]
                }
            }
        ]

        import random

        for _ in range(count):
            template = random.choice(templates)
            genre = random.choice(template["genres"])

            setup_template = random.choice(template["setups"])
            twist_template = random.choice(template["twists"])

            # Fill template variables
            setup = setup_template
            twist = twist_template
            tags = [genre]

            for var_name, var_values in template["variables"].items():
                placeholder = "{" + var_name + "}"
                if placeholder in setup or placeholder in twist:
                    value = random.choice(var_values)
                    setup = setup.replace(placeholder, value)
                    twist = twist.replace(placeholder, value)
                    if var_name in ["state", "simulated_state", "temporal_state", "role"]:
                        tags.append(value.replace(" ", "_"))

            self.add_twist(genre=genre, setup=setup, twist=twist, tags=tags)

    def add_twist(self, genre: str, setup: str, twist: str, tags: List[str]):
        """Add a twist to the dataset"""
        self.twists.append({
            "id": f"twist_{self.twist_id_counter:06d}",
            "story_genre": genre,
            "story_setup": setup,
            "twist": twist,
            "tags": tags
        })
        self.twist_id_counter += 1

    def save_dataset(self):
        """Save the collected twists to JSON"""
        output_file = self.output_dir / "plot_twists.json"
        print(f"Saving {len(self.twists)} plot twists to {output_file}...")

        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(self.twists, f, indent=2, ensure_ascii=False)

        print(f"Dataset saved successfully!")
        return output_file

    def create_splits(self):
        """Split dataset into train/val/test"""
        import random
        random.shuffle(self.twists)

        total = len(self.twists)
        train_end = int(total * 0.8)
        val_end = int(total * 0.9)

        splits = {
            "train": self.twists[:train_end],
            "val": self.twists[train_end:val_end],
            "test": self.twists[val_end:]
        }

        processed_dir = Path("dataset/processed")
        processed_dir.mkdir(parents=True, exist_ok=True)

        for split_name, split_data in splits.items():
            split_file = processed_dir / f"{split_name}.json"
            with open(split_file, 'w', encoding='utf-8') as f:
                json.dump(split_data, f, indent=2, ensure_ascii=False)
            print(f"Saved {split_name} split: {len(split_data)} examples")

def main():
    print("=== PlotTwist Arena Dataset Builder ===\n")

    scraper = PlotTwistScraper()

    # Generate dataset
    scraper.scrape_tvtropes_samples()
    scraper.generate_synthetic_twists(count=1000)

    # Save and split
    scraper.save_dataset()
    scraper.create_splits()

    print("\n=== Dataset building complete! ===")
    print(f"Total twists: {len(scraper.twists)}")

if __name__ == "__main__":
    main()

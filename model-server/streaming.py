"""
Streaming predictions using Server-Sent Events
"""
import json
import asyncio
from typing import AsyncGenerator
from urllib.parse import unquote


async def stream_predictions(
    story_setup: str,
    genre: str = None,
    num_predictions: int = 3,
    model_pipeline=None
) -> AsyncGenerator[str, None]:
    """
    Stream partial predictions as they are generated

    Yields JSON chunks in SSE format:
    data: {"partial": "...", "top_candidates": [...], "progress": 0.3}
    """

    # Simulate streaming by generating predictions in chunks
    # In production, this would use actual streaming from the model

    # Stage 1: Initializing
    yield f"data: {json.dumps({'status': 'initializing', 'progress': 0.0})}\n\n"
    await asyncio.sleep(0.5)

    # Stage 2: Analyzing setup
    yield f"data: {json.dumps({'status': 'analyzing', 'progress': 0.2, 'partial': 'Analyzing story setup...'})}\n\n"
    await asyncio.sleep(0.5)

    # Stage 3: Generating candidates
    candidates = []

    for i in range(num_predictions):
        progress = 0.3 + (i / num_predictions) * 0.5

        # Generate prediction (mock streaming - in real implementation this would stream from model)
        if model_pipeline:
            # Use actual model
            prompt = f"""<|begin_of_text|><|start_header_id|>system<|end_header_id|>
You are a plot twist prediction expert. Generate a single plot twist for this story.
<|eot_id|><|start_header_id|>user<|end_header_id|>
Story: {story_setup}
Genre: {genre or 'unknown'}
<|eot_id|><|start_header_id|>assistant<|end_header_id|>
"""
            try:
                outputs = model_pipeline(
                    prompt,
                    max_new_tokens=100,
                    num_return_sequences=1,
                    temperature=0.8 + (i * 0.1),
                    do_sample=True
                )
                prediction = outputs[0]['generated_text'].split("<|start_header_id|>assistant<|end_header_id|>")[-1].strip()
                prediction = prediction[:200]  # Limit length
            except:
                prediction = f"The story reveals {genre or 'an unexpected'} twist involving hidden motives."
        else:
            # Fallback mock predictions
            mock_predictions = [
                f"The protagonist discovers they are not who they thought they were.",
                f"The antagonist is revealed to be helping the protagonist all along.",
                f"The entire story takes place in a simulation or dream."
            ]
            prediction = mock_predictions[i % len(mock_predictions)]

        candidates.append(prediction)

        yield f"data: {json.dumps({'status': 'generating', 'progress': progress, 'partial': prediction, 'top_candidates': candidates, 'candidate_index': i})}\n\n"
        await asyncio.sleep(0.3)

    # Stage 4: Complete
    confidence_scores = [1.0 - (i * 0.1) for i in range(len(candidates))]

    yield f"data: {json.dumps({'status': 'complete', 'progress': 1.0, 'predictions': candidates, 'confidence_scores': confidence_scores})}\n\n"

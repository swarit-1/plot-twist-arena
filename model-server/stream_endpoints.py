"""
SSE streaming endpoints for model server
"""
from fastapi import APIRouter, Query
from sse_starlette.sse import EventSourceResponse
from urllib.parse import unquote
from .streaming import stream_predictions

router = APIRouter()


@router.get("/stream/predict-twist")
async def stream_predict_twist(
    setup: str = Query(..., description="URL-encoded story setup"),
    genre: str = Query(None, description="Story genre"),
    num_predictions: int = Query(3, description="Number of predictions")
):
    """
    Stream twist predictions using Server-Sent Events

    Client should connect with EventSource and listen for data events.
    Each event contains JSON with status, progress, and partial/complete predictions.
    """
    decoded_setup = unquote(setup)

    # Import model pipeline from main app
    # In real implementation, we'd access the loaded model
    from . import main
    model_pipeline = getattr(main, 'generation_pipeline', None)

    return EventSourceResponse(
        stream_predictions(
            story_setup=decoded_setup,
            genre=genre,
            num_predictions=num_predictions,
            model_pipeline=model_pipeline
        )
    )

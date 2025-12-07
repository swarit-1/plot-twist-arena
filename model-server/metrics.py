"""
Prometheus metrics for model server
"""
from fastapi import APIRouter
from pydantic import BaseModel
from typing import Dict
import time
import os

router = APIRouter()

# Global metrics storage
class Metrics:
    def __init__(self):
        self.request_count = 0
        self.total_latency = 0.0
        self.error_count = 0
        self.prediction_count = 0
        self.last_model_load_time = 0
        self.index_size = 0
        self.start_time = time.time()

    def record_request(self, latency: float, error: bool = False):
        self.request_count += 1
        self.total_latency += latency
        if error:
            self.error_count += 1

    def record_prediction(self):
        self.prediction_count += 1

    def get_average_latency(self) -> float:
        if self.request_count == 0:
            return 0.0
        return self.total_latency / self.request_count

    def get_uptime(self) -> float:
        return time.time() - self.start_time


metrics = Metrics()


class MetricsResponse(BaseModel):
    total_requests: int
    total_predictions: int
    error_count: int
    average_latency_seconds: float
    uptime_seconds: float
    index_size: int
    last_model_load_timestamp: int


@router.get("/metrics", response_model=MetricsResponse)
async def get_metrics():
    """
    Prometheus-style metrics endpoint

    Returns operational metrics for monitoring
    """
    return MetricsResponse(
        total_requests=metrics.request_count,
        total_predictions=metrics.prediction_count,
        error_count=metrics.error_count,
        average_latency_seconds=metrics.get_average_latency(),
        uptime_seconds=metrics.get_uptime(),
        index_size=metrics.index_size,
        last_model_load_timestamp=int(metrics.last_model_load_time)
    )


@router.get("/health")
async def health_check():
    """
    Health check endpoint for monitoring

    Returns service status and basic metadata
    """
    from . import main

    model_loaded = hasattr(main, 'twist_model') and main.twist_model is not None
    embedding_loaded = hasattr(main, 'embedding_model') and main.embedding_model is not None

    return {
        "status": "healthy" if model_loaded else "degraded",
        "models_loaded": model_loaded,
        "embedding_loaded": embedding_loaded,
        "uptime": metrics.get_uptime(),
        "model_path": os.getenv("MODEL_PATH", "models/fine_tuned_model"),
        "device": "cuda" if os.environ.get("CUDA_VISIBLE_DEVICES") else "cpu"
    }


# Middleware for automatic metrics collection
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware


class MetricsMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        start_time = time.time()
        error = False

        try:
            response = await call_next(request)
            if response.status_code >= 400:
                error = True
            return response
        except Exception as e:
            error = True
            raise
        finally:
            latency = time.time() - start_time
            metrics.record_request(latency, error)

"""
Caching layer for model server
Uses Redis with in-memory fallback
"""
import json
import hashlib
import os
from typing import Optional, Any
from functools import lru_cache

try:
    import redis
    REDIS_AVAILABLE = True
except ImportError:
    REDIS_AVAILABLE = False


class Cache:
    def __init__(self, redis_url: Optional[str] = None):
        """Initialize cache with Redis or fallback to LRU"""
        self.redis_client = None
        self.use_redis = False

        if REDIS_AVAILABLE and redis_url:
            try:
                self.redis_client = redis.from_url(redis_url, decode_responses=True)
                self.redis_client.ping()
                self.use_redis = True
                print("✓ Redis cache connected")
            except Exception as e:
                print(f"⚠ Redis connection failed, using in-memory cache: {e}")

        if not self.use_redis:
            print("Using in-memory LRU cache")

    def _make_key(self, prefix: str, data: dict) -> str:
        """Generate cache key from data"""
        # Sort keys for consistency
        sorted_data = json.dumps(data, sort_keys=True)
        hash_obj = hashlib.md5(sorted_data.encode())
        return f"{prefix}:{hash_obj.hexdigest()}"

    def get(self, prefix: str, data: dict) -> Optional[Any]:
        """Get cached value"""
        key = self._make_key(prefix, data)

        if self.use_redis:
            try:
                value = self.redis_client.get(key)
                if value:
                    return json.loads(value)
            except Exception as e:
                print(f"Cache get error: {e}")
        else:
            # Fallback to in-memory (limited)
            return self._lru_get(key)

        return None

    def set(self, prefix: str, data: dict, value: Any, ttl: int = 3600):
        """Set cached value with TTL (seconds)"""
        key = self._make_key(prefix, data)

        if self.use_redis:
            try:
                self.redis_client.setex(
                    key,
                    ttl,
                    json.dumps(value)
                )
                return True
            except Exception as e:
                print(f"Cache set error: {e}")
        else:
            # Fallback to in-memory
            self._lru_set(key, value)

        return False

    def delete(self, prefix: str, data: dict):
        """Delete cached value"""
        key = self._make_key(prefix, data)

        if self.use_redis:
            try:
                self.redis_client.delete(key)
            except Exception as e:
                print(f"Cache delete error: {e}")

    def clear_prefix(self, prefix: str):
        """Clear all keys with prefix"""
        if self.use_redis:
            try:
                pattern = f"{prefix}:*"
                keys = self.redis_client.keys(pattern)
                if keys:
                    self.redis_client.delete(*keys)
            except Exception as e:
                print(f"Cache clear error: {e}")

    # Simple in-memory fallback using lru_cache
    @lru_cache(maxsize=128)
    def _lru_get(self, key: str):
        """In-memory cache get (limited)"""
        # This is a simplified fallback
        # In production, use proper in-memory cache like cachetools
        return None

    def _lru_set(self, key: str, value: Any):
        """In-memory cache set"""
        # Store in instance dict for simple fallback
        if not hasattr(self, '_memory_cache'):
            self._memory_cache = {}

        # Limit size
        if len(self._memory_cache) > 100:
            # Remove oldest (simple FIFO)
            self._memory_cache.pop(next(iter(self._memory_cache)))

        self._memory_cache[key] = value


# Global cache instance
_cache = None


def get_cache() -> Cache:
    """Get or create global cache instance"""
    global _cache
    if _cache is None:
        redis_url = os.getenv('REDIS_URL')
        _cache = Cache(redis_url)
    return _cache

"""
Tests for app/llm/cache.py — ResponseCache.

Covers: get/set, TTL expiry, case-insensitive key normalisation,
        hit/miss counting, and stats output.
"""

import time
import pytest
from app.llm.cache import ResponseCache


# ===========================================================================
# get / set
# ===========================================================================

class TestResponseCacheGetSet:
    def setup_method(self):
        self.cache = ResponseCache(ttl_seconds=60)

    def test_miss_on_empty_cache(self):
        assert self.cache.get("What is Python?") is None

    def test_set_then_get_returns_response(self):
        self.cache.set("What is Python?", "Python is a programming language.")
        assert self.cache.get("What is Python?") == "Python is a programming language."

    def test_get_is_case_insensitive(self):
        self.cache.set("What is Python?", "Python is a language.")
        assert self.cache.get("what is python?") == "Python is a language."
        assert self.cache.get("WHAT IS PYTHON?") == "Python is a language."

    def test_get_strips_whitespace_for_key(self):
        self.cache.set("  hello  ", "world")
        assert self.cache.get("hello") == "world"

    def test_different_queries_do_not_collide(self):
        self.cache.set("query A", "response A")
        self.cache.set("query B", "response B")
        assert self.cache.get("query A") == "response A"
        assert self.cache.get("query B") == "response B"

    def test_set_overwrites_existing_entry(self):
        self.cache.set("key", "first")
        self.cache.set("key", "second")
        assert self.cache.get("key") == "second"

    def test_get_returns_none_for_unknown_key(self):
        self.cache.set("known", "value")
        assert self.cache.get("unknown") is None


# ===========================================================================
# TTL expiry
# ===========================================================================

class TestResponseCacheTTL:
    def test_entry_available_before_ttl(self):
        cache = ResponseCache(ttl_seconds=60)
        cache.set("q", "r")
        assert cache.get("q") == "r"

    def test_entry_expires_after_ttl(self):
        cache = ResponseCache(ttl_seconds=1)
        cache.set("q", "r")
        time.sleep(1.1)
        assert cache.get("q") is None

    def test_expired_entry_removed_from_cache(self):
        cache = ResponseCache(ttl_seconds=1)
        cache.set("q", "r")
        time.sleep(1.1)
        cache.get("q")  # triggers removal
        assert cache.stats["cached_entries"] == 0

    def test_fresh_entry_not_removed(self):
        cache = ResponseCache(ttl_seconds=60)
        cache.set("q", "r")
        cache.get("q")
        assert cache.stats["cached_entries"] == 1


# ===========================================================================
# Hit / miss counters
# ===========================================================================

class TestResponseCacheCounters:
    def setup_method(self):
        self.cache = ResponseCache(ttl_seconds=60)

    def test_miss_increments_miss_counter(self):
        self.cache.get("nothing")
        assert self.cache.stats["misses"] == 1

    def test_hit_increments_hit_counter(self):
        self.cache.set("q", "r")
        self.cache.get("q")
        assert self.cache.stats["hits"] == 1

    def test_multiple_hits_counted(self):
        self.cache.set("q", "r")
        self.cache.get("q")
        self.cache.get("q")
        self.cache.get("q")
        assert self.cache.stats["hits"] == 3

    def test_expired_entry_counts_as_miss(self):
        cache = ResponseCache(ttl_seconds=1)
        cache.set("q", "r")
        cache.get("q")          # hit
        time.sleep(1.1)
        cache.get("q")          # miss (expired)
        assert cache.stats["hits"] == 1
        assert cache.stats["misses"] == 1

    def test_initial_counters_are_zero(self):
        stats = self.cache.stats
        assert stats["hits"] == 0
        assert stats["misses"] == 0


# ===========================================================================
# stats
# ===========================================================================

class TestResponseCacheStats:
    def setup_method(self):
        self.cache = ResponseCache(ttl_seconds=60)

    def test_stats_keys_present(self):
        stats = self.cache.stats
        assert "hits" in stats
        assert "misses" in stats
        assert "hit_rate" in stats
        assert "cached_entries" in stats

    def test_hit_rate_zero_with_no_requests(self):
        assert self.cache.stats["hit_rate"] == "0.0%"

    def test_hit_rate_100_percent_on_all_hits(self):
        self.cache.set("q", "r")
        self.cache.get("q")
        assert self.cache.stats["hit_rate"] == "100.0%"

    def test_hit_rate_50_percent(self):
        self.cache.set("q", "r")
        self.cache.get("q")       # hit
        self.cache.get("miss")    # miss
        assert self.cache.stats["hit_rate"] == "50.0%"

    def test_cached_entries_reflects_set_calls(self):
        self.cache.set("a", "1")
        self.cache.set("b", "2")
        assert self.cache.stats["cached_entries"] == 2

    def test_cached_entries_zero_on_empty(self):
        assert self.cache.stats["cached_entries"] == 0

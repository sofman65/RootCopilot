"""
Tests for app/llm/monitoring.py

Covers: JSONFormatter (output shape, extra_data, exc_info),
        get_logger (handler deduplication),
        MetricsCollector (record_request, summary calculations),
        RequestTimer (elapsed_ms, exception propagation).
"""

import json
import logging
import time
import pytest
from app.llm.monitoring import JSONFormatter, get_logger, MetricsCollector, RequestTimer


# ===========================================================================
# JSONFormatter
# ===========================================================================

class TestJSONFormatter:
    def _make_record(self, msg="test message", level=logging.INFO, extra_data=None):
        record = logging.LogRecord(
            name="test", level=level, pathname="", lineno=0,
            msg=msg, args=(), exc_info=None,
        )
        if extra_data:
            record.extra_data = extra_data
        return record

    def _format(self, record):
        formatter = JSONFormatter()
        return json.loads(formatter.format(record))

    def test_output_is_valid_json(self):
        record = self._make_record()
        formatter = JSONFormatter()
        raw = formatter.format(record)
        parsed = json.loads(raw)  # must not raise
        assert isinstance(parsed, dict)

    def test_required_keys_present(self):
        parsed = self._format(self._make_record())
        assert "timestamp" in parsed
        assert "level" in parsed
        assert "message" in parsed
        assert "module" in parsed
        assert "function" in parsed

    def test_message_content(self):
        parsed = self._format(self._make_record("hello world"))
        assert parsed["message"] == "hello world"

    def test_level_info(self):
        parsed = self._format(self._make_record(level=logging.INFO))
        assert parsed["level"] == "INFO"

    def test_level_warning(self):
        parsed = self._format(self._make_record(level=logging.WARNING))
        assert parsed["level"] == "WARNING"

    def test_level_error(self):
        parsed = self._format(self._make_record(level=logging.ERROR))
        assert parsed["level"] == "ERROR"

    def test_extra_data_merged(self):
        parsed = self._format(self._make_record(extra_data={"user_id": "u-123", "latency": 42}))
        assert parsed["user_id"] == "u-123"
        assert parsed["latency"] == 42

    def test_no_extra_data_no_extra_keys(self):
        parsed = self._format(self._make_record())
        assert "user_id" not in parsed
        assert "exception" not in parsed

    def test_exception_key_present_on_exc_info(self):
        try:
            raise ValueError("boom")
        except ValueError:
            import sys
            record = logging.LogRecord(
                name="test", level=logging.ERROR, pathname="", lineno=0,
                msg="something failed", args=(), exc_info=sys.exc_info(),
            )
        parsed = self._format(record)
        assert "exception" in parsed
        assert "ValueError" in parsed["exception"]

    def test_timestamp_is_iso_format(self):
        parsed = self._format(self._make_record())
        ts = parsed["timestamp"]
        from datetime import datetime
        datetime.fromisoformat(ts)  # must not raise


# ===========================================================================
# get_logger
# ===========================================================================

class TestGetLogger:
    def test_returns_logger_instance(self):
        logger = get_logger("test.logger.a")
        assert isinstance(logger, logging.Logger)

    def test_logger_has_one_handler(self):
        logger = get_logger("test.logger.b")
        assert len(logger.handlers) == 1

    def test_calling_twice_does_not_duplicate_handlers(self):
        get_logger("test.logger.c")
        logger = get_logger("test.logger.c")
        assert len(logger.handlers) == 1

    def test_handler_uses_json_formatter(self):
        logger = get_logger("test.logger.d")
        assert isinstance(logger.handlers[0].formatter, JSONFormatter)

    def test_default_level_is_info(self):
        logger = get_logger("test.logger.e")
        assert logger.level == logging.INFO


# ===========================================================================
# MetricsCollector
# ===========================================================================

class TestMetricsCollectorRecordRequest:
    def setup_method(self):
        self.m = MetricsCollector()

    def test_single_request_increments_total(self):
        self.m.record_request(latency_ms=100)
        assert self.m.summary["total_requests"] == 1

    def test_multiple_requests_counted(self):
        self.m.record_request(latency_ms=100)
        self.m.record_request(latency_ms=200)
        self.m.record_request(latency_ms=300)
        assert self.m.summary["total_requests"] == 3

    def test_error_flag_increments_error_count(self):
        self.m.record_request(latency_ms=50, error=True)
        assert self.m.summary["total_errors"] == 1

    def test_no_error_does_not_increment_error_count(self):
        self.m.record_request(latency_ms=50, error=False)
        assert self.m.summary["total_errors"] == 0

    def test_input_tokens_accumulated(self):
        self.m.record_request(latency_ms=10, input_tokens=100)
        self.m.record_request(latency_ms=10, input_tokens=50)
        assert self.m.summary["total_input_tokens"] == 150

    def test_output_tokens_accumulated(self):
        self.m.record_request(latency_ms=10, output_tokens=200)
        self.m.record_request(latency_ms=10, output_tokens=100)
        assert self.m.summary["total_output_tokens"] == 300

    def test_cache_hit_recorded(self):
        self.m.record_request(latency_ms=5, cache_hit=True)
        assert self.m.summary["cache_hit_rate"] == "100.00%"

    def test_cache_miss_recorded(self):
        self.m.record_request(latency_ms=5, cache_hit=False)
        assert self.m.summary["cache_hit_rate"] == "0.00%"


class TestMetricsCollectorSummary:
    def setup_method(self):
        self.m = MetricsCollector()

    def test_summary_keys_present(self):
        keys = self.m.summary.keys()
        assert "total_requests" in keys
        assert "total_errors" in keys
        assert "error_rate" in keys
        assert "avg_latency_ms" in keys
        assert "cache_hit_rate" in keys
        assert "total_input_tokens" in keys
        assert "total_output_tokens" in keys

    def test_zero_requests_returns_safe_defaults(self):
        s = self.m.summary
        assert s["total_requests"] == 0
        assert s["avg_latency_ms"] == 0.0
        assert s["error_rate"] == "0.00%"
        assert s["cache_hit_rate"] == "0.00%"

    def test_avg_latency_calculated_correctly(self):
        self.m.record_request(latency_ms=100)
        self.m.record_request(latency_ms=200)
        assert self.m.summary["avg_latency_ms"] == 150.0

    def test_error_rate_100_percent(self):
        self.m.record_request(latency_ms=10, error=True)
        assert self.m.summary["error_rate"] == "100.00%"

    def test_error_rate_50_percent(self):
        self.m.record_request(latency_ms=10, error=True)
        self.m.record_request(latency_ms=10, error=False)
        assert self.m.summary["error_rate"] == "50.00%"

    def test_error_rate_zero_percent(self):
        self.m.record_request(latency_ms=10)
        assert self.m.summary["error_rate"] == "0.00%"

    def test_cache_hit_rate_50_percent(self):
        self.m.record_request(latency_ms=10, cache_hit=True)
        self.m.record_request(latency_ms=10, cache_hit=False)
        assert self.m.summary["cache_hit_rate"] == "50.00%"

    def test_avg_latency_rounded_to_two_decimals(self):
        self.m.record_request(latency_ms=100)
        self.m.record_request(latency_ms=101)
        self.m.record_request(latency_ms=102)
        avg = self.m.summary["avg_latency_ms"]
        assert avg == round(avg, 2)


# ===========================================================================
# RequestTimer
# ===========================================================================

class TestRequestTimer:
    def test_elapsed_ms_is_set_after_block(self):
        with RequestTimer() as t:
            pass
        assert hasattr(t, "elapsed_ms")

    def test_elapsed_ms_is_positive(self):
        with RequestTimer() as t:
            pass
        assert t.elapsed_ms >= 0

    def test_elapsed_ms_reflects_real_time(self):
        with RequestTimer() as t:
            time.sleep(0.05)
        assert t.elapsed_ms >= 45  # allow some tolerance

    def test_elapsed_ms_is_milliseconds_not_seconds(self):
        with RequestTimer() as t:
            time.sleep(0.1)
        assert t.elapsed_ms >= 90  # would be ~0.1 if it were seconds

    def test_exceptions_propagate(self):
        with pytest.raises(ValueError):
            with RequestTimer():
                raise ValueError("test error")

    def test_elapsed_ms_set_even_on_exception(self):
        timer = RequestTimer()
        try:
            with timer:
                raise ValueError("boom")
        except ValueError:
            pass
        assert hasattr(timer, "elapsed_ms")

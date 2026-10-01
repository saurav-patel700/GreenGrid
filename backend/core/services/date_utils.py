"""
Date range and time series bucket aggregation utilities for GreenGrid EMIS.
"""

from datetime import datetime, timedelta, timezone as dt_tz
from django.utils import timezone
import zoneinfo

def parse_date_range(range_key="7d", start_str=None, end_str=None, org_timezone="America/Chicago"):
    """
    Parses date range options: 24h, 7d, 30d, 90d, YTD, custom.
    Returns (start_dt, end_dt, comparison_start_dt, comparison_end_dt, label).
    """
    now = timezone.now()
    range_clean = (range_key or "7d").lower()

    if start_str and end_str and range_clean == "custom":
        try:
            start_dt = datetime.fromisoformat(start_str.replace("Z", "+00:00"))
            end_dt = datetime.fromisoformat(end_str.replace("Z", "+00:00"))
            if timezone.is_naive(start_dt):
                start_dt = timezone.make_aware(start_dt)
            if timezone.is_naive(end_dt):
                end_dt = timezone.make_aware(end_dt)
            duration = end_dt - start_dt
            comp_end_dt = start_dt
            comp_start_dt = start_dt - duration
            return start_dt, end_dt, comp_start_dt, comp_end_dt, f"vs custom prior {duration.days}d"
        except Exception:
            pass

    if range_clean == "24h":
        end_dt = now
        start_dt = now - timedelta(hours=24)
        comp_end_dt = start_dt
        comp_start_dt = start_dt - timedelta(hours=24)
        label = "vs prior 24 hours"
    elif range_clean == "30d":
        end_dt = now
        start_dt = now - timedelta(days=30)
        comp_end_dt = start_dt
        comp_start_dt = start_dt - timedelta(days=30)
        label = "vs prior 30 days"
    elif range_clean == "90d":
        end_dt = now
        start_dt = now - timedelta(days=90)
        comp_end_dt = start_dt
        comp_start_dt = start_dt - timedelta(days=90)
        label = "vs prior 90 days"
    elif range_clean == "ytd":
        end_dt = now
        start_dt = datetime(now.year, 1, 1, tzinfo=dt_tz.utc)
        duration = end_dt - start_dt
        comp_end_dt = start_dt
        comp_start_dt = start_dt - duration
        label = "vs prior period"
    else:  # Default to 7d
        end_dt = now
        start_dt = now - timedelta(days=7)
        comp_end_dt = start_dt
        comp_start_dt = start_dt - timedelta(days=7)
        label = "vs prior 7 days"

    return start_dt, end_dt, comp_start_dt, comp_end_dt, label

def determine_aggregation(start_dt, end_dt, requested_agg=None):
    """
    Determines reasonable aggregation bucket interval (raw, 15m, 30m, 1h, 1d)
    based on date range duration to ensure performance.
    """
    if requested_agg in ["raw", "15m", "30m", "1h", "1d"]:
        return requested_agg

    duration_hours = (end_dt - start_dt).total_seconds() / 3600.0

    if duration_hours <= 24:
        return "15m"
    elif duration_hours <= 168:  # 7 days
        return "1h"
    else:
        return "1d"

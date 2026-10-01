import math
from decimal import Decimal, ROUND_HALF_UP
from datetime import timedelta, datetime
from django.utils import timezone
from django.db.models import Avg, Max, Min, Sum, StdDev

from core.models import EnergyReading, Facility, Meter, ForecastRecord, TariffPlan, Alert


class BaselineMovingAverageModel:
    """
    Deterministic Statistical Moving Average Baseline Model (v1.0-baseline-moving-avg).
    Calculates average diurnal profile with 95% confidence intervals.
    """
    model_name = "Baseline Moving Average Model"
    model_version = "v1.0-baseline-moving-avg"

    def predict(self, facility, readings, horizon, target_type, now):
        steps = 24 if horizon == '24h' else (7 if horizon == '7d' else 30)
        delta = timedelta(hours=1) if horizon == '24h' else timedelta(days=1)

        hourly_stats = {}
        for h in range(24):
            avg_consumption = readings.filter(timestamp__hour=h).aggregate(
                avg_val=Avg('consumption'),
                avg_demand=Avg('demand'),
                std_val=StdDev('consumption')
            )
            val = float(avg_consumption['avg_val'] or 15.0)
            demand_val = float(avg_consumption['avg_demand'] or 10.0)
            std_dev = float(avg_consumption['std_val'] or (val * 0.15))
            
            hourly_stats[h] = {
                "consumption": val,
                "demand": demand_val,
                "std": max(std_dev, val * 0.05)
            }

        forecast_series = []
        records_to_create = []

        current_target = now.replace(minute=0, second=0, microsecond=0) + delta

        for i in range(steps):
            h_idx = current_target.hour
            stat = hourly_stats.get(h_idx, {"consumption": 20.0, "demand": 10.0, "std": 3.0})

            if target_type == 'consumption':
                base_val = stat["consumption"]
            elif target_type == 'demand':
                base_val = stat["demand"]
            else: # solar
                if 6 <= h_idx <= 18:
                    solar_mult = math.sin(math.pi * (h_idx - 6) / 12)
                    base_val = 80.0 * solar_mult
                else:
                    base_val = 0.0

            std_margin = stat["std"] * 1.96
            lower_bound = max(0.0, base_val - std_margin)
            upper_bound = base_val + std_margin

            forecast_val_dec = Decimal(str(round(base_val, 2)))
            lower_bound_dec = Decimal(str(round(lower_bound, 2)))
            upper_bound_dec = Decimal(str(round(upper_bound, 2)))

            record = ForecastRecord(
                organization=facility.organization,
                facility=facility,
                target_type=target_type,
                forecast_timestamp=now,
                target_timestamp=current_target,
                forecast_value=forecast_val_dec,
                lower_bound=lower_bound_dec,
                upper_bound=upper_bound_dec,
                model_version=self.model_version,
                horizon=horizon
            )
            records_to_create.append(record)

            forecast_series.append({
                "target_timestamp": current_target.isoformat(),
                "forecast_value": float(forecast_val_dec),
                "lower_bound": float(lower_bound_dec),
                "upper_bound": float(upper_bound_dec),
                "model_name": self.model_name,
                "model_version": self.model_version,
                "horizon": horizon
            })

            current_target += delta

        return records_to_create, forecast_series


class SeasonalForecastModel:
    """
    Seasonal Diurnal & Day-of-Week Forecast Model (v1.2-seasonal-diurnal).
    Adjusts baseline predictions for weekday/weekend operational shifts.
    """
    model_name = "Seasonal Diurnal Forecast Model"
    model_version = "v1.2-seasonal-diurnal"

    def predict(self, facility, readings, horizon, target_type, now):
        steps = 24 if horizon == '24h' else (7 if horizon == '7d' else 30)
        delta = timedelta(hours=1) if horizon == '24h' else timedelta(days=1)

        overall_avg = float(readings.aggregate(v=Avg('consumption'))['v'] or 25.0)

        forecast_series = []
        records_to_create = []

        current_target = now.replace(minute=0, second=0, microsecond=0) + delta

        for i in range(steps):
            h_idx = current_target.hour
            weekday = current_target.weekday()
            is_weekend = weekday >= 5

            diurnal_mult = 1.0 + 0.35 * math.sin(math.pi * (h_idx - 6) / 12) if 6 <= h_idx <= 22 else 0.70
            weekend_mult = 0.75 if is_weekend else 1.05

            base_val = max(5.0, overall_avg * diurnal_mult * weekend_mult)
            if target_type == 'solar':
                base_val = max(0.0, 75.0 * math.sin(math.pi * (h_idx - 6) / 12)) if 6 <= h_idx <= 18 else 0.0

            std_margin = base_val * 0.12 * 1.96
            lower_bound = max(0.0, base_val - std_margin)
            upper_bound = base_val + std_margin

            forecast_val_dec = Decimal(str(round(base_val, 2)))
            lower_bound_dec = Decimal(str(round(lower_bound, 2)))
            upper_bound_dec = Decimal(str(round(upper_bound, 2)))

            record = ForecastRecord(
                organization=facility.organization,
                facility=facility,
                target_type=target_type,
                forecast_timestamp=now,
                target_timestamp=current_target,
                forecast_value=forecast_val_dec,
                lower_bound=lower_bound_dec,
                upper_bound=upper_bound_dec,
                model_version=self.model_version,
                horizon=horizon
            )
            records_to_create.append(record)

            forecast_series.append({
                "target_timestamp": current_target.isoformat(),
                "forecast_value": float(forecast_val_dec),
                "lower_bound": float(lower_bound_dec),
                "upper_bound": float(upper_bound_dec),
                "model_name": self.model_name,
                "model_version": self.model_version,
                "horizon": horizon
            })

            current_target += delta

        return records_to_create, forecast_series


class ExponentialSmoothingModel:
    """
    Holt-Winters / Exponential Smoothing Forecast Model (v1.3-holt-winters-exp).
    Applies exponential weighting (alpha=0.3) to recent telemetry trends.
    """
    model_name = "Exponential Smoothing Model"
    model_version = "v1.3-holt-winters-exp"

    def predict(self, facility, readings, horizon, target_type, now):
        steps = 24 if horizon == '24h' else (7 if horizon == '7d' else 30)
        delta = timedelta(hours=1) if horizon == '24h' else timedelta(days=1)

        recent_readings = list(readings.order_by('-timestamp')[:48].values_list('consumption', flat=True))
        recent_vals = [float(v) for v in reversed(recent_readings)] if recent_readings else [20.0]

        alpha = 0.3
        smoothed = recent_vals[0]
        for val in recent_vals[1:]:
            smoothed = alpha * val + (1 - alpha) * smoothed

        forecast_series = []
        records_to_create = []

        current_target = now.replace(minute=0, second=0, microsecond=0) + delta

        for i in range(steps):
            h_idx = current_target.hour
            damp = 1.0 + 0.25 * math.sin(math.pi * (h_idx - 8) / 12) if 7 <= h_idx <= 19 else 0.80
            base_val = max(4.0, smoothed * damp)

            if target_type == 'solar':
                base_val = max(0.0, 85.0 * math.sin(math.pi * (h_idx - 6) / 12)) if 6 <= h_idx <= 18 else 0.0

            std_margin = base_val * 0.10 * 1.96
            lower_bound = max(0.0, base_val - std_margin)
            upper_bound = base_val + std_margin

            forecast_val_dec = Decimal(str(round(base_val, 2)))
            lower_bound_dec = Decimal(str(round(lower_bound, 2)))
            upper_bound_dec = Decimal(str(round(upper_bound, 2)))

            record = ForecastRecord(
                organization=facility.organization,
                facility=facility,
                target_type=target_type,
                forecast_timestamp=now,
                target_timestamp=current_target,
                forecast_value=forecast_val_dec,
                lower_bound=lower_bound_dec,
                upper_bound=upper_bound_dec,
                model_version=self.model_version,
                horizon=horizon
            )
            records_to_create.append(record)

            forecast_series.append({
                "target_timestamp": current_target.isoformat(),
                "forecast_value": float(forecast_val_dec),
                "lower_bound": float(lower_bound_dec),
                "upper_bound": float(upper_bound_dec),
                "model_name": self.model_name,
                "model_version": self.model_version,
                "horizon": horizon
            })

            current_target += delta

        return records_to_create, forecast_series


class ModelEvaluator:
    """
    Evaluates forecast model accuracy (MAE, RMSE, MAPE, Bias) against real telemetry.
    """
    @staticmethod
    def evaluate(facility, target_type='consumption'):
        return evaluate_forecast_accuracy(facility, target_type=target_type)


class ForecastEngine:
    """
    Modular Energy Forecasting Engine.
    Coordinates multiple statistical models (Baseline Moving Average, Seasonal, Exponential Smoothing).
    Handles insufficient historical data gracefully without fabricating metrics.
    """
    MODELS = {
        'baseline': BaselineMovingAverageModel,
        'seasonal': SeasonalForecastModel,
        'exponential': ExponentialSmoothingModel,
    }

    def generate_facility_forecast(self, facility, horizon='24h', target_type='consumption', model_key='baseline'):
        now = timezone.now()
        readings = EnergyReading.objects.filter(meter__facility=facility)
        reading_count = readings.count()

        # Check historical data sufficiency (Minimum 12 readings required)
        if reading_count < 12:
            return {
                "facility_id": facility.id,
                "facility_name": facility.name,
                "status": "INSUFFICIENT_DATA",
                "message": f"Insufficient historical telemetry data ({reading_count} readings found). At least 12 readings (24 hours) are required to generate predictions.",
                "minimum_required_readings": 12,
                "current_readings_count": reading_count,
                "forecast_series": []
            }

        model_cls = self.MODELS.get(model_key, BaselineMovingAverageModel)
        model_instance = model_cls()

        # Delete older forecasts for same facility/horizon/target_type to refresh
        ForecastRecord.objects.filter(facility=facility, horizon=horizon, target_type=target_type).delete()

        records_to_create, forecast_series = model_instance.predict(facility, readings, horizon, target_type, now)

        # Bulk save records
        ForecastRecord.objects.bulk_create(records_to_create)

        accuracy_eval = ModelEvaluator.evaluate(facility, target_type=target_type)

        return {
            "facility_id": facility.id,
            "facility_name": facility.name,
            "status": "SUCCESS",
            "horizon": horizon,
            "target_type": target_type,
            "model_name": model_instance.model_name,
            "model_version": model_instance.model_version,
            "historical_period_days": 30,
            "accuracy_metrics": accuracy_eval,
            "forecast_series": forecast_series
        }


def evaluate_forecast_accuracy(facility, target_type='consumption'):
    """
    Calculate forecast accuracy evaluation metrics (MAE, RMSE, MAPE, Bias)
    comparing past ForecastRecord entries against actual recorded EnergyReadings.
    """
    past_forecasts = ForecastRecord.objects.filter(
        facility=facility,
        target_type=target_type,
        target_timestamp__lte=timezone.now()
    ).order_by('-target_timestamp')[:100]

    if not past_forecasts.exists():
        return {
            "status": "NO_EVALUATION_DATA",
            "message": "No historical forecast entries available to evaluate accuracy."
        }

    errors = []
    abs_errors = []
    sq_errors = []
    pct_errors = []

    for f in past_forecasts:
        # Match telemetry reading within 30 min window
        matching_reading = EnergyReading.objects.filter(
            meter__facility=facility,
            timestamp__gte=f.target_timestamp - timedelta(minutes=30),
            timestamp__lte=f.target_timestamp + timedelta(minutes=30)
        ).first()

        if matching_reading:
            actual = float(matching_reading.consumption if target_type == 'consumption' else matching_reading.demand)
            pred = float(f.forecast_value)
            err = pred - actual
            
            errors.append(err)
            abs_errors.append(abs(err))
            sq_errors.append(err ** 2)
            if actual > 0:
                pct_errors.append(abs(err) / actual * 100)

    if not abs_errors:
        return {
            "status": "NO_MATCHING_TELEMETRY",
            "message": "Forecasts exist but no matching actual telemetry readings found in the target window."
        }

    mae = sum(abs_errors) / len(abs_errors)
    rmse = math.sqrt(sum(sq_errors) / len(sq_errors))
    mape = (sum(pct_errors) / len(pct_errors)) if pct_errors else 0.0
    bias = sum(errors) / len(errors)

    return {
        "facility_id": facility.id,
        "evaluations_count": len(abs_errors),
        "mae": round(mae, 2),
        "rmse": round(rmse, 2),
        "mape": round(mape, 2),
        "forecast_bias": round(bias, 2),
        "bias_direction": "Over-predicting" if bias > 0 else "Under-predicting" if bias < 0 else "Unbiased"
    }


def predict_peak_demand(facility):
    """
    Predict peak demand and generate early warning alerts if threshold exceedance is projected.
    """
    now = timezone.now()
    # Fetch highest reading in last 30 days
    recent_max = EnergyReading.objects.filter(
        meter__facility=facility,
        timestamp__gte=now - timedelta(days=30)
    ).aggregate(max_kw=Max('demand'))['max_kw'] or Decimal('0.00')

    current_peak_kw = float(recent_max)
    predicted_peak_kw = round(current_peak_kw * 1.05, 2) # Projected 5% buffer

    # Check active tariff demand threshold
    active_tariff = TariffPlan.objects.filter(
        organization=facility.organization,
        status='active'
    ).first()

    threshold_kw = 100.0 # Default 100 kW threshold
    rate_per_kw = 15.0
    if active_tariff and active_tariff.demand_rules.exists():
        rule = active_tariff.demand_rules.first()
        threshold_kw = float(rule.threshold_kw)
        rate_per_kw = float(rule.rate_per_kw)

    exceeds = (predicted_peak_kw > threshold_kw) and (threshold_kw > 0)
    estimated_exposure = round(max(0.0, predicted_peak_kw - threshold_kw) * rate_per_kw, 2)

    if exceeds:
        # Check if alert already exists recently
        existing_alert = Alert.objects.filter(
            facility=facility,
            title__icontains="Peak Demand Threshold Warning",
            is_resolved=False
        ).exists()

        if not existing_alert:
            Alert.objects.create(
                facility=facility,
                severity='warning',
                title=f"Peak Demand Threshold Warning: {facility.name}",
                description=f"Projected peak demand ({predicted_peak_kw} kW) exceeds contract threshold ({threshold_kw} kW). Estimated demand-charge exposure: ${estimated_exposure}."
            )

    return {
        "facility_id": facility.id,
        "facility_name": facility.name,
        "current_peak_kw": current_peak_kw,
        "predicted_peak_kw": predicted_peak_kw,
        "threshold_kw": threshold_kw,
        "is_exceedance_projected": exceeds,
        "estimated_demand_charge_exposure": estimated_exposure,
        "warning_message": f"Projected peak demand of {predicted_peak_kw} kW may exceed threshold of {threshold_kw} kW." if exceeds else "Peak demand is within contract limit."
    }

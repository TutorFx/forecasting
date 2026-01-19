import logging
from models.generated.proto.prophet_request import Message as ProphetRequest
from models.generated.proto.prophet_response import Message as ForecastResponse, MessageForecast as ForecastResponseForecast

# Configure logging
logger = logging.getLogger(__name__)

async def handle_prophet_request(request: ProphetRequest) -> ForecastResponse:
    logger.info(f"Processing job_id: {request.job_id}")
    logger.info(f"Data points received: {len(request.data)}")
    
    # Mock processing
    response = ForecastResponse()
    response.job_id = request.job_id
    response.status = "SUCCESS"
    
    # Create a dummy forecast point
    forecast_point = ForecastResponseForecast()
    forecast_point.ds = "2025-01-02"
    forecast_point.yhat = 123.456
    response.forecast.append(forecast_point)
    
    return response

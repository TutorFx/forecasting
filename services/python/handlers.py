import logging
import pandas as pd
from prophet import Prophet
from models.generated.proto.prophet_request import Message as ProphetRequest
from models.generated.proto.prophet_response import Message as ForecastResponse, MessageForecast as ForecastResponseForecast, MessageMetrics as ForecastResponseMetrics

# Configure logging
logger = logging.getLogger(__name__)

async def handle_prophet_request(request: ProphetRequest) -> ForecastResponse:
  logger.info(f"Processing job_id: {request.job_id}")
  logger.info(f"Data points received: {len(request.data)}")
  
  try:
      # Check if data exists
      if not request.data:
          raise ValueError("No data provided for forecasting")

      # Convert data to DataFrame
      df = pd.DataFrame([{'ds': d.ds, 'y': d.y} for d in request.data])
      df['ds'] = pd.to_datetime(df['ds'])
      
      # Configure Prophet parameters
      periods = request.parameters.periods if request.parameters.periods else 30
      freq = request.parameters.freq if request.parameters.freq else 'D'
      
      # Prepare response
      response = ForecastResponse()
      response.job_id = request.job_id
      response.status = "SUCCESS"

      # --- Accuracy Calculation (Train/Test Split) ---
      # Only perform if we have enough data (e.g., at least 10 points)
      if len(df) >= 10:
          split_idx = int(len(df) * 0.8) # 80% train, 20% test
          train_df = df.iloc[:split_idx]
          test_df = df.iloc[split_idx:]
          
          if len(test_df) > 0:
              model_test = Prophet()
              if request.parameters.holiday_country_code:
                  model_test.add_country_holidays(country_name=request.parameters.holiday_country_code)
              model_test.fit(train_df)
              
              future_test = test_df[['ds']].copy()
              forecast_test = model_test.predict(future_test)
              
              # Merge actuals with forecast to compare
              results = test_df.merge(forecast_test[['ds', 'yhat']], on='ds')
              results['error'] = results['y'] - results['yhat']
              results['abs_error'] = results['error'].abs()
              results['sq_error'] = results['error'] ** 2
              results['pct_error'] = (results['error'] / results['y']).abs()
              
              # Calculate metrics
              mae = results['abs_error'].mean()
              rmse = (results['sq_error'].mean()) ** 0.5
              
              # Handle division by zero for MAPE
              # If any y is 0, MAPE might be infinite or undefined. We can filter or just accept inf.
              # Let's clean it up slightly: replace inf with 0 or skip
              import numpy as np
              valid_mape = results['pct_error'].replace([np.inf, -np.inf], np.nan).dropna()
              mape = valid_mape.mean() * 100 # Percentage
              
              response.metrics = ForecastResponseMetrics(
                  mae=float(mae),
                  rmse=float(rmse),
                  mape=float(mape) if not pd.isna(mape) else 0.0
              )
              logger.info(f"Accuracy calculated: MAE={mae:.2f}, RMSE={rmse:.2f}, MAPE={mape:.2f}%")

      # --- Final Forecast (Full Data) ---
      model = Prophet()
      if request.parameters.holiday_country_code:
        model.add_country_holidays(country_name=request.parameters.holiday_country_code)
      model.fit(df)
      
      future = model.make_future_dataframe(periods=periods, freq=freq)
      forecast = model.predict(future)
      
      # Convert forecast to response objects
      for _, row in forecast.iterrows():
        forecast_point = ForecastResponseForecast()
        forecast_point.ds = str(row['ds'].strftime('%Y-%m-%d')) # Ensure date string format
        forecast_point.yhat = float(row.get('yhat', 0.0))
        forecast_point.yhat_lower = float(row.get('yhat_lower', 0.0))
        forecast_point.yhat_upper = float(row.get('yhat_upper', 0.0))
        forecast_point.trend = float(row.get('trend', 0.0))
        forecast_point.seasonal = float(row.get('seasonal', 0.0))
        
        # holidays column is present only if holidays are configured
        forecast_point.holidays = float(row.get('holidays', 0.0))
            
        response.forecast.append(forecast_point)
      
      logger.info(f"Forecast generated successfully. Points: {len(response.forecast)}")
      return response

  except Exception as e:
    logger.error(f"Error processing job {request.job_id}: {str(e)}", exc_info=True)
    response = ForecastResponse()
    response.job_id = request.job_id
    response.status = f"ERROR: {str(e)}"
    return response

import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from models.generated.proto.prophet_request import Message as ProphetRequest
from models.generated.proto.prophet_response import Message as ForecastResponse
from messaging import mq_client
from handlers import handle_prophet_request

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)



@asynccontextmanager
async def lifespan(app: FastAPI):
    # Setup consumers
    mq_client.register_consumer("ProcessProphet", ProphetRequest, handle_prophet_request, response_queue="ProphetResponse")
    
    # Start connection and consumers
    consumer_task = asyncio.create_task(mq_client.start_consumers())
    
    yield
    
    # Shutdown
    await mq_client.close()
    consumer_task.cancel()
    try:
        await consumer_task
    except asyncio.CancelledError:
        pass

app = FastAPI(lifespan=lifespan)

@app.get("/")
def read_root():
    return {"message": "Prophet Service Running"}

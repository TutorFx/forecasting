import asyncio
import contextlib
import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI

from handlers import handle_prophet_request
from messaging import mq_client
from models.generated.proto.prophet_request import Message as ProphetRequest

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
  # Setup consumers
  mq_client.register_consumer(
    "ProcessProphet", ProphetRequest, handle_prophet_request, response_queue="ProphetResponse"
  )

  # Start connection and consumers
  consumer_task = asyncio.create_task(mq_client.start_consumers())

  yield

  # Shutdown
  await mq_client.close()
  consumer_task.cancel()
  with contextlib.suppress(asyncio.CancelledError):
    await consumer_task


app = FastAPI(lifespan=lifespan)


@app.get("/")
def read_root() -> dict[str, str]:
  return {"message": "Prophet Service Running"}

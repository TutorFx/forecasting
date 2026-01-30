import logging
import os
from collections.abc import Awaitable, Callable
from pathlib import Path

import aio_pika
from dotenv import load_dotenv
from google.protobuf.message import Message

# Configure logging
logger = logging.getLogger(__name__)

# Load .env locally if not loaded (though likely loaded by main)
core_env_path = Path(__file__).resolve().parent.parent.parent / "core" / ".env"
load_dotenv(core_env_path)

RABBITMQ_USER = os.getenv("RABBITMQ_USER", "guest")
RABBITMQ_PASS = os.getenv("RABBITMQ_PASS", "guest")
RABBITMQ_HOST = os.getenv("RABBITMQ_HOST", "localhost")
RABBITMQ_PORT = os.getenv("RABBITMQ_PORT", "5672")
RABBITMQ_URL = f"amqp://{RABBITMQ_USER}:{RABBITMQ_PASS}@{RABBITMQ_HOST}:{RABBITMQ_PORT}/%2f"

# Default response queue if reply_to is missing
# DEFAULT_RESULTS_QUEUE = "ProphetResponse" # Removed in favor of per-consumer configuration

MessageHandler = Callable[[Message], Awaitable[Message | None]]


class RabbitMQClient:
  def __init__(self) -> None:
    self.connection: aio_pika.Connection | None = None
    self.channel: aio_pika.Channel | None = None
    # consumers[queue_name] = (proto_class, handler, response_queue)
    self.consumers: dict[str, tuple[Callable[[], Message], MessageHandler, str | None]] = {}

  async def connect(self) -> None:
    self.connection = await aio_pika.connect_robust(RABBITMQ_URL)
    self.channel = await self.connection.channel()
    logger.info("Connected to RabbitMQ")

  async def close(self) -> None:
    if self.connection:
      await self.connection.close()
      logger.info("Closed RabbitMQ connection")

  def register_consumer(
    self,
    queue_name: str,
    proto_class: Callable[[], Message],
    handler: MessageHandler,
    response_queue: str | None = None,
  ) -> None:
    """
    Register a handler for a specific queue.
    proto_class: The Protobuf class to deserialize into (e.g. ProphetRequest)
    handler: Async function that takes the deserialized message and returns an optional response Message.
    response_queue: Default queue to send responses to if reply_to is missing.
    """
    self.consumers[queue_name] = (proto_class, handler, response_queue)

  async def _process_incoming_message(self, message: aio_pika.IncomingMessage, queue_name: str) -> None:
    proto_class, handler, default_resp_queue = self.consumers[queue_name]

    async with message.process():
      try:
        # Deserialize
        request_obj = proto_class().parse(message.body)

        # Handle
        response_obj = await handler(request_obj)

        # Send response if exists
        if response_obj:
          reply_to = message.reply_to or default_resp_queue

          if not reply_to:
            logger.warning(
              f"No reply_to and no default response queue for {queue_name}. Message processed but no response sent."
            )
            return

          correlation_id = message.correlation_id

          response_body = bytes(response_obj)

          await self.channel.default_exchange.publish(
            aio_pika.Message(
              body=response_body,
              correlation_id=correlation_id,
              delivery_mode=aio_pika.DeliveryMode.PERSISTENT,
            ),
            routing_key=reply_to,
          )
          logger.info(f"Sent response to {reply_to} (corr_id={correlation_id})")

      except Exception as e:
        logger.error(f"Error processing message in {queue_name}: {e}")

  async def start_consumers(self) -> None:
    if not self.channel:
      await self.connect()

    for queue_name, (_, _, response_queue) in self.consumers.items():
      # Declare input queue
      queue = await self.channel.declare_queue(queue_name, durable=True)

      # Optionally declare response queue to ensure it exists
      if response_queue:
        await self.channel.declare_queue(response_queue, durable=True)

      # We need to capture queue_name in the closure
      async def callback(msg: aio_pika.IncomingMessage, q_name: str = queue_name) -> None:
        await self._process_incoming_message(msg, q_name)

      await queue.consume(callback)
      logger.info(f"Started consumer for queue: {queue_name} (response -> {response_queue or 'dynamic'})")


# Global instance for simplicity in this microservice
mq_client = RabbitMQClient()

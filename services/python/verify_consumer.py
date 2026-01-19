import asyncio
import aio_pika
import os
import uuid
from pathlib import Path
from dotenv import load_dotenv
from models.generated.proto.prophet_request import Message as ProphetRequest, MessageData as ProphetRequestData
from models.generated.proto.prophet_response import Message as ForecastResponse

async def main():
    # Load .env from core
    core_env_path = Path(__file__).resolve().parent.parent.parent / "core" / ".env"
    load_dotenv(core_env_path)

    RABBITMQ_USER = os.getenv("RABBITMQ_USER", "guest")
    RABBITMQ_PASS = os.getenv("RABBITMQ_PASS", "guest")
    RABBITMQ_HOST = os.getenv("RABBITMQ_HOST", "localhost")
    RABBITMQ_PORT = os.getenv("RABBITMQ_PORT", "5672")

    url = f"amqp://{RABBITMQ_USER}:{RABBITMQ_PASS}@{RABBITMQ_HOST}:{RABBITMQ_PORT}/%2f"
    
    try:
        connection = await aio_pika.connect_robust(url)
    except Exception as e:
        print(f"Failed to connect to RabbitMQ: {e}")
        return

    async with connection:
        channel = await connection.channel()
        
        # Create a temporary reply queue
        reply_queue = await channel.declare_queue(exclusive=True)
        
        # Create a message
        req = ProphetRequest()
        req.job_id = f"test-job-{uuid.uuid4()}"
        
        # Parameters
        req.parameters.periods = 5
        req.parameters.freq = "D"
        
        # Data
        d = ProphetRequestData()
        d.ds = "2025-01-01"
        d.y = 123.45
        req.data.append(d)

        message_body = bytes(req)
        correlation_id = str(uuid.uuid4())
        
        print(f"Sending request job_id: {req.job_id}")
        
        await channel.default_exchange.publish(
            aio_pika.Message(
                body=message_body,
                delivery_mode=aio_pika.DeliveryMode.PERSISTENT,
                reply_to=reply_queue.name,
                correlation_id=correlation_id
            ),
            routing_key="ProcessProphet"
        )
        
        print(f"Waiting for response on {reply_queue.name}...")
        
        async with reply_queue.iterator() as queue_iter:
            async for message in queue_iter:
                async with message.process():
                    if message.correlation_id == correlation_id:
                        resp = ForecastResponse().parse(message.body)
                        print(f"Received response for job_id: {resp.job_id}")
                        print(f"Status: {resp.status}")
                        print(f"Forecast points: {len(resp.forecast)}")
                        break
                    else:
                        print(f"Ignored message with unknown correlation_id: {message.correlation_id}")

if __name__ == "__main__":
    asyncio.run(main())

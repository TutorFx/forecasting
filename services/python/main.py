import pika

from fastapi import FastAPI

url = 'amqp://teste:password@localhost:5672/%2f'

# params = pika.URLParameters(url)
# connection = pika.BlockingConnection(params)
# channel = connection.channel()

# channel.queue_declare(queue='tasks', durable=True)

# channel.basic_consume(queue='tasks', on_message_callback=lambda ch, method, properties, body: print(f"Received message: {body}"))



app = FastAPI()

@app.get("/")
def read_root():
    return {"message": "Prophet Service Running"}

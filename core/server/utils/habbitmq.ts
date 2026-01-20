import type { ChannelModel } from 'amqplib'
import { connect } from 'amqplib'

let connection: ChannelModel | null = null

export async function getRabbitMQConnection() {
  const runtimeConfig = useRuntimeConfig()

  const {
    hostname,
    port,
    username,
    password
  } = runtimeConfig.rabbitmq

  if (!connection) {
    connection = await connect({
      hostname,
      port,
      username,
      password
    })
  }

  return connection
}

export async function createRabbitMQChannel(connection: Awaited<
  ReturnType<typeof getRabbitMQConnection>
>) {
  const channel = await connection.createChannel()

  await channel.assertQueue('tasks', { durable: true })

  return channel
}

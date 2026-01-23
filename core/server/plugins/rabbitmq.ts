import { prophetResponse } from '#project-schemas'

export default defineNitroPlugin(async (nitroApp) => {
  if (import.meta.prerender) {
    return
  }

  const connection = await getRabbitMQConnection()

  const channel = await createRabbitMQChannel(connection)

  connection.once('close', () => {
    console.log('RabbitMQ connection closed')
  })

  connection.on('error', (err) => {
    console.error('RabbitMQ connection error:', err)
  })

  await channel.assertQueue('ProphetResponse', { durable: true })

  channel.consume('ProphetResponse', (msg) => {
    if (msg) {
      try {
        const content = fromBuffer(prophetResponse, msg.content)
        console.log('Received Prophet Response:', JSON.stringify(content, null, 2))
        channel.ack(msg)
      } catch (e) {
        console.error('Error decoding message:', e)
        channel.nack(msg)
      }
    }
  })

  nitroApp.hooks.hook('close', async () => {
    await connection.close()
  })
})

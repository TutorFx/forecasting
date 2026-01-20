import { prophetRequest, prophetResponse } from '#project-schemas'

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

  channel.sendToQueue('ProcessProphet', toBuffer(prophetRequest, {
    job_id: '123e4567-e89b-12d3-a456-426614174000',
    parameters: {
      periods: 10,
      freq: 'D',
      holiday_country_code: 'BR'
    },
    data: [
      { ds: '2023-01-01', y: 100 },
      { ds: '2023-01-02', y: 110 },
      { ds: '2023-01-03', y: 105 },
      { ds: '2023-01-04', y: 120 },
      { ds: '2023-01-05', y: 130 },
      { ds: '2023-01-06', y: 140 },
      { ds: '2023-01-07', y: 135 },
      { ds: '2023-01-08', y: 145 },
      { ds: '2023-01-09', y: 155 },
      { ds: '2023-01-10', y: 160 },
      { ds: '2023-01-11', y: 165 },
      { ds: '2023-01-12', y: 170 },
      { ds: '2023-01-13', y: 175 },
      { ds: '2023-01-14', y: 180 },
      { ds: '2023-01-15', y: 185 }
    ]
  }), { persistent: true })

  nitroApp.hooks.hook('close', async () => {
    await connection.close()
  })
})

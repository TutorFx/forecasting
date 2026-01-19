import { prophetRequest } from '#project-schemas'

export default defineNitroPlugin(async (nitroApp) => {
  if (import.meta.prerender) {
    return
  }

  const connection = await getRabbitMQConnection()

  const channel = await createRabbitMQChannel()

  connection.once('close', () => {
    console.log('RabbitMQ connection closed')
  })

  connection.on('error', (err) => {
    console.error('RabbitMQ connection error:', err)
  })

  // channel.consume('tasks', ...) block removed as requested

  channel.sendToQueue('ProcessProphet', Buffer.from(toBuffer(prophetRequest, {
    job_id: '',
    parameters: {
      periods: 10,
      freq: 'D'
    },
    data: []
  })), { persistent: true })

  nitroApp.hooks.hook('close', async () => {
    await connection.close()
  })
})

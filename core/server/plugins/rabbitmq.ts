import { prophetResponse } from '#project-schemas'
import { useDrizzle, tables, eq } from '../utils/drizzle'

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

  channel.consume('ProphetResponse', async (msg) => {
    if (msg) {
      try {
        const content = fromBuffer(prophetResponse, msg.content)

        const db = useDrizzle()
        console.log(msg)

        await db.transaction(async (tx) => {
          const [job] = await tx.select()
            .from(tables.forecastJobs)
            .where(eq(tables.forecastJobs.jobId, content.job_id))
            .limit(1)

          if (!job) {
            console.error(`Job with ID ${content.job_id} not found in database.`)
            return
          }

          await tx.update(tables.forecastJobs)
            .set({
              status: content.status,
              mae: content.metrics?.mae ?? null,
              rmse: content.metrics?.rmse ?? null,
              mape: content.metrics?.mape ?? null,

              model: UNIVARIATE_MODELS.PROPHET
            })
            .where(eq(tables.forecastJobs.id, job.id))

          await tx.delete(tables.forecastItems)
            .where(eq(tables.forecastItems.jobId, job.id))

          if (content.status.toLowerCase() === 'success' && content.forecast?.length) {
            await tx.insert(tables.forecastItems)
              .values(content.forecast.map(item => ({
                jobId: job.id,
                ds: new Date(item.ds),
                yhat: item.yhat,
                yhatLower: item.yhat_lower,
                yhatUpper: item.yhat_upper,
                trend: item.trend,
                seasonal: item.seasonal ?? null,
                holidays: item.holidays ?? null
              })))
          }
        })

        channel.ack(msg)
      } catch (e) {
        console.error('Error decoding or saving message:', e)
        channel.nack(msg)
      }
    }
  })

  nitroApp.hooks.hook('close', async () => {
    await connection.close()
  })
})

import { prophetRequest } from '#project-schemas'
import { adaptMultiModel } from '../utils/adapters'

export default defineEventHandler(async () => {
  const connection = await getRabbitMQConnection()
  const channel = await createRabbitMQChannel(connection)

  const fs = await import('node:fs/promises')
  const path = await import('node:path')

  const filePath = path.resolve(process.cwd(), 'server/api/AMZN.csv')
  const fileContent = await fs.readFile(filePath, 'utf-8')

  const data = fileContent
    .trim()
    .split('\n')
    .slice(1) // Remove header
    .map((line) => {
      const [ds, y] = line.split(';')
      return { ds, y: parseFloat(y) }
    })

  const adaptedData = adaptMultiModel({
    job_id: '123e4567-e89b-12d3-a456-426614174000',
    parameters: {
      periods: 12,
      freq: 'M',
      holiday_country_code: 'US'
    },
    data
  }).toProphet()

  channel.sendToQueue('ProcessProphet', toBuffer(prophetRequest, adaptedData), { persistent: true })

  return {
    message: 'Message sent',
    dataLength: data.length,
    firstPoint: data[0],
    lastPoint: data[data.length - 1]
  }
})

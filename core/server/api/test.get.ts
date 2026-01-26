import { prophetRequest } from '#project-schemas'
import { adaptMultiModel } from '../utils/adapters'
import { tables, eq } from '../utils/drizzle'

export default defineEventHandler(async () => {
  const connection = await getRabbitMQConnection()
  const channel = await createRabbitMQChannel(connection)

  const db = useDrizzle()

  const fs = await import('node:fs/promises')
  const path = await import('node:path')

  const filePath = path.resolve(process.cwd(), 'server/api/AMZN.csv')
  const fileContent = await fs.readFile(filePath, 'utf-8')

  const csvData = fileContent
    .trim()
    .split('\n')
    .slice(1) // Remove header
    .map((line) => {
      const [ds, y] = line.split(';')
      return { ds: new Date(ds!), y: parseFloat(y!) }
    })

  const symbol = 'AMZN'
  const periods = 12
  const freq = 'M'
  const holidayCountryCode = 'US'

  let seriesId: string

  const existingSeries = await db.query.timeSeries.findFirst({
    where: eq(tables.timeSeries.symbol, symbol)
  })

  if (!existingSeries) {
    const [newSeries] = await db.insert(tables.timeSeries).values({
      symbol,
      interval: '1d'
    }).returning()
    seriesId = newSeries!.id
  } else {
    seriesId = existingSeries.id
  }

  await db.transaction(async (tx) => {
    await tx.delete(tables.timeSeriesData).where(eq(tables.timeSeriesData.seriesId, seriesId))

    await tx.insert(tables.timeSeriesData).values(
      csvData.map(item => ({
        seriesId,
        ds: item.ds,
        y: item.y
      }))
    )
  })

  const jobId = crypto.randomUUID()
  await db.insert(tables.forecastJobs).values({
    jobId,
    seriesId,
    status: 'pending',
    model: UNIVARIATE_MODELS.PROPHET
  })

  const adaptedData = adaptMultiModel({
    job_id: jobId,
    parameters: {
      periods,
      freq,
      holiday_country_code: holidayCountryCode
    },
    data: csvData.map(item => ({
      ...item,
      ds: item.ds.toISOString().split('T')[0]!
    }))
  }).toProphet()

  channel.sendToQueue('ProcessProphet', toBuffer(prophetRequest, adaptedData), { persistent: true })

  return {
    message: 'Series data updated and forecast job initiated',
    symbol,
    seriesId,
    jobId,
    dataLength: csvData.length
  }
})

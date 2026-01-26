import { prophetRequest } from '#project-schemas'
import type { Channel } from 'amqplib'

interface EngineInput<T> {
  input: T
  channel: Channel
}

export function univariatedEngine<T extends EngineInput<UnivariatedBaseInput>>(params: T): Promise<void> {
  if (params.input.name === UNIVARIATE_MODELS.PROPHET) {
    return prophet(params)
  }

  throw new Error(`Unsupported univariated model: ${params.input.name}`)
}

async function prophet(input: EngineInput<UnivariatedProphetInput>): Promise<void> {
  const db = useDrizzle()

  let seriesId: string

  const {
    symbol,
    periods,
    freq,
    holidayCountryCode,
    data
  } = input.input

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
      data.map(item => ({
        ...item,
        seriesId
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
    data: data.map((item) => {
      return {
        ...item,
        ds: item.ds.toISOString().split('T')[0]!
      }
    })
  }).toProphet()

  input.channel.sendToQueue('ProcessProphet',
    toBuffer(prophetRequest, adaptedData),
    { persistent: true }
  )
}

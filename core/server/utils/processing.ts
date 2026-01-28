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

/**
 * Busca ou cria uma série temporal baseada no símbolo
 */
async function getOrCreateTimeSeries(db: ReturnType<typeof useDrizzle>, symbol: string) {
  const existing = await db.query.timeSeries.findFirst({
    where: eq(tables.timeSeries.symbol, symbol)
  })

  if (existing) return existing.id

  const [newSeries] = await db.insert(tables.timeSeries)
    .values({ symbol, interval: '1d' })
    .returning()

  return newSeries!.id
}

/**
 * Atualiza os dados da série (deleta antigos e insere novos)
 */
async function refreshTimeSeriesData(
  db: ReturnType<typeof useDrizzle>,
  seriesId: string,
  data: Array<{ ds: Date, y: number }>
) {
  await db.transaction(async (tx) => {
    await tx.delete(tables.timeSeriesData)
      .where(eq(tables.timeSeriesData.seriesId, seriesId))

    if (data.length > 0) {
      await tx.insert(tables.timeSeriesData).values(
        data.map(item => ({ ...item, seriesId }))
      )
    }
  })
}

/**
 * Registra o início de um novo job de forecast
 */
async function createForecastJob(
  db: ReturnType<typeof useDrizzle>,
  payload: { jobId: string, seriesId: string, model: string }
) {
  await db.insert(tables.forecastJobs).values({
    jobId: payload.jobId,
    seriesId: payload.seriesId,
    status: 'pending',
    model: payload.model
  })
}

async function prophet(input: EngineInput<UnivariatedProphetInput>): Promise<void> {
  const db = useDrizzle()
  const { symbol, periods, freq, holidayCountryCode, data } = input.input

  const seriesId = await getOrCreateTimeSeries(db, symbol)

  await refreshTimeSeriesData(db, seriesId, data)

  const jobId = crypto.randomUUID()
  await createForecastJob(db, {
    jobId,
    seriesId,
    model: UNIVARIATE_MODELS.PROPHET
  })

  const adaptedData = adaptMultiModel({
    job_id: jobId,
    parameters: {
      periods,
      freq,
      holiday_country_code: holidayCountryCode
    },
    data: data.map(item => ({
      ...item,
      ds: item.ds.toISOString().split('T')[0]!
    }))
  }).toProphet()

  input.channel.sendToQueue(
    'ProcessProphet',
    toBuffer(prophetRequest, adaptedData),
    { persistent: true }
  )
}

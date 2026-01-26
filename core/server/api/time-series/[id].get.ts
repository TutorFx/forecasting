import { tables, eq } from '../../utils/drizzle'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing time series ID'
    })
  }

  const db = useDrizzle()

  const series = await db.query.timeSeries.findFirst({
    where: eq(tables.timeSeries.id, id),
    with: {
      observations: {
        orderBy: (observations, { asc }) => [asc(observations.ds)]
      },
      jobs: {
        with: {
          forecast: {
            orderBy: (forecast, { asc }) => [asc(forecast.ds)]
          }
        },
        orderBy: (jobs, { desc }) => [desc(jobs.createdAt)]
      }
    }
  })

  if (!series) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Time series not found'
    })
  }

  return series
})

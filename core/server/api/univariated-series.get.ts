import { z } from 'zod/v4'

export default defineEventHandler(async () => {
  const db = useDrizzle()
  return await db.select().from(tables.timeSeries)
})

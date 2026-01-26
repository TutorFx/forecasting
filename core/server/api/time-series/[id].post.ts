import { z } from 'zod/v4'

export default defineEventHandler(async (event) => {
  const body = readValidatedBody(event, GenericEngineInputSchema.parse)
})

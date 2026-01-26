import { z } from 'zod/v4'

export const TimeSeriesDataSchema = z.object({
  ds: z.date(),
  y: z.number()
})

export const UnivariatedBaseInputSchema = z.object({
  name: z.enum(UNIVARIATE_MODELS),

  symbol: z.string(),
  periods: z.number().int(),
  freq: z.string(),
  holidayCountryCode: z.string(),

  data: z.array(TimeSeriesDataSchema)
})

export const UnivariatedProphetInputSchema = UnivariatedBaseInputSchema.extend({
  name: z.literal(UNIVARIATE_MODELS.PROPHET)
})

export const GenericEngineInputSchema = z.discriminatedUnion('name', [
  UnivariatedProphetInputSchema
])

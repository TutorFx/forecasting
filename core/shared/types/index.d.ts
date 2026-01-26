import type { z } from 'zod/v4'

export type TimeSeriesData = z.infer<typeof TimeSeriesDataSchema>
export type UnivariatedBaseInput = z.infer<typeof UnivariatedBaseInputSchema>
export type UnivariatedProphetInput = z.infer<typeof UnivariatedProphetInputSchema>

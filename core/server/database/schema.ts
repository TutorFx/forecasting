import { pgTable, uuid, varchar, doublePrecision, timestamp, uniqueIndex } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

export const timeSeries = pgTable('time_series', {
  id: uuid('id').primaryKey().defaultRandom(),
  symbol: varchar('symbol', { length: 255 }).notNull(),
  interval: varchar('interval', { length: 50 }).notNull().default('1d'),
  createdAt: timestamp('created_at').defaultNow().notNull()
}, table => [
  uniqueIndex('symbol_interval_idx').on(table.symbol, table.interval)
])

export const timeSeriesData = pgTable('time_series_data', {
  id: uuid('id').primaryKey().defaultRandom(),
  seriesId: uuid('series_id').references(() => timeSeries.id, { onDelete: 'cascade' }).notNull(),
  ds: timestamp('ds').notNull(),
  y: doublePrecision('y').notNull()
})

export const forecastJobs = pgTable('forecast_jobs', {
  id: uuid('id').primaryKey().defaultRandom(),
  jobId: varchar('job_id', { length: 255 }).notNull().unique(),
  seriesId: uuid('series_id').references(() => timeSeries.id, { onDelete: 'set null' }),
  model: varchar('model', { length: 50 }).notNull(),
  status: varchar('status', { length: 50 }).notNull(),

  mae: doublePrecision('mae'),
  rmse: doublePrecision('rmse'),
  mape: doublePrecision('mape'),

  createdAt: timestamp('created_at').defaultNow().notNull()
})

export const forecastItems = pgTable('forecast_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  jobId: uuid('job_internal_id').references(() => forecastJobs.id, { onDelete: 'cascade' }),

  ds: timestamp('ds').notNull(),
  yhat: doublePrecision('yhat').notNull(),
  yhatLower: doublePrecision('yhat_lower').notNull(),
  yhatUpper: doublePrecision('yhat_upper').notNull(),
  trend: doublePrecision('trend').notNull(),

  seasonal: doublePrecision('seasonal'),
  holidays: doublePrecision('holidays')
})

export const timeSeriesRelations = relations(timeSeries, ({ many }) => ({
  observations: many(timeSeriesData),
  jobs: many(forecastJobs)
}))

export const timeSeriesDataRelations = relations(timeSeriesData, ({ one }) => ({
  series: one(timeSeries, {
    fields: [timeSeriesData.seriesId],
    references: [timeSeries.id]
  })
}))

export const forecastJobsRelations = relations(forecastJobs, ({ one, many }) => ({
  forecast: many(forecastItems),
  series: one(timeSeries, {
    fields: [forecastJobs.seriesId],
    references: [timeSeries.id]
  })
}))

export const forecastItemsRelations = relations(forecastItems, ({ one }) => ({
  job: one(forecastJobs, {
    fields: [forecastItems.jobId],
    references: [forecastJobs.id]
  })
}))

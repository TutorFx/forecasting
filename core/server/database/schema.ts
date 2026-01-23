import { pgTable, uuid, varchar, doublePrecision, timestamp, integer, text } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

export const forecastJobs = pgTable('forecast_jobs', {
  id: uuid('id').primaryKey().defaultRandom(),
  jobId: varchar('job_id', { length: 255 }).notNull().unique(),
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

export const forecastJobsRelations = relations(forecastJobs, ({ many }) => ({
  forecast: many(forecastItems)
}))

export const forecastItemsRelations = relations(forecastItems, ({ one }) => ({
  job: one(forecastJobs, {
    fields: [forecastItems.jobId],
    references: [forecastJobs.id]
  })
}))

export const forecastRequests = pgTable('forecast_requests', {
  jobId: uuid('job_id').primaryKey(),
  periods: integer('periods').notNull(),
  freq: varchar('freq', { length: 10 }).notNull(),
  holidayCountryCode: varchar('holiday_country_code', { length: 5 }),

  columns: text('columns').array(),

  createdAt: timestamp('created_at').defaultNow().notNull()
})

export const forecastRequestData = pgTable('forecast_request_data', {
  id: uuid('id').primaryKey().defaultRandom(),
  jobId: uuid('job_id').references(() => forecastRequests.jobId, { onDelete: 'cascade' }).notNull(),

  ds: timestamp('ds').notNull(),
  y: doublePrecision('y').notNull()
})

export const forecastRequestsRelations = relations(forecastRequests, ({ many }) => ({
  observations: many(forecastRequestData)
}))

export const forecastRequestDataRelations = relations(forecastRequestData, ({ one }) => ({
  request: one(forecastRequests, {
    fields: [forecastRequestData.jobId],
    references: [forecastRequests.jobId]
  })
}))

DROP INDEX "symbol_idx";--> statement-breakpoint
ALTER TABLE "time_series" ALTER COLUMN "interval" SET DEFAULT '1d';--> statement-breakpoint
ALTER TABLE "time_series" ALTER COLUMN "interval" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "forecast_jobs" ADD COLUMN "model" varchar(50) DEFAULT 'pf' NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "symbol_interval_idx" ON "time_series" USING btree ("symbol","interval");
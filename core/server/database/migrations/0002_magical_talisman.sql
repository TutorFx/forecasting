ALTER TABLE "time_series" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "time_series_data" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "time_series" CASCADE;--> statement-breakpoint
DROP TABLE "time_series_data" CASCADE;--> statement-breakpoint
ALTER TABLE "forecast_requests" DROP CONSTRAINT "forecast_requests_series_id_time_series_id_fk";
--> statement-breakpoint
ALTER TABLE "forecast_requests" DROP COLUMN "series_id";--> statement-breakpoint
ALTER TABLE "forecast_requests" DROP COLUMN "columns";
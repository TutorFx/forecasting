CREATE TABLE "time_series" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"symbol" varchar(255) NOT NULL,
	"interval" varchar(50),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "time_series_data" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"series_id" uuid NOT NULL,
	"ds" timestamp NOT NULL,
	"y" double precision NOT NULL
);
--> statement-breakpoint
ALTER TABLE "forecast_request_data" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "forecast_requests" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "forecast_request_data" CASCADE;--> statement-breakpoint
DROP TABLE "forecast_requests" CASCADE;--> statement-breakpoint
ALTER TABLE "forecast_jobs" ADD COLUMN "series_id" uuid;--> statement-breakpoint
ALTER TABLE "time_series_data" ADD CONSTRAINT "time_series_data_series_id_time_series_id_fk" FOREIGN KEY ("series_id") REFERENCES "public"."time_series"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "symbol_idx" ON "time_series" USING btree ("symbol");--> statement-breakpoint
ALTER TABLE "forecast_jobs" ADD CONSTRAINT "forecast_jobs_series_id_time_series_id_fk" FOREIGN KEY ("series_id") REFERENCES "public"."time_series"("id") ON DELETE set null ON UPDATE no action;
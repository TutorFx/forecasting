CREATE TABLE "forecast_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_internal_id" uuid,
	"ds" timestamp NOT NULL,
	"yhat" double precision NOT NULL,
	"yhat_lower" double precision NOT NULL,
	"yhat_upper" double precision NOT NULL,
	"trend" double precision NOT NULL,
	"seasonal" double precision,
	"holidays" double precision
);
--> statement-breakpoint
CREATE TABLE "forecast_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_id" varchar(255) NOT NULL,
	"status" varchar(50) NOT NULL,
	"mae" double precision,
	"rmse" double precision,
	"mape" double precision,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "forecast_jobs_job_id_unique" UNIQUE("job_id")
);
--> statement-breakpoint
CREATE TABLE "forecast_request_data" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_id" uuid NOT NULL,
	"ds" timestamp NOT NULL,
	"y" double precision NOT NULL
);
--> statement-breakpoint
CREATE TABLE "forecast_requests" (
	"job_id" uuid PRIMARY KEY NOT NULL,
	"periods" integer NOT NULL,
	"freq" varchar(10) NOT NULL,
	"holiday_country_code" varchar(5),
	"columns" text[],
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "forecast_items" ADD CONSTRAINT "forecast_items_job_internal_id_forecast_jobs_id_fk" FOREIGN KEY ("job_internal_id") REFERENCES "public"."forecast_jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forecast_request_data" ADD CONSTRAINT "forecast_request_data_job_id_forecast_requests_job_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."forecast_requests"("job_id") ON DELETE cascade ON UPDATE no action;
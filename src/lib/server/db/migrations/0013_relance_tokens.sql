ALTER TABLE "form_token" ADD COLUMN "last_relance_at" timestamp;--> statement-breakpoint
ALTER TABLE "form_token" ADD COLUMN "relance_count" integer DEFAULT 0 NOT NULL;
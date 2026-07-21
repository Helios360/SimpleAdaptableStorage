CREATE TABLE "promo" (
	"id" serial PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	"year" integer,
	"formation_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "promo_label_unique" UNIQUE("label")
);
--> statement-breakpoint
ALTER TABLE "promo" ADD CONSTRAINT "promo_formation_id_formation_id_fk" FOREIGN KEY ("formation_id") REFERENCES "public"."formation"("id") ON DELETE set null ON UPDATE no action;
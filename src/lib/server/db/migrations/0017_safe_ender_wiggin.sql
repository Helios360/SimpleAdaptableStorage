ALTER TABLE "placement" ADD COLUMN "promo_id" integer;--> statement-breakpoint
ALTER TABLE "placement" ADD CONSTRAINT "placement_promo_id_promo_id_fk" FOREIGN KEY ("promo_id") REFERENCES "public"."promo"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
-- Rattachement des placements existants : le formulaire de passation ne proposait
-- déjà que des libellés du référentiel, la correspondance est donc exacte.
UPDATE "placement" SET "promo_id" = "promo"."id" FROM "promo" WHERE "placement"."promo_id" IS NULL AND "placement"."promo" = "promo"."label";
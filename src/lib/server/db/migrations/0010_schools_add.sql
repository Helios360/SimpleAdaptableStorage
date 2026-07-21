CREATE TABLE "school" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"type" text DEFAULT 'autre' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "school_name_unique" UNIQUE("name")
);
--> statement-breakpoint
DROP INDEX "envoi_school_idx";--> statement-breakpoint
ALTER TABLE "envoi" ADD COLUMN "school_id" integer;--> statement-breakpoint
ALTER TABLE "formation" ADD COLUMN "school_id" integer;--> statement-breakpoint
ALTER TABLE "offre" ADD COLUMN "school_id" integer;--> statement-breakpoint
ALTER TABLE "promo" ADD COLUMN "school_id" integer;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "school_id" integer;--> statement-breakpoint
ALTER TABLE "envoi" ADD CONSTRAINT "envoi_school_id_school_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."school"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "formation" ADD CONSTRAINT "formation_school_id_school_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."school"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offre" ADD CONSTRAINT "offre_school_id_school_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."school"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promo" ADD CONSTRAINT "promo_school_id_school_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."school"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_school_id_school_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."school"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "envoi_school_idx" ON "envoi" USING btree ("school_id");--> statement-breakpoint
-- Data migration : matérialise le référentiel « school » à partir des anciens
-- libellés libres, puis rattache les lignes (avant que 0011 ne supprime les
-- colonnes texte). Le type est dérivé du nom (même logique que schoolType()).
INSERT INTO "school" ("name", "type")
SELECT DISTINCT s.name,
	CASE
		WHEN lower(s.name) LIKE '%skalys%' THEN 'skalys'
		WHEN lower(s.name) LIKE '%cloud%' THEN 'cloud_campus'
		ELSE 'autre'
	END
FROM (
	SELECT "school" AS name FROM "user" WHERE "school" IS NOT NULL AND "school" <> ''
	UNION SELECT "school" FROM "offre" WHERE "school" IS NOT NULL AND "school" <> ''
	UNION SELECT "school" FROM "envoi" WHERE "school" IS NOT NULL AND "school" <> ''
) s
ON CONFLICT ("name") DO NOTHING;--> statement-breakpoint
-- Écoles de référence toujours disponibles.
INSERT INTO "school" ("name", "type") VALUES
	('Cloud Campus', 'cloud_campus'),
	('Skalys', 'skalys')
ON CONFLICT ("name") DO NOTHING;--> statement-breakpoint
UPDATE "user" u SET "school_id" = sc.id FROM "school" sc WHERE u."school" = sc."name";--> statement-breakpoint
UPDATE "offre" o SET "school_id" = sc.id FROM "school" sc WHERE o."school" = sc."name";--> statement-breakpoint
UPDATE "envoi" e SET "school_id" = sc.id FROM "school" sc WHERE e."school" = sc."name";
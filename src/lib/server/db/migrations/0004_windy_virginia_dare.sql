CREATE TABLE "envoi" (
	"id" serial PRIMARY KEY NOT NULL,
	"entreprise" text NOT NULL,
	"contact" text,
	"email" text NOT NULL,
	"message" text,
	"opens" integer DEFAULT 0 NOT NULL,
	"statut" text DEFAULT 'envoye' NOT NULL,
	"school" text,
	"cre_id" text,
	"last_open_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "envoi_etudiant" (
	"envoi_id" integer NOT NULL,
	"candidat_id" integer NOT NULL,
	CONSTRAINT "envoi_etudiant_envoi_id_candidat_id_pk" PRIMARY KEY("envoi_id","candidat_id")
);
--> statement-breakpoint
CREATE TABLE "evenement" (
	"id" serial PRIMARY KEY NOT NULL,
	"titre" text NOT NULL,
	"type" text,
	"date" text NOT NULL,
	"description" text,
	"online" boolean DEFAULT false NOT NULL,
	"school" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "cv" ADD COLUMN "tag" text;--> statement-breakpoint
ALTER TABLE "cv" ADD COLUMN "active" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "offre" ADD COLUMN "niveau" text;--> statement-breakpoint
ALTER TABLE "offre" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "offre" ADD COLUMN "skills" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "offre" ADD COLUMN "active" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "offre" ADD COLUMN "school" text;--> statement-breakpoint
ALTER TABLE "offre" ADD COLUMN "cre_id" text;--> statement-breakpoint
ALTER TABLE "envoi" ADD CONSTRAINT "envoi_cre_id_user_id_fk" FOREIGN KEY ("cre_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "envoi_etudiant" ADD CONSTRAINT "envoi_etudiant_envoi_id_envoi_id_fk" FOREIGN KEY ("envoi_id") REFERENCES "public"."envoi"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "envoi_etudiant" ADD CONSTRAINT "envoi_etudiant_candidat_id_candidat_id_fk" FOREIGN KEY ("candidat_id") REFERENCES "public"."candidat"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "envoi_cre_idx" ON "envoi" USING btree ("cre_id");--> statement-breakpoint
CREATE INDEX "envoi_school_idx" ON "envoi" USING btree ("school");--> statement-breakpoint
CREATE INDEX "evenement_school_idx" ON "evenement" USING btree ("school");--> statement-breakpoint
ALTER TABLE "offre" ADD CONSTRAINT "offre_cre_id_user_id_fk" FOREIGN KEY ("cre_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
CREATE TABLE "form_token" (
	"token" text PRIMARY KEY NOT NULL,
	"placement_id" integer NOT NULL,
	"audience" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"submitted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "placement" (
	"id" serial PRIMARY KEY NOT NULL,
	"candidat_id" integer NOT NULL,
	"commercial_id" text,
	"suivi_par" text,
	"promo" text,
	"source" text,
	"date_placement" date,
	"entreprise" text,
	"contact_nom" text,
	"contact_prenom" text,
	"contact_tel" text,
	"contact_email" text,
	"type_contrat" text,
	"statut_opco" text DEFAULT 'en_attente' NOT NULL,
	"prise_en_charge" date,
	"date_rupture" date,
	"commentaires" text,
	"facture_emise" boolean DEFAULT false NOT NULL,
	"facture_date" date,
	"facture_numero" text,
	"facture_payee" boolean DEFAULT false NOT NULL,
	"statut" text DEFAULT 'brouillon' NOT NULL,
	"fiche_entreprise" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DROP TABLE "envoi_etudiant" CASCADE;--> statement-breakpoint
DROP TABLE "evenement" CASCADE;--> statement-breakpoint
ALTER TABLE "candidat" ADD COLUMN "fiche_infos" jsonb;--> statement-breakpoint
ALTER TABLE "candidat" ADD COLUMN "checklist" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "form_token" ADD CONSTRAINT "form_token_placement_id_placement_id_fk" FOREIGN KEY ("placement_id") REFERENCES "public"."placement"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "placement" ADD CONSTRAINT "placement_candidat_id_candidat_id_fk" FOREIGN KEY ("candidat_id") REFERENCES "public"."candidat"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "placement" ADD CONSTRAINT "placement_commercial_id_user_id_fk" FOREIGN KEY ("commercial_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "form_token_placement_idx" ON "form_token" USING btree ("placement_id");--> statement-breakpoint
CREATE INDEX "placement_candidat_idx" ON "placement" USING btree ("candidat_id");--> statement-breakpoint
CREATE INDEX "placement_commercial_idx" ON "placement" USING btree ("commercial_id");
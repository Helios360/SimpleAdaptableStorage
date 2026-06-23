CREATE TABLE "competence" (
	"id" serial PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "competence_label_unique" UNIQUE("label")
);
--> statement-breakpoint
CREATE TABLE "formation_competence" (
	"formation_id" integer NOT NULL,
	"competence_id" integer NOT NULL,
	CONSTRAINT "formation_competence_formation_id_competence_id_pk" PRIMARY KEY("formation_id","competence_id")
);
--> statement-breakpoint
ALTER TABLE "formation_competence" ADD CONSTRAINT "formation_competence_formation_id_formation_id_fk" FOREIGN KEY ("formation_id") REFERENCES "public"."formation"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "formation_competence" ADD CONSTRAINT "formation_competence_competence_id_competence_id_fk" FOREIGN KEY ("competence_id") REFERENCES "public"."competence"("id") ON DELETE cascade ON UPDATE no action;
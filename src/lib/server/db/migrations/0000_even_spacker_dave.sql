CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "candidat" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"lname" text NOT NULL,
	"fname" text NOT NULL,
	"tel" text,
	"birth" date,
	"addr" text,
	"city" text DEFAULT '' NOT NULL,
	"postal" text,
	"lon" double precision,
	"lat" double precision,
	"formation_id" integer,
	"year" integer,
	"cv_path" text,
	"id_doc_path" text,
	"id_doc_verso_path" text,
	"titre_valide" date,
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"skills" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"permis" boolean DEFAULT false NOT NULL,
	"vehicule" boolean DEFAULT false NOT NULL,
	"mobile" boolean DEFAULT false NOT NULL,
	"score" integer,
	"tosa" integer,
	"pitch" boolean DEFAULT false NOT NULL,
	"statut" text DEFAULT 'en_attente' NOT NULL,
	"recherche_statut" text DEFAULT 'recherche' NOT NULL,
	"consent" boolean DEFAULT false NOT NULL,
	"consented_at" timestamp,
	"terms_version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "candidat_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "candidature" (
	"id" serial PRIMARY KEY NOT NULL,
	"candidat_id" integer NOT NULL,
	"offre_id" integer NOT NULL,
	"statut" text DEFAULT 'envoyee' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cv" (
	"id" serial PRIMARY KEY NOT NULL,
	"candidat_id" integer NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "formation" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "formation_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "offre" (
	"id" serial PRIMARY KEY NOT NULL,
	"titre" text NOT NULL,
	"entreprise" text NOT NULL,
	"lieu" text NOT NULL,
	"type" text NOT NULL,
	"date" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "retenu" (
	"recruteur_id" text NOT NULL,
	"candidat_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "retenu_recruteur_id_candidat_id_pk" PRIMARY KEY("recruteur_id","candidat_id")
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "staff_formation" (
	"user_id" text NOT NULL,
	"formation_id" integer NOT NULL,
	CONSTRAINT "staff_formation_user_id_formation_id_pk" PRIMARY KEY("user_id","formation_id")
);
--> statement-breakpoint
CREATE TABLE "test" (
	"id" serial PRIMARY KEY NOT NULL,
	"question" text NOT NULL,
	"answer" text NOT NULL,
	"type" smallint NOT NULL,
	"difficulty" smallint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "test_attempt" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"test_id" integer NOT NULL,
	"response" text,
	"score" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"role" text DEFAULT 'candidat' NOT NULL,
	"avatar" text,
	"school" text,
	"company" text,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "candidat" ADD CONSTRAINT "candidat_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "candidat" ADD CONSTRAINT "candidat_formation_id_formation_id_fk" FOREIGN KEY ("formation_id") REFERENCES "public"."formation"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "candidature" ADD CONSTRAINT "candidature_candidat_id_candidat_id_fk" FOREIGN KEY ("candidat_id") REFERENCES "public"."candidat"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "candidature" ADD CONSTRAINT "candidature_offre_id_offre_id_fk" FOREIGN KEY ("offre_id") REFERENCES "public"."offre"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cv" ADD CONSTRAINT "cv_candidat_id_candidat_id_fk" FOREIGN KEY ("candidat_id") REFERENCES "public"."candidat"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "retenu" ADD CONSTRAINT "retenu_recruteur_id_user_id_fk" FOREIGN KEY ("recruteur_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "retenu" ADD CONSTRAINT "retenu_candidat_id_candidat_id_fk" FOREIGN KEY ("candidat_id") REFERENCES "public"."candidat"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_formation" ADD CONSTRAINT "staff_formation_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_formation" ADD CONSTRAINT "staff_formation_formation_id_formation_id_fk" FOREIGN KEY ("formation_id") REFERENCES "public"."formation"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_attempt" ADD CONSTRAINT "test_attempt_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_attempt" ADD CONSTRAINT "test_attempt_test_id_test_id_fk" FOREIGN KEY ("test_id") REFERENCES "public"."test"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "candidat_city_idx" ON "candidat" USING btree ("city");--> statement-breakpoint
CREATE INDEX "candidat_statut_idx" ON "candidat" USING btree ("statut");--> statement-breakpoint
CREATE INDEX "candidat_recherche_statut_idx" ON "candidat" USING btree ("recherche_statut");--> statement-breakpoint
CREATE INDEX "candidat_formation_idx" ON "candidat" USING btree ("formation_id");--> statement-breakpoint
CREATE INDEX "test_attempt_user_idx" ON "test_attempt" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "test_attempt_test_idx" ON "test_attempt" USING btree ("test_id");--> statement-breakpoint
CREATE INDEX "test_attempt_user_test_creation_idx" ON "test_attempt" USING btree ("user_id","test_id","created_at");
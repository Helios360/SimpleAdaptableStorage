CREATE TYPE "public"."user_status" AS ENUM('active', 'recherche', 'entreprise', 'archive');CREATE TABLE "task" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"priority" integer DEFAULT 1 NOT NULL
);
CREATE TABLE "formations" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" varchar(50) NOT NULL,
	"name" varchar(100) NOT NULL,
	CONSTRAINT "formations_code_unique" UNIQUE("code")
);
CREATE TABLE "staff_settings" (
	"staff_user_id" integer NOT NULL,
	"formation_id" integer NOT NULL,
	CONSTRAINT "staff_settings_staff_user_id_formation_id_pk" PRIMARY KEY("staff_user_id","formation_id")
);
CREATE TABLE "test_attempts" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"test_id" integer NOT NULL,
	"response" text,
	"score" integer,
	"creation" timestamp DEFAULT now() NOT NULL
);
CREATE TABLE "tests" (
	"id" serial PRIMARY KEY NOT NULL,
	"question" varchar(200) NOT NULL,
	"answer" varchar(1000) NOT NULL,
	"type" integer NOT NULL,
	"difficulty" integer NOT NULL
);
CREATE TABLE "user_auth" (
	"user_id" integer PRIMARY KEY NOT NULL,
	"password_hash" varchar(255) NOT NULL,
	"email_verified_at" timestamp,
	"email_verify_token" varchar(254),
	"email_verify_expires" timestamp,
	"reset_password_token" varchar(64),
	"reset_password_expires" timestamp,
	"last_login_at" timestamp,
	"failed_login_count" integer DEFAULT 0 NOT NULL,
	"locked_until" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"last_name" varchar(64) NOT NULL,
	"first_name" varchar(64) NOT NULL,
	"email" varchar(255) NOT NULL,
	"tel" varchar(32) NOT NULL,
	"addr" text,
	"city" varchar(64) NOT NULL,
	"postal" varchar(16),
	"lon" numeric(10, 7),
	"lat" numeric(10, 7),
	"birth" date NOT NULL,
	"cv" varchar(254),
	"id_doc" varchar(254),
	"id_doc_verso" varchar(254),
	"titre_valide" date,
	"tags" jsonb,
	"skills" jsonb,
	"permis" boolean DEFAULT false NOT NULL,
	"vehicule" boolean DEFAULT false NOT NULL,
	"mobile" boolean DEFAULT false NOT NULL,
	"consent" boolean DEFAULT false NOT NULL,
	"consented_at" timestamp,
	"terms_version" integer DEFAULT 1 NOT NULL,
	"status" "user_status" DEFAULT 'recherche' NOT NULL,
	"formation_id" integer NOT NULL,
	"is_admin" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
ALTER TABLE "staff_settings" ADD CONSTRAINT "staff_settings_staff_user_id_users_id_fk" FOREIGN KEY ("staff_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;ALTER TABLE "staff_settings" ADD CONSTRAINT "staff_settings_formation_id_formations_id_fk" FOREIGN KEY ("formation_id") REFERENCES "public"."formations"("id") ON DELETE cascade ON UPDATE no action;ALTER TABLE "test_attempts" ADD CONSTRAINT "test_attempts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;ALTER TABLE "test_attempts" ADD CONSTRAINT "test_attempts_test_id_tests_id_fk" FOREIGN KEY ("test_id") REFERENCES "public"."tests"("id") ON DELETE cascade ON UPDATE no action;ALTER TABLE "user_auth" ADD CONSTRAINT "user_auth_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;ALTER TABLE "users" ADD CONSTRAINT "users_formation_id_formations_id_fk" FOREIGN KEY ("formation_id") REFERENCES "public"."formations"("id") ON DELETE restrict ON UPDATE no action;CREATE INDEX "staff_settings_formation_id_idx" ON "staff_settings" USING btree ("formation_id");CREATE INDEX "test_attempts_user_id_idx" ON "test_attempts" USING btree ("user_id");CREATE INDEX "test_attempts_test_id_idx" ON "test_attempts" USING btree ("test_id");CREATE INDEX "test_attempts_user_test_creation_idx" ON "test_attempts" USING btree ("user_id","test_id","creation");CREATE UNIQUE INDEX "user_auth_email_verify_token_unique" ON "user_auth" USING btree ("email_verify_token");CREATE UNIQUE INDEX "user_auth_reset_password_token_unique" ON "user_auth" USING btree ("reset_password_token");CREATE UNIQUE INDEX "users_email_unique" ON "users" USING btree ("email");CREATE INDEX "users_formation_id_idx" ON "users" USING btree ("formation_id");
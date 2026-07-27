ALTER TABLE "candidat" ADD COLUMN "note" text;--> statement-breakpoint
ALTER TABLE "candidat" ADD COLUMN "note_author_id" text;--> statement-breakpoint
ALTER TABLE "candidat" ADD COLUMN "note_updated_at" timestamp;--> statement-breakpoint
ALTER TABLE "candidat" ADD CONSTRAINT "candidat_note_author_id_user_id_fk" FOREIGN KEY ("note_author_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
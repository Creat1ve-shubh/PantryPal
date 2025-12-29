ALTER TABLE "organizations" ADD COLUMN "gst_number" text;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "owner_name" text;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "owner_phone" text;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "owner_email" text;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "msme_number" text;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "business_address" text;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "business_city" text;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "business_state" text;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "business_pin" text;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "kyc_status" text DEFAULT 'pending';--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "verified_at" timestamp;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "verified_by" integer;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "verification_notes" text;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "payment_status" text DEFAULT 'pending';--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "subscription_id" text;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "plan_name" text DEFAULT 'starter';--> statement-breakpoint
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_verified_by_users_id_fk" FOREIGN KEY ("verified_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
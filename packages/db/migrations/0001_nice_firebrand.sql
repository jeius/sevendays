CREATE TABLE "frames" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"service_package_id" uuid NOT NULL,
	"frame_number" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "frames_pair_unique" UNIQUE("service_package_id","frame_number")
);
--> statement-breakpoint
CREATE TABLE "package_inclusion_attires" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"inclusion_id" uuid NOT NULL,
	"attire_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "package_inclusion_attires_pair_unique" UNIQUE("inclusion_id","attire_id")
);
--> statement-breakpoint
ALTER TABLE "package_inclusions" DROP CONSTRAINT "package_inclusions_attire_id_attires_id_fk";
--> statement-breakpoint
DROP INDEX "package_inclusions_attire_id_idx";--> statement-breakpoint
ALTER TABLE "package_inclusions" ADD COLUMN "frame_id" uuid;--> statement-breakpoint
ALTER TABLE "frames" ADD CONSTRAINT "frames_service_package_id_service_packages_id_fk" FOREIGN KEY ("service_package_id") REFERENCES "public"."service_packages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "package_inclusion_attires" ADD CONSTRAINT "package_inclusion_attires_inclusion_id_package_inclusions_id_fk" FOREIGN KEY ("inclusion_id") REFERENCES "public"."package_inclusions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "package_inclusion_attires" ADD CONSTRAINT "package_inclusion_attires_attire_id_attires_id_fk" FOREIGN KEY ("attire_id") REFERENCES "public"."attires"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "frames_service_package_id_idx" ON "frames" USING btree ("service_package_id");--> statement-breakpoint
CREATE INDEX "package_inclusion_attires_attire_id_idx" ON "package_inclusion_attires" USING btree ("attire_id");--> statement-breakpoint
ALTER TABLE "package_inclusions" ADD CONSTRAINT "package_inclusions_frame_id_frames_id_fk" FOREIGN KEY ("frame_id") REFERENCES "public"."frames"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "package_inclusions_frame_id_idx" ON "package_inclusions" USING btree ("frame_id");--> statement-breakpoint
ALTER TABLE "package_inclusions" DROP COLUMN "attire_id";
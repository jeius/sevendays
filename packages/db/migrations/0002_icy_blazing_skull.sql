CREATE TABLE "branch_studio_services" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"branch_id" uuid NOT NULL,
	"studio_service_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "branch_studio_services_pair_unique" UNIQUE("studio_service_id","branch_id")
);
--> statement-breakpoint
CREATE TABLE "studio_service_addon_services" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"studio_service_id" uuid NOT NULL,
	"addon_service_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "studio_service_addon_services_pair_unique" UNIQUE("studio_service_id","addon_service_id")
);
--> statement-breakpoint
CREATE TABLE "studio_services" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"price_cents" integer NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "studio_services_name_unique" UNIQUE("name")
);
--> statement-breakpoint
ALTER TABLE "service_packages" ADD COLUMN "slug" text;--> statement-breakpoint
ALTER TABLE "service_packages" ADD COLUMN "is_featured" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "branch_studio_services" ADD CONSTRAINT "branch_studio_services_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branch_studio_services" ADD CONSTRAINT "branch_studio_services_studio_service_id_studio_services_id_fk" FOREIGN KEY ("studio_service_id") REFERENCES "public"."studio_services"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "studio_service_addon_services" ADD CONSTRAINT "studio_service_addon_services_studio_service_id_studio_services_id_fk" FOREIGN KEY ("studio_service_id") REFERENCES "public"."studio_services"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "studio_service_addon_services" ADD CONSTRAINT "studio_service_addon_services_addon_service_id_addon_services_id_fk" FOREIGN KEY ("addon_service_id") REFERENCES "public"."addon_services"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "branch_studio_services_branch_id_idx" ON "branch_studio_services" USING btree ("branch_id");--> statement-breakpoint
CREATE INDEX "studio_service_addon_services_addon_service_id_idx" ON "studio_service_addon_services" USING btree ("addon_service_id");--> statement-breakpoint
ALTER TABLE "service_packages" ADD CONSTRAINT "service_packages_slug_unique" UNIQUE("slug");
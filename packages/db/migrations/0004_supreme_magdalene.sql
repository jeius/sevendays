ALTER TABLE "appointments" RENAME COLUMN "package_price_cents" TO "booked_price_cents";--> statement-breakpoint
ALTER TABLE "appointments" ALTER COLUMN "service_package_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN "studio_service_id" uuid;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_studio_service_id_studio_services_id_fk" FOREIGN KEY ("studio_service_id") REFERENCES "public"."studio_services"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_offering_exactly_one" CHECK (
      (appointments.service_package_id is null) <> (appointments.studio_service_id is null)
    );
ALTER TABLE "addon_services" ALTER COLUMN "price_cents" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "appointment_addon_services" ALTER COLUMN "price_cents" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "appointments" ALTER COLUMN "booked_price_cents" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "service_packages" ALTER COLUMN "price_cents" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "studio_services" ALTER COLUMN "price_cents" DROP NOT NULL;
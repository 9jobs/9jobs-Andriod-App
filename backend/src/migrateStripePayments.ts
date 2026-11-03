import "./lib/env";
import "dotenv/config";
import { migrateStripePaymentStore } from "./services/stripePaymentStore";
migrateStripePaymentStore().then(() => console.log("Stripe payment storage ready")).catch(() => {
  console.error("Stripe payment storage migration failed; verify DATABASE_URL and database access");
  process.exitCode = 1;
});

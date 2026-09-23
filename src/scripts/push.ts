// scripts/push-schema.ts
import { execSync } from "node:child_process";
import console from "node:console";

console.log("📐 Pushing Drizzle schema to Postgres...");

try {
	execSync("bun drizzle-kit push --force", {
		stdio: "inherit",
		env: process.env
	});
	console.log("✅ Schema pushed");
} catch (error) {
	console.error(error);
	console.error("❌ drizzle-kit push failed");
	process.exit(1);
}

import { DEMO_MEETINGS } from "./seed-data.js";
import atlas from "./agent.js";

/**
 * Seeds Atlas with demo meeting data
 * Run this once to populate the database for demo purposes
 */
export async function seedDemoData() {
  console.log("🌱 Seeding Atlas with demo data...");

  for (const meeting of DEMO_MEETINGS) {
    try {
      const result = await atlas(
        `atlas_ingest_meeting ${JSON.stringify({
          title: meeting.title,
          date_iso: meeting.date_iso,
          transcript: meeting.transcript,
        })}`
      );
      console.log(`✅ Seeded: ${meeting.title}`);
    } catch (error) {
      console.error(`❌ Failed to seed ${meeting.title}:`, error);
    }
  }

  console.log("🎉 Demo data seeding complete!");
}

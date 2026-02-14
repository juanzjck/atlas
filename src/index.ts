import { env } from "@blaxel/core";
import "@blaxel/telemetry";
import Fastify from "fastify";
import fastifyStatic from "@fastify/static";
import path from "path";
import { fileURLToPath } from "url";
import agent from "./agent.js";
import { seedDemoData } from "./seed.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface RequestBody {
  inputs: string;
}

async function main() {
  console.info("🚀 Booting up Atlas...");
  const app = Fastify({
    logger: false,
  });

  // Security Headers
  app.addHook("onRequest", async (request, reply) => {
    reply.header("X-Content-Type-Options", "nosniff");
    reply.header("X-Frame-Options", "DENY");
    reply.header("X-XSS-Protection", "1; mode=block");
    reply.header("Referrer-Policy", "strict-origin-when-cross-origin");
    reply.header(
      "Content-Security-Policy",
      "default-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; script-src 'self' 'unsafe-inline'; img-src 'self' data: https:;"
    );
  });

  // CORS for local development
  app.addHook("onRequest", async (request, reply) => {
    reply.header("Access-Control-Allow-Origin", "*");
    reply.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    reply.header("Access-Control-Allow-Headers", "Content-Type");
  });

  app.addHook("onResponse", async (request, reply) => {
    console.info(`${request.method} ${request.url} ${reply.statusCode} ${Math.round(reply.elapsedTime)}ms`);
  });

  app.addHook("onError", async (request, reply, error) => {
    console.error(error);
  });

  // Serve static files from public directory
  const publicPath = path.join(__dirname, "..", "public");
  app.register(fastifyStatic, {
    root: publicPath,
    prefix: "/",
  });

  // API endpoint for Atlas agent
  app.post<{ Body: RequestBody }>("/api/atlas", async (request, reply) => {
    try {
      // Input validation
      if (!request.body || !request.body.inputs) {
        return reply.status(400).send({ error: "Missing inputs field" });
      }

      const inputs = String(request.body.inputs).slice(0, 10000); // Limit input size

      const response = await agent(inputs);
      return reply.send(response);
    } catch (error: any) {
      console.error(error);
      return reply.status(500).send({ error: "Internal server error", message: error.message });
    }
  });

  // Legacy endpoint (for backward compatibility)
  app.post<{ Body: RequestBody }>("/", async (request, reply) => {
    try {
      if (!request.body || !request.body.inputs) {
        return reply.status(400).send({ error: "Missing inputs field" });
      }

      const inputs = String(request.body.inputs).slice(0, 10000);
      const response = await agent(inputs);
      return reply.send(response);
    } catch (error: any) {
      console.error(error);
      return reply.status(500).send(error.stack);
    }
  });

  // Seed demo data endpoint
  app.post("/api/seed", async (request, reply) => {
    try {
      await seedDemoData();
      return reply.send({ success: true, message: "Demo data seeded successfully" });
    } catch (error: any) {
      console.error(error);
      return reply.status(500).send({ error: "Failed to seed demo data", message: error.message });
    }
  });

  // Health check endpoint
  app.get("/api/health", async (request, reply) => {
    return reply.send({ status: "healthy", timestamp: new Date().toISOString() });
  });

  const port = parseInt(env.PORT || "8080");
  const host = env.HOST || "0.0.0.0";

  try {
    await app.listen({ port, host });
    console.info(`✅ Atlas is running on http://${host}:${port}`);
    console.info(`📝 Web interface: http://localhost:${port}`);
    console.info(`🔌 API endpoint: http://localhost:${port}/api/atlas`);
    
    // Auto-seed demo data on first run
    console.info("🌱 Checking for demo data...");
    try {
      await seedDemoData();
    } catch (err) {
      console.warn("Demo data may already exist or seeding failed:", err);
    }
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

main().catch(console.error);

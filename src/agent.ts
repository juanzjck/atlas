import fs from "fs/promises";
import path from "path";
import { blModel, blTools } from "@blaxel/llamaindex";
import { agent } from "@llamaindex/workflow";
import { tool } from "llamaindex";
import { z } from "zod";

/**
 * Atlas: meeting memory + decision extraction + Q&A
 *
 * Notes:
 * - For hackathon speed, we store "meetings" as JSON files in the sandbox FS.
 * - Later you can swap ingestMeetingTranscript() to call ElevenLabs STT first.
 */

type Decision = {
  title: string;
  rationale?: string;
  owner?: string;
  confidence?: number; // 0..1
};

type ActionItem = {
  task: string;
  owner?: string;
  due?: string;
  confidence?: number; // 0..1
};

type ConversationHealth = {
  score: number; // 0..100 heuristic
  signals: string[];
  caveat: string;
};

type MeetingExtraction = {
  summary: string;
  highlights: string[];
  topics: string[];
  decisions: Decision[];
  action_items: ActionItem[];
  conversation_health?: ConversationHealth;
};

type MeetingRecord = {
  meeting_id: string;
  title: string;
  date_iso: string;
  transcript: string;
  extraction: MeetingExtraction;
  memory_card: string; // short narrative
};

const DATA_DIR = process.env.ATLAS_DATA_DIR || path.join(process.cwd(), "atlas_data");

/** ---------- Persistence helpers ---------- */

async function ensureDataDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

function meetingFile(meeting_id: string) {
  return path.join(DATA_DIR, `${meeting_id}.json`);
}

async function saveMeeting(record: MeetingRecord) {
  await ensureDataDir();
  await fs.writeFile(meetingFile(record.meeting_id), JSON.stringify(record, null, 2), "utf-8");
}

async function listMeetings(): Promise<MeetingRecord[]> {
  await ensureDataDir();
  const files = await fs.readdir(DATA_DIR);
  const jsonFiles = files.filter((f) => f.endsWith(".json"));
  const records: MeetingRecord[] = [];
  for (const f of jsonFiles) {
    const raw = await fs.readFile(path.join(DATA_DIR, f), "utf-8");
    records.push(JSON.parse(raw));
  }
  // newest first
  records.sort((a, b) => (a.date_iso < b.date_iso ? 1 : -1));
  return records;
}

async function getMeeting(meeting_id: string): Promise<MeetingRecord | null> {
  try {
    const raw = await fs.readFile(meetingFile(meeting_id), "utf-8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/** ---------- ID helpers ---------- */

function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 40);
}

function makeMeetingId(title: string) {
  const ts = new Date().toISOString().replace(/[:.]/g, "");
  return `${slugify(title) || "meeting"}-${ts}`;
}

/** ---------- LLM extraction prompt ---------- */

function buildExtractionPrompt(transcript: string, title: string) {
  return `
You are Atlas, an always-on founder copilot. Your job is to turn a meeting transcript into durable company memory.

Return ONLY valid JSON that matches this TypeScript shape:

{
  "summary": string,
  "highlights": string[],
  "topics": string[],
  "decisions": Array<{ "title": string, "rationale"?: string, "owner"?: string, "confidence"?: number }>,
  "action_items": Array<{ "task": string, "owner"?: string, "due"?: string, "confidence"?: number }>,
  "conversation_health": { "score": number, "signals": string[], "caveat": string }
}

Rules:
- Extract ONLY what is supported by the transcript. If unsure, lower confidence.
- "topics" should be 3-8 short tags.
- "confidence" is 0..1.
- "conversation_health.score" is a heuristic 0..100 based on language cues; include a caveat like "Heuristic based on text; not definitive."

Meeting title: ${title}

Transcript:
"""${transcript}"""
`.trim();
}

function buildMemoryCardPrompt(extraction: MeetingExtraction, title: string, date_iso: string) {
  return `
Write a short "memory card" (max 120 words) that a founder can skim later.
Include:
- the meeting title and date
- the key decision(s)
- top 1-2 action items
- the most important constraint or rationale

Output plain text only.
Title: ${title}
Date: ${date_iso}

Extraction JSON:
${JSON.stringify(extraction, null, 2)}
`.trim();
}

/** ---------- Atlas agent tools ---------- */

const ingestSchema = z.object({
  title: z.string().min(1),
  date_iso: z.string().optional(), // default now
  transcript: z.string().min(20),
});

const askSchema = z.object({
  question: z.string().min(1),
});

const getSchema = z.object({
  meeting_id: z.string().min(1),
});

const listSchema = z.object({
  limit: z.number().int().min(1).max(50).optional(),
});

async function extractWithLLM(llm: any, prompt: string): Promise<any> {
  // LlamaIndex LLM interface varies; blModel("sandbox-openai") supports .complete in many setups.
  // Fallback: call as function if needed.
  if (typeof llm.complete === "function") {
    const out = await llm.complete({ prompt });
    return out.text ?? out?.message?.content ?? out;
  }
  if (typeof llm === "function") {
    const out = await llm(prompt);
    return out;
  }
  // As a last resort, try chat-style
  if (typeof llm.chat === "function") {
    const out = await llm.chat({ messages: [{ role: "user", content: prompt }] });
    return out?.message?.content ?? out?.choices?.[0]?.message?.content ?? out;
  }
  throw new Error("Unsupported LLM interface; cannot run extraction.");
}

function safeJsonParse(s: string): any {
  // Strip possible markdown fences
  const cleaned = s
    .trim()
    .replace(/^```json/i, "")
    .replace(/^```/i, "")
    .replace(/```$/i, "")
    .trim();
  return JSON.parse(cleaned);
}

/** ---------- Main exported handler ---------- */

export default async function atlas(input: string): Promise<string> {
  const tools = await blTools(["blaxel-search"]);
  const llm = await blModel("sandbox-openai");

  const atlasTools = [
    ...tools,

    tool({
      name: "atlas_ingest_meeting",
      description:
        "Save a meeting transcript to Atlas memory. Atlas will extract summary, decisions, topics, action items, and conversation health, then persist it.",
      parameters: ingestSchema,
      execute: async ({ title, transcript, date_iso }) => {
        const date = date_iso || new Date().toISOString();

        // 1) Extract structured info
        const extractionPrompt = buildExtractionPrompt(transcript, title);
        const extractionText = await extractWithLLM(llm, extractionPrompt);

        let extraction: MeetingExtraction;
        try {
          extraction = safeJsonParse(String(extractionText));
        } catch (e) {
          // If JSON parsing fails, return a helpful error to keep demo moving
          return `Failed to parse extraction JSON. Raw model output:\n${String(extractionText).slice(0, 2000)}`;
        }

        // 2) Build memory card
        const memoryCardPrompt = buildMemoryCardPrompt(extraction, title, date);
        const memoryCardText = await extractWithLLM(llm, memoryCardPrompt);
        const memory_card = String(memoryCardText).trim();

        // 3) Persist
        const meeting_id = makeMeetingId(title);
        const record: MeetingRecord = {
          meeting_id,
          title,
          date_iso: date,
          transcript,
          extraction,
          memory_card,
        };

        await saveMeeting(record);

        // Return a compact confirmation for chat UX
        const decisionCount = extraction.decisions?.length ?? 0;
        const actionCount = extraction.action_items?.length ?? 0;
        return `✅ Saved meeting "${title}" (${meeting_id}). Extracted ${decisionCount} decision(s) and ${actionCount} action item(s).\n\nMemory card:\n${memory_card}`;
      },
    }),

    tool({
      name: "atlas_list_meetings",
      description: "List recent meetings saved in Atlas memory.",
      parameters: listSchema,
      execute: async ({ limit }) => {
        const records = await listMeetings();
        const sliced = records.slice(0, limit ?? 10);
        if (!sliced.length) return "No meetings saved yet. Use atlas_ingest_meeting first.";
        return sliced
          .map((r, i) => {
            const health = r.extraction?.conversation_health?.score;
            const healthStr = typeof health === "number" ? ` | health ${health}/100` : "";
            return `${i + 1}. ${r.title} — ${r.date_iso} — id: ${r.meeting_id}${healthStr}\n   ${r.memory_card}`;
          })
          .join("\n");
      },
    }),

    tool({
      name: "atlas_get_meeting",
      description: "Get a specific meeting by meeting_id (includes summary, decisions, topics, and action items).",
      parameters: getSchema,
      execute: async ({ meeting_id }) => {
        const record = await getMeeting(meeting_id);
        if (!record) return `Meeting not found: ${meeting_id}`;
        return JSON.stringify(
          {
            meeting_id: record.meeting_id,
            title: record.title,
            date_iso: record.date_iso,
            memory_card: record.memory_card,
            extraction: record.extraction,
          },
          null,
          2
        );
      },
    }),

    tool({
      name: "atlas_ask",
      description:
        "Ask Atlas a question across all saved meetings. Atlas will use saved memory cards and extracted decisions to answer with context.",
      parameters: askSchema,
      execute: async ({ question }) => {
        const records = await listMeetings();
        if (!records.length) return "No meetings saved yet. Ingest a meeting transcript first.";

        // Build a compact context pack (keep it small to avoid token blowups)
        const contextPack = records.slice(0, 12).map((r) => ({
          meeting_id: r.meeting_id,
          title: r.title,
          date_iso: r.date_iso,
          topics: r.extraction?.topics ?? [],
          decisions: (r.extraction?.decisions ?? []).slice(0, 6),
          action_items: (r.extraction?.action_items ?? []).slice(0, 6),
          memory_card: r.memory_card,
        }));

        const prompt = `
You are Atlas, an always-on founder copilot with long-term memory.

Use ONLY the provided meeting memory to answer. If the memory is insufficient, say what is missing and ask 1 clarifying question.

Meeting Memory (most recent first):
${JSON.stringify(contextPack, null, 2)}

Founder question:
${question}

Answer format:
- Direct answer (2-6 sentences)
- Relevant references (bullet list with meeting title + date + decision title if possible)
- Next question (one clarifying question)
`.trim();

        const out = await extractWithLLM(llm, prompt);
        return String(out).trim();
      },
    }),
  ];

  const response = await agent({
    tools: atlasTools,
    llm: llm as any,
    verbose: false,
    systemPrompt: `
      You are Atlas. You help founders remember decisions across meetings.

      Behavior:
      - If user provides a meeting transcript (or says "ingest meeting"), use atlas_ingest_meeting.
      - If user asks "list meetings" or "what meetings do we have", use atlas_list_meetings.
      - If user asks about a specific meeting id, use atlas_get_meeting.
      - If user asks a question about past decisions, use atlas_ask.
      `.trim(),
        }).run(input);

  return (response as any).data?.result || response.toString();
}
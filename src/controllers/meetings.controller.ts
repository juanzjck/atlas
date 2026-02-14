import type { FastifyReply, FastifyRequest } from "fastify";
import { createWriteStream } from "node:fs";
import os from "node:os";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import { transcribeWithElevenLabs } from "../services/stt.service.js";
import { processMeetingWithAtlas } from '../services/atlas.service.js';
type TranscribeResponse = {
  transcript: string;
  filename?: string;
  content_type?: string;
  processMeetingWithAtlasRespnse?: any;
};

export async function processMeetingController(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const parts = request.parts();

    let tmpFilePath: string | null = null;
    let filename: string | undefined;
    let contentType: string | undefined;
    let title: string | null = null;
    for await (const part of parts) {
      if (part.type === "file" && part.fieldname === "file") {
        filename = part.filename || "audio";
        contentType = part.mimetype;

        const ext = path.extname(filename) || ".audio";
        tmpFilePath = path.join(os.tmpdir(), `atlas-audio-${Date.now()}${ext}`);

        await pipeline(part.file, createWriteStream(tmpFilePath));
      }
      if(part.fieldname === 'title' && part.type === 'field'){
        title = String(part.value);
      }
    }

    if (!tmpFilePath) {
      return reply.status(400).send({
        transcript: "",
      } satisfies TranscribeResponse);
    }

    const transcript = await transcribeWithElevenLabs(tmpFilePath, {
      diarize: true,
      tagAudioEvents: true,
    });

    let  processMeetingWithAtlasRespnse = undefined;
    
    if (transcript && title) {
      processMeetingWithAtlasRespnse = await  processMeetingWithAtlas({
            title,
            transcript: transcript
        });
    }

    return reply.send({
      transcript,
      filename,
      content_type: contentType,
      processMeetingWithAtlasRespnse
    } satisfies TranscribeResponse);
  } catch (err: any) {
    request.log.error(err);
    return reply.status(500).send({
      transcript: err?.message || "Internal error",
    } satisfies TranscribeResponse);
  }
}
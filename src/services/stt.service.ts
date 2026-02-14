import { createReadStream } from "node:fs";
import { getElevenLabsClient } from "../lib/elevenlabs.js";

export type TranscribeOptions = {
  diarize?: boolean;
  tagAudioEvents?: boolean;
  languageCode?: string; // optional hint, e.g. "eng"
};

export async function transcribeWithElevenLabs(
  filePath: string,
  opts: TranscribeOptions = {}
): Promise<string> {
  const client = getElevenLabsClient();

  const result = await client.speechToText.convert({
    file: createReadStream(filePath),
    modelId: "scribe_v2",
    diarize: opts.diarize ?? true,
    tagAudioEvents: opts.tagAudioEvents ?? true,
    languageCode: opts.languageCode,
  });
  // @ts-ignore
  const transcript = result.text?.trim() ?? "";
  if (!transcript) throw new Error("ElevenLabs transcription returned empty text");
  return transcript;
}
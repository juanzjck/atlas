````md
## 🧠 Atlas: Meeting Intelligence & Persistent Memory

This project extends the base Blaxel + LlamaIndex agent into **Atlas**, an always-on founder copilot that turns meeting recordings into durable company memory.

Atlas can:
- Transcribe **audio or video meetings**
- Extract **decisions, topics, action items, and highlights**
- Persist this information inside a **Blaxel sandbox**
- Answer questions later using **institutional memory**, not just the last prompt

---

## 🔄 How Atlas Works

### 1. Upload a Meeting (Video or Audio)
Atlas exposes an HTTP endpoint that accepts `multipart/form-data`.

**Fields**
- `file` — meeting recording (`.mp4`, `.mov`, `.wav`, `.mp3`, etc.)
- `title` — optional meeting title

```bash
curl -X POST http://localhost:3000/process_meeting \
  -F "title=Weekly product sync" \
  -F "file=@./meeting.mp4"
````

---

### 2. Video → Audio (If Needed)

If the uploaded file is a video, Atlas extracts the audio track and converts it to a mono 16kHz WAV format before transcription.

---

### 3. Speech → Text (ElevenLabs)

Atlas uses **ElevenLabs Speech-to-Text (Scribe v2)** to generate a transcript from the meeting audio.
Optional features include speaker diarization and audio event tagging.

---

### 4. Decision & Topic Extraction

Using **LlamaIndex** and a structured LLM prompt, Atlas extracts:

* Meeting summary
* Key decisions (with rationale and confidence)
* Topics discussed
* Action items
* Conversation health indicators (heuristic signal)

---

### 5. Persistent Memory (Blaxel Sandbox)

Each meeting is saved as a persistent record inside the Blaxel sandbox, including:

* Transcript
* Structured extraction
* A short human-readable memory card

This memory persists across sessions and server restarts.

---

### 6. Ask Atlas (Institutional Memory Q&A)

Once meetings are ingested, users can query Atlas with questions such as:

* “What did we decide about pricing last week?”
* “Summarize decisions related to hiring.”
* “Which meetings mentioned runway risk?”

Atlas answers using stored meeting memory and decision context.

---

## 🔌 API: `/process_meeting`

### Request

* **Method:** `POST`
* **Content-Type:** `multipart/form-data`

**Fields**

* `file` (required): audio or video file
* `title` (optional): meeting title

### Response

```json
{
  "title": "Weekly product sync",
  "transcript": "Full meeting transcript...",
  "atlas_response": "Confirmation and extracted insights"
}
```

---

## 🧩 Architecture Overview


Audio Extraction
        ↓
ElevenLabs STT
        ↓
Transcript
        ↓
LlamaIndex Agent (Atlas)
        ↓
Decisions / Topics / Actions
        ↓
Blaxel Persistent Memory
        ↓
Founder Q&A
```

---

## ⚠️ Notes

* Conversation “tension” is a **heuristic indicator** based on language patterns, not definitive emotion detection.
* This implementation is optimized for **hackathon speed and clarity**, not production-scale ingestion pipelines.

```
```

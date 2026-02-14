import 'dotenv/config';
import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Fix for __dirname in ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const port = 3000;

// Middleware
app.use(express.json());
app.use(express.static(__dirname));

/* -------------------------------------------------------------------------- */
/* 1. PERSISTENCE CONFIGURATION (JSON DATABASE)                               */
/* -------------------------------------------------------------------------- */
const DATA_FILE = path.join(__dirname, 'meetings.json');

// Ensure the uploads folder exists
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

// Helper: Read meetings from disk
const getStoredMeetings = () => {
    try {
        if (!fs.existsSync(DATA_FILE)) return [];
        const data = fs.readFileSync(DATA_FILE, 'utf8');
        return JSON.parse(data || "[]");
    } catch (err) {
        console.error("Error reading data file:", err);
        return [];
    }
};

// Helper: Save a new meeting to disk
const saveMeetingToDisk = (meeting) => {
    try {
        const meetings = getStoredMeetings();
        meetings.push(meeting);
        fs.writeFileSync(DATA_FILE, JSON.stringify(meetings, null, 2));
    } catch (err) {
        console.error("Error saving to data file:", err);
    }
};

/* -------------------------------------------------------------------------- */
/* 2. API ROUTES: HISTORY & STORAGE                                           */
/* -------------------------------------------------------------------------- */

// GET: Retrieve all past meetings for browser refresh
app.get('/api/meetings', (req, res) => {
    res.json(getStoredMeetings());
});

/* -------------------------------------------------------------------------- */
/* 3. API ROUTES: INGESTION (Manual & Auto-Sync)                              */
/* -------------------------------------------------------------------------- */
const upload = multer({ 
    storage: multer.diskStorage({
        destination: (req, file, cb) => cb(null, 'uploads/'),
        filename: (req, file, cb) => {
            const safeName = file.originalname.replace(/[^a-zA-Z0-9.]/g, '_');
            cb(null, Date.now() + '-' + safeName);
        }
    }),
    limits: { fileSize: 100 * 1024 * 1024 } // 100 MB Limit
});

app.post('/api/ingest-audio', upload.single('audio'), (req, res) => {
    const title = req.body.title || (req.file ? req.file.originalname : "Untitled Meeting");

    // Generate Mock Data for the meeting
    const newMeeting = {
        id: Date.now(),
        title: title,
        timestamp: new Date().toISOString(),
        summary: "Strategic alignment regarding project goals and timeline. Discussion included resource allocation and key milestones for the upcoming quarter.",
        decisions: [
            { title: "Standardize Data Persistence", rationale: "Enables browser refresh support." },
            { title: "Prioritize AI Accuracy", rationale: "Ensure the bot ignores stale context." }
        ],
        action_items: [
            { task: "Test JSON storage integrity", owner: "Dev Team" },
            { task: "Update frontend fetch logic", owner: "Frontend" }
        ],
        conversation_health: Math.floor(Math.random() * (100 - 65) + 65)
    };

    // PERSIST: Save it so it's there after refresh
    saveMeetingToDisk(newMeeting);

    console.log(`[Atlas] Meeting saved: ${title}`);
    setTimeout(() => res.json(newMeeting), 1500);
});

/* -------------------------------------------------------------------------- */
/* 4. API ROUTES: AI CHAT (The Context Fix)                                   */
/* -------------------------------------------------------------------------- */
app.post('/api/ask', async (req, res) => {
    const { question, context } = req.body;
    
    // We send a hard instruction to Blaxel to prioritize the NEW context
    let fullInput = `
    ### SYSTEM INSTRUCTION
    You are Atlas AI. Focus ONLY on the "Active Meeting Context" provided below. 
    Ignore previous meeting data unless the user asks for a comparison.

    ### ACTIVE MEETING CONTEXT
    ${context || "No specific meeting context provided yet."}

    ### USER QUESTION
    ${question}
    `;

    try {
        const blaxelUrl = "https://agt-atlas-q07qtw.bl.run?debug=true"; 
        const response = await fetch(blaxelUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-Blaxel-Authorization": "Bearer bl_aaab6hs02a9l19k2aeem52b4dgzzyuzw",
                "X-Blaxel-Workspace": "atlas"
            },
            body: JSON.stringify({ inputs: fullInput })
        });

        const rawText = await response.text();
        let agentAnswer;

        try {
            const data = JSON.parse(rawText);
            agentAnswer = data.response || data.output || (data.choices && data.choices[0]?.message?.content) || JSON.stringify(data);
        } catch (e) {
            agentAnswer = rawText;
        }

        res.json({ answer: agentAnswer });

    } catch (error) {
        console.error("[Atlas] Chat Error:", error);
        res.status(500).json({ answer: "The AI agent is currently offline." });
    }
});

/* -------------------------------------------------------------------------- */
/* 5. START SERVER                                                            */
/* -------------------------------------------------------------------------- */
app.listen(port, () => {
    console.log(`\n🚀 ATLAS BACKEND ACTIVE`);
    console.log(`📍 URL: http://localhost:${port}`);
    console.log(`📁 Persistence: ${DATA_FILE}`);
    console.log(`-----------------------------------\n`);
});
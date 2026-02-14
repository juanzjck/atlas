/* ==========================================================================
   ATLAS - FRONTEND CORE LOGIC
   ========================================================================== */
   
window.addEventListener('DOMContentLoaded', loadMeetingHistory);

/**
 * FETCH HISTORY: This runs every time the page is refreshed.
 * It asks the server for the JSON data and rebuilds the feed.
 */
async function loadMeetingHistory() {
  try {
    const response = await fetch('/api/meetings');
    const meetings = await response.json();
    
    if (meetings.length > 0) {
      // Clear the feed first to prevent duplicates
      meetingFeed.innerHTML = "";

      // Loop through and add them to the UI
      meetings.forEach(meeting => {
        addMeetingToFeed(meeting);
      });

      // Set the AI context to the most recent meeting
      const mostRecent = meetings[meetings.length - 1];
      updateActiveContext(mostRecent);

      appendChatMessage("bot", `Welcome back. I've restored **${meetings.length}** meetings from your history.`);
    }
  } catch (error) {
    console.error("Error loading history:", error);
  }
}

/* ===== GLOBAL STATE ===== */
let latestMeetingContext = null; // Stores the active meeting data for the AI

/* ===== DOM ELEMENTS ===== */
// Upload Elements
const uploadBtn = document.getElementById("uploadBtn");
const audioInput = document.getElementById("audioFile");
const titleInput = document.getElementById("meetingTitle");
const processing = document.getElementById("processing");

// Feed & Chat Elements
const meetingFeed = document.getElementById("meetingFeed");
const chatLog = document.getElementById("chatLog");
const chatInput = document.getElementById("chatInput");
const sendBtn = document.getElementById("sendBtn");

// Integration Elements
const syncStatus = document.getElementById("syncStatus");
const syncText = document.getElementById("syncText");

/* ==========================================================================
   1. MEETING INGESTION (MANUAL UPLOAD)
   ========================================================================== */
uploadBtn.addEventListener("click", async () => {
  const file = audioInput.files[0];
  if (!file) {
    alert("Please select an audio file first.");
    return;
  }

  // UI State: Loading
  uploadBtn.disabled = true;
  processing.classList.remove("hidden");
  
  const formData = new FormData();
  formData.append("audio", file);
  formData.append("title", titleInput.value.trim() || file.name);

  try {
    const response = await fetch("/api/ingest-audio", {
      method: "POST",
      body: formData
    });

    if (!response.ok) throw new Error("Upload failed.");

    const data = await response.json();

    // 1. Add to the list
    addMeetingToFeed(data);

    // 2. Refresh context for the AI
    updateActiveContext(data);

    // 3. Notify Chat
    appendChatMessage("bot", `✅ Processed: **${data.title}**. Ask me anything about it!`);

  } catch (error) {
    console.error("Upload Error:", error);
    alert("Error processing audio file.");
  } finally {
    processing.classList.add("hidden");
    uploadBtn.disabled = false;
    audioInput.value = ""; // Reset
    titleInput.value = "";
  }
});

/* ==========================================================================
   2. AUTO-SYNC INTEGRATIONS (GMAIL, SLACK, OUTLOOK)
   ========================================================================== */
async function syncService(serviceName) {
  // UI State: Syncing
  syncStatus.classList.remove("hidden");
  syncText.textContent = `Syncing with ${serviceName}...`;
  
  const buttons = document.querySelectorAll('.service-btn');
  buttons.forEach(b => b.disabled = true);

  try {
    // Simulate API handshakes
    await new Promise(r => setTimeout(r, 1200));
    syncText.textContent = `Fetching latest recording...`;
    await new Promise(r => setTimeout(r, 1200));
    syncText.textContent = `Analyzing with Atlas AI...`;

    // Trigger ingest on the backend
    const response = await fetch("/api/ingest-audio", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        title: `Synced: ${serviceName} Meeting`,
        isAutoSync: true 
      })
    });

    const data = await response.json();

    addMeetingToFeed(data);
    updateActiveContext(data);

    appendChatMessage("bot", `✨ **${serviceName} Sync Success!** New meeting data added to context.`);
    syncText.textContent = "Sync Complete!";

  } catch (error) {
    syncText.textContent = "Sync failed.";
  } finally {
    setTimeout(() => syncStatus.classList.add("hidden"), 2000);
    buttons.forEach(b => b.disabled = false);
  }
}

/* ==========================================================================
   3. CORE UI & STATE HELPERS
   ========================================================================== */

/**
 * Updates the global context variable so the /ask route 
 * always sends the most recent meeting details to Blaxel.
 */
function updateActiveContext(data) {
  latestMeetingContext = `
    CURRENT_MEETING_ID: ${Date.now()}
    MEETING_TITLE: ${data.title}
    EXECUTIVE_SUMMARY: ${data.summary}
    KEY_DECISIONS: ${data.decisions.map(d => d.title).join(" | ")}
    ACTION_ITEMS: ${data.action_items.map(a => a.task).join(" | ")}
    CONVERSATION_HEALTH: ${data.conversation_health}%
  `;
  console.log("[Atlas] Active context updated to:", data.title);
}

/**
 * Adds a new card to the meeting list (Pile-up)
 */
function addMeetingToFeed(data) {
  const card = document.createElement("div");
  card.className = "meeting-card";

  const score = data.conversation_health || 0;
  const color = score > 70 ? "#10B981" : (score > 40 ? "#F59E0B" : "#EF4444");

  card.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center;">
      <h2 style="margin:0;">${data.title}</h2>
      <span style="font-size:11px; color:#9CA3AF;">${new Date().toLocaleTimeString()}</span>
    </div>
    
    <p style="margin: 12px 0; color:#D1D5DB; font-size:14px;">${data.summary}</p>
    
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:15px;">
      <div>
        <h3 style="font-size:12px; text-transform:uppercase; color:#60A5FA;">Decisions</h3>
        <ul style="padding-left:15px; font-size:13px;">
          ${data.decisions.map(d => `<li>${d.title}</li>`).join('')}
        </ul>
      </div>
      <div>
        <h3 style="font-size:12px; text-transform:uppercase; color:#60A5FA;">Next Steps</h3>
        <ul style="padding-left:15px; font-size:13px;">
          ${data.action_items.map(a => `<li>${a.task}</li>`).join('')}
        </ul>
      </div>
    </div>

    <div style="margin-top:15px;">
      <div style="display:flex; justify-content:space-between; font-size:12px; margin-bottom:4px;">
        <span>Health</span>
        <span style="color:${color}; font-weight:bold;">${score}%</span>
      </div>
      <div class="health-bar">
        <div class="health-fill" style="width:${score}%; background-color:${color};"></div>
      </div>
    </div>
  `;

  // Prepend so the newest is always on top
  meetingFeed.prepend(card);
}

/* ==========================================================================
   4. CHAT SYSTEM
   ========================================================================== */
sendBtn.addEventListener("click", sendMessage);
chatInput.addEventListener("keypress", (e) => { if (e.key === "Enter") sendMessage(); });

async function sendMessage() {
  const question = chatInput.value.trim();
  if (!question) return;

  // Add User Message
  appendChatMessage("user", question);
  chatInput.value = "";

  // Add Loading Bot Message
  const loadingId = appendChatMessage("bot", "Processing query...");

  try {
    const response = await fetch("/api/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        question: question,
        context: latestMeetingContext // Pass the latest meeting data!
      })
    });

    const data = await response.json();
    
    // Replace loading with real answer
    const loadingEl = document.getElementById(loadingId);
    if(loadingEl) loadingEl.innerHTML = data.answer || "I couldn't find an answer for that.";

  } catch (error) {
    const loadingEl = document.getElementById(loadingId);
    if(loadingEl) loadingEl.textContent = "Error: System Offline.";
  }
}

function appendChatMessage(sender, text) {
  const msgDiv = document.createElement("div");
  msgDiv.className = `chat-message ${sender}`;
  msgDiv.innerHTML = text; // Use innerHTML to allow basic formatting
  
  const id = "msg-" + Date.now();
  msgDiv.id = id;

  chatLog.appendChild(msgDiv);
  chatLog.scrollTop = chatLog.scrollHeight;
  return id;
}
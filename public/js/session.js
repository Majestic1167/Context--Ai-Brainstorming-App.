import {
  addParticipantToDOM,
  removeParticipantFromDOM,
  renderParticipantsList,
} from "../js/ui.js";

const ideaForm = document.getElementById("idea-form");
const ideaInput = document.getElementById("idea-input");
const ideaWarning = document.getElementById("idea-warning");
const ideasContainer = document.getElementById("ideas-container");

let socket;
let sessionId, userId, username;

function initializeSession() {
  const container = document.getElementById("joined-session-container");
  if (!container) return;

  sessionId = container.dataset.sessionId;
  userId = container.dataset.userId;
  username = container.dataset.username;

  if (!sessionId || !userId || !username) {
    console.error("Missing session data");
    return;
  }

  if (socket) socket.disconnect();

  socket = io({
    auth: {
      userId,
      username,
    },
  });

  socket.emit("join room", { roomId: sessionId, userId, username });
  setupSocketListeners();
}

let countdownInterval;

function startRoundTimer(timeLeft, sessionId) {
  const timerDisplay = document.getElementById("session-timer");

  const renderTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    timerDisplay.textContent = `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  renderTime(timeLeft);
  clearInterval(countdownInterval);

  countdownInterval = setInterval(() => {
    timeLeft--;
    if (timeLeft >= 0) {
      renderTime(timeLeft);
    } else {
      clearInterval(countdownInterval);

      // ✅ NOW fetch the ideas AFTER time ends
      const ideaElements = document.getElementsByClassName("useridea");
      const ideaData = Array.from(ideaElements).map((el) => ({
        text: el.textContent.trim(),
        userId: el.dataset.userId,
        username: el.dataset.username,
      }));

      console.log(ideaData);

      // ⬇️ Emit with the sessionId payload
      socket.emit("timer-finished", {
        sessionId,
        ideas: ideaData,
      });

      // 🔽 Show "AI is generating..." message and hide other sections
      document.querySelector(".joined-chat-section").style.display = "none";
      document.querySelector(".joined-brainstorming-section").style.display =
        "none";
      document.getElementById("ai-loading-message").style.display = "block";

      ideaInput.disabled = true;
      ideaForm.querySelector("button").disabled = true;

      // show a “time’s up” warning
      const warning = document.getElementById("idea-warning");
      warning.textContent = "⏰ Time's up!";
      warning.style.display = "block";
    }
  }, 1000);
}

// ---------------------- BRAINSTORMING FORM ----------------------

if (ideaForm && ideaInput && ideasContainer) {
  ideaForm.addEventListener("submit", (e) => {
    e.preventDefault();

    const word = ideaInput.value.trim();

    // Allow only one word (no spaces)
    if (word.includes(" ")) {
      ideaWarning.style.display = "block";
      return;
    }

    ideaWarning.style.display = "none";

    // Emit idea
    socket.emit("send-idea", {
      word,
      userId,
      username,
      sessionId,
    });

    ideaInput.value = "";
  });
}

// Listen for button click to emit "nextRound"
const nextRoundBtn = document.getElementById("next-round-button");
if (nextRoundBtn) {
  nextRoundBtn.addEventListener("click", () => {
    const sessionId =
      document.querySelector(".session-container").dataset.sessionId;
    socket.emit("nextRound", { sessionId });
  });
}
// ---------------------- SOCKET LISTENERS ----------------------

function setupSocketListeners() {
  let participants = [];

  let initialRenderDone = false; // ← NEW FLAG

  socket.on("connect", () => {
    console.log("Connected:", socket.id);
  });

  socket.on("room participants", (data) => {
    console.log("Received room participants:", data);
    participants = Array.isArray(data) ? data : data.participants || [];

    // only call renderParticipantsList after the first dynamic join/leave
    if (initialRenderDone) {
      renderParticipantsList(participants);
    }
  });

  socket.on("user joined", (data) => {
    participants.push(data);
    addParticipantToDOM(data);
    initialRenderDone = true; // ← MARK that we’ve now done a dynamic update
    addSystemMessage(`${data.username} has joined.`);
  });

  socket.on("user left", (data) => {
    participants = participants.filter((p) => p.userId !== data.userId);
    removeParticipantFromDOM(data.username);
    initialRenderDone = true; // ← also mark here
    addSystemMessage(`${data.username} has left.`);
  });

  socket.on("chat message", (data) => {
    const chatMessages = document.getElementById("chat-messages");
    if (!chatMessages) return;

    const msg = document.createElement("div");
    msg.className = "message";
    msg.innerHTML = `
      <strong>${data.username}</strong>: ${data.message}
      <small>${new Date(data.timestamp).toLocaleTimeString()}</small>
    `;
    chatMessages.appendChild(msg);
    chatMessages.scrollTo({
      top: chatMessages.scrollHeight,
      behavior: "smooth",
    });
  });

  const allIdeas = []; // Store raw ideas

  socket.on("receive-idea", ({ word, username }) => {
    const div = document.createElement("div");
    div.className = "idea-entry";

    // Add HTML for display
    div.innerHTML = `<span class="user">${username}</span>: <span class="useridea">${word}</span>`;
    ideasContainer?.appendChild(div);

    // Store raw idea for saving later
    allIdeas.push({ username, word });
  });

  socket.on("typing", (data) => {
    const indicator = document.getElementById("typing-indicator");
    if (indicator) {
      indicator.textContent = data.isTyping
        ? `${data.username} is typing...`
        : "";
      indicator.style.display = data.isTyping ? "block" : "none";
    }
  });

  socket.on("ai-response", (data) => {
    let aiResponse = data.response || "No response";

    console.log("Raw AI Response:", aiResponse);

    // Clean formatting issues
    aiResponse = aiResponse.replace(/<think>/gi, "").replace(/<\/think>/gi, "");
    aiResponse = aiResponse.replace(/```json|```/gi, "").trim();
    aiResponse = aiResponse.replace(/\/\/.*$/gm, "").trim();
    aiResponse = aiResponse.replace(/`/g, ""); // Remove all backticks

    console.log("Cleaned AI Response:", aiResponse);

    let parsed;
    try {
      const trimmed = aiResponse.trim();

      if (!trimmed.startsWith("{") || !trimmed.endsWith("}")) {
        throw new Error("Response does not look like JSON");
      }

      parsed = JSON.parse(trimmed);

      console.log("Parsed AI JSON:", parsed);

      if (typeof parsed !== "object" || parsed === null) {
        throw new Error("Parsed content is not an object");
      }
    } catch (e) {
      console.error("Invalid JSON from AI:", e, aiResponse);
      parsed = {
        words: [],
        generated_text: "No concept generated.",
        most_influential_contributor: "Unknown",
      };
    }

    const rawContributor = parsed.most_influential_contributor;

    // Get words from the most influential contributor
    const contributorWords = rawContributor?.words || [];

    const usedWords = Array.isArray(parsed.words) ? parsed.words : [];
    const wordsHTML = usedWords.length
      ? usedWords.map((word) => `<li>${word}</li>`).join("")
      : "<li>No words</li>";

    const generatedText =
      parsed.generated_text ||
      parsed.generated_idea ||
      parsed.generatedText ||
      parsed.generatedIdea ||
      "No concept generated.";

    const description =
      typeof generatedText === "string"
        ? generatedText
        : generatedText.description || "No description available";

    let contributorUser = "Unknown";
    let contributedWords = "N/A";
    let wordCount = "N/A";

    if (typeof rawContributor === "string") {
      contributorUser = rawContributor;
      if (contributorWords.length) {
        contributedWords = contributorWords.join(", ");
        wordCount = contributorWords.length;
      }
    } else if (typeof rawContributor === "object" && rawContributor !== null) {
      contributorUser =
        rawContributor.name ||
        rawContributor.user ||
        rawContributor.user_name ||
        "Unknown";

      const possibleWords =
        rawContributor.contributed_words ||
        rawContributor.words ||
        rawContributor.words_count ||
        rawContributor.contributions ||
        rawContributor.centrality ||
        rawContributor.words_contributed;

      if (Array.isArray(possibleWords)) {
        contributedWords = possibleWords.join(", ");
        wordCount = possibleWords.length;
      } else if (typeof rawContributor.centrality === "object") {
        contributedWords = Object.keys(rawContributor.centrality).join(", ");
        wordCount = Object.keys(rawContributor.centrality).length;
      } else if (typeof rawContributor.centrality_score === "number") {
        contributedWords = contributorWords.join(", "); // fallback
        wordCount = rawContributor.centrality_score;
      } else if (typeof rawContributor.word_count === "number") {
        wordCount = rawContributor.word_count;
      } else if (typeof rawContributor.number_of_words === "number") {
        wordCount = rawContributor.number_of_words;
      }
    }

    const goBackHref = window.userLoggedIn === "true" ? "/Loggedin" : "/";
    const isPrivileged =
      window.userIsHost === "true" || window.userIsAdmin === "true";

    let buttonsHTML = "";
    if (isPrivileged) {
      buttonsHTML = `
    <div class="ai-buttons">
      <a href="/createsession" class="btn btn-primary">🆕 Create New Session</a>
      <a href="${goBackHref}" class="btn btn-secondary">🔙 Go Back</a>
    </div>
  `;
    } else {
      buttonsHTML = `
    <div class="ai-buttons">
      <a href="${goBackHref}" class="btn btn-secondary">🔙 Go Back</a>
    </div>
  `;
    }

    const conceptHTML = `
  <div class="ai-concept-wrapper">
    <h2>🌟 AI Generated Concept</h2>
    <h3>💡 Concept Summary</h3>
    <p>${description}</p>
    <h3>📝 Words Used</h3>
    <ul>${wordsHTML}</ul>
    <h3>🏆 Most Influential Contributor</h3>
    <p>
      <strong>${contributorUser}</strong><br>
      Contributed ${contributedWords} words (${wordCount})
    </p>
    ${buttonsHTML}
  </div>
`;

    const aiConceptContent = document.getElementById("ai-concept-content");
    aiConceptContent.innerHTML = conceptHTML;

    document.querySelector(".joined-chat-section").style.display = "none";
    document.querySelector(".joined-brainstorming-section").style.display =
      "none";
    document.getElementById("ai-loading-message").style.display = "none";
    document.getElementById("ai-generated-concept").style.display = "block";
  });

  socket.on("ai-error", (data) => {
    const goBackHref = window.userLoggedIn === "true" ? "/Loggedin" : "/";
    const isPrivileged =
      window.userIsHost === "true" || window.userIsAdmin === "true";

    let buttonsHTML = "";
    if (isPrivileged) {
      buttonsHTML = `
      <div class="ai-buttons" style="margin-top: 1rem;">
        <a href="/createsession" class="btn btn-primary">🆕 Create New Session</a>
        <a href="${goBackHref}" class="btn btn-secondary">🔙 Go Back</a>
      </div>
    `;
    } else {
      buttonsHTML = `
      <div class="ai-buttons" style="margin-top: 1rem;">
        <a href="${goBackHref}" class="btn btn-secondary">🔙 Go Back</a>
      </div>
    `;
    }

    const errorHTML = `
    <h3>⚠️ ${data.message}</h3>
    ${buttonsHTML}
  `;

    const errorContainer = document.getElementById("ai-error-message");
    errorContainer.innerHTML = errorHTML;
    errorContainer.style.display = "block";

    // Optionally hide loading spinner or concept section
    document.getElementById("ai-loading-message").style.display = "none";
    document.getElementById("ai-concept-content").style.display = "none";
  });

  socket.on(
    "session-started",
    ({ sessionId, sessionName, theme, timer, round = 1, participants }) => {
      // Remove the waiting message and start button
      document.querySelector(".joined-wait-message")?.remove();
      document.getElementById("start-session-btn")?.remove();

      // Hide the access code if it exists
      const accessCodeEl = document.querySelector(".joined-access-code");
      if (accessCodeEl) accessCodeEl.style.display = "none";

      // Display the brainstorming and chat sections
      document.querySelector(".joined-brainstorming-section").style.display =
        "block";
      document.querySelector(".joined-chat-section").style.display = "block";

      // Pass sessionId to startRoundTimer
      startRoundTimer(timer, sessionId); // Pass the sessionId here

      // Render participants list with usernames and profile pictures
      renderParticipantsList(participants);
    }
  );

  document
    .getElementById("start-session-btn")
    ?.addEventListener("click", () => {
      const startBtn = document.getElementById("start-session-btn");
      const sessionId = startBtn.getAttribute("data-session-id");
      const timer = parseInt(startBtn.getAttribute("data-timer")); // Get session timer

      // Emit event to server with timer value
      socket.emit("start-session", { sessionId, timer });
    });

  socket.on("connect_error", (err) => {
    console.error("Socket error:", err.message);
  });
}

// ---------------------- CHAT FORM ----------------------

const chatForm = document.getElementById("chat-form");
const chatInput = document.getElementById("chat-input");

if (chatForm && chatInput) {
  chatForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const msg = chatInput.value.trim();
    if (!msg || !socket?.connected) return;

    socket.emit("chat message", {
      roomId: sessionId,
      message: msg,
      userId,
      username,
    });

    chatInput.value = "";
  });

  let isTyping = false;
  let typingTimeout;

  chatInput.addEventListener("input", () => {
    if (!isTyping) {
      socket.emit("typing", { roomId: sessionId, username, isTyping: true });
      isTyping = true;
    }

    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => {
      socket.emit("typing", { roomId: sessionId, username, isTyping: false });
      isTyping = false;
    }, 1000);
  });
}

// ---------------------- HELPERS ----------------------

function addSystemMessage(text) {
  const chatMessages = document.getElementById("chat-messages");
  if (!chatMessages) return;

  const msg = document.createElement("div");
  msg.className = "system-message";
  msg.textContent = text;
  chatMessages.appendChild(msg);
}

function handleHostOption(path) {
  socket.emit("host-next-action", { path });

  // Redirect host immediately
  window.location.href = path;
}

// ---------------------- CLEANUP ----------------------

function cleanup() {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
}

window.cleanup = cleanup;

document.addEventListener("DOMContentLoaded", initializeSession);

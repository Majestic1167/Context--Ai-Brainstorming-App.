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

  /*
  socket.on("receive-idea", ({ word, username }) => {
    const div = document.createElement("div");
    div.className = "idea-entry";
    const p = document.createElement("p");
    p.innerHTML = `<span class="user"> ${username}</span>:<span class="useridea">  ${word}</span>`;
    div.innerHTML = p.innerHTML;
    ideasContainer?.appendChild(div);
  });*/

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

  /*
  socket.on("timer-finished", () => {
    alert("Time's up! The round has ended.");
  });*/

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

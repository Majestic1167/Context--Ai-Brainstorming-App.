import {
  addParticipantToDOM,
  removeParticipantFromDOM,
  renderParticipantsList,
} from "../js/ui.js";

// Socket.IO connection
let socket;

// Session variables
let sessionId;
let userId;
let username;

// Initialize session
function initializeSession() {
  const container = document.getElementById("joined-session-container");
  if (!container) return;

  sessionId = container.getAttribute("data-session-id");
  userId = container.getAttribute("data-user-id");
  username = container.getAttribute("data-username");

  if (!sessionId || !userId || !username) {
    console.error("Missing session or user data");
    return;
  }

  // Disconnect existing socket if any
  if (socket) {
    socket.disconnect();
  }

  // Create new socket connection
  socket = io({
    auth: {
      userId: userId,
      username: username,
    },
  });

  // Setup event listeners
  setupSocketListeners();

  // Join the session room
  socket.emit("join room", {
    roomId: sessionId,
    userId: userId,
    username: username,
  });
}

// Set up all socket event listeners
function setupSocketListeners() {
  let participants = []; // Initialize participant array

  socket.on("connect", () => {
    console.log(" Connected to socket server with ID:", socket.id);
  });

  // Chat message received
  socket.on("chat message", (data) => {
    const chatMessages = document.getElementById("chat-messages");
    if (chatMessages) {
      const messageElement = document.createElement("div");
      messageElement.className = "message";
      messageElement.innerHTML = `
        <strong>${data.username}</strong>: ${data.message}
        <small>${new Date(data.timestamp).toLocaleTimeString()}</small>
      `;
      chatMessages.appendChild(messageElement);
      chatMessages.scrollTo({
        top: chatMessages.scrollHeight,
        behavior: "smooth",
      });
    }
  });

  // User joined
  socket.on("user joined", (data) => {
    console.log("User joined:", data);
    participants.push(data); // still update the array
    addParticipantToDOM(data); // this internally updates participantCount and DOM

    const chatMessages = document.getElementById("chat-messages");
    if (chatMessages) {
      const msg = document.createElement("div");
      msg.className = "system-message";
      msg.textContent = `${data.username} has joined the session.`;
      chatMessages.appendChild(msg);
    }
  });

  socket.on("user left", (data) => {
    console.log("User left:", data);
    participants = participants.filter((p) => p.userId !== data.userId);
    removeParticipantFromDOM(data.username); // this also internally updates participantCount and DOM
  });

  socket.on("room participants", (newParticipants) => {
    console.log("Participants updated:", newParticipants);
    participants = newParticipants;
    renderParticipantsList(participants); // This handles count update too
  });

  // Typing notification
  socket.on("typing", (data) => {
    const typingIndicator = document.getElementById("typing-indicator");
    if (typingIndicator) {
      if (data.isTyping) {
        typingIndicator.textContent = `${data.username} is typing...`;
        typingIndicator.style.display = "block";
      } else {
        typingIndicator.style.display = "none";
      }
    }
  });

  socket.on("timer finished", function (data) {
    if (
      data.sessionId ===
      document.getElementById("joined-session-container").dataset.sessionId
    ) {
      alert("Time's up! The round has ended.");
    }
  });

  socket.on("next round", function (data) {
    if (
      data.sessionId ===
      document.getElementById("joined-session-container").dataset.sessionId
    ) {
      location.reload(); // Example: reload for a fresh start
    }
  });

  // Optional error logging
  socket.on("connect_error", (err) => {
    console.error("Socket connection error:", err);
  });
}

// Chat form handling
const chatForm = document.getElementById("chat-form");
const chatInput = document.getElementById("chat-input");

if (chatForm && chatInput) {
  chatForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const message = chatInput.value.trim();
    if (message && socket && socket.connected) {
      socket.emit("chat message", {
        roomId: sessionId,
        message: message,
        userId: userId,
        username: username,
      });
      chatInput.value = "";
    }
  });

  // Debounced typing notification
  let isTyping = false;
  let typingTimeout;

  chatInput.addEventListener("input", () => {
    if (!isTyping) {
      socket.emit("typing", {
        roomId: sessionId,
        username: username,
        isTyping: true,
      });
      isTyping = true;
    }

    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => {
      socket.emit("typing", {
        roomId: sessionId,
        username: username,
        isTyping: false,
      });
      isTyping = false;
    }, 1000);
  });
}

function cleanup() {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
}

document.getElementById("start-session-btn")?.addEventListener("click", () => {
  const sessionId = document
    .getElementById("start-session-btn")
    .getAttribute("data-session-id");

  // ✅ Emit to server that session has started
  socket.emit("start-session", { sessionId });

  // ✅ Redirect host immediately
  window.location.href = `/hoststartedsession?sessionId=${sessionId}`;
});

document.addEventListener("DOMContentLoaded", function () {
  const socket = io();

  socket.on("start timer", () => {
    startTimer(socket); // Now calling it from timer.js
  });

  const nextRoundBtn = document.getElementById("next-round-btn");
  if (nextRoundBtn) {
    nextRoundBtn.addEventListener("click", function () {
      socket.emit("next round", {
        sessionId: document.getElementById("joined-session-container").dataset
          .sessionId,
      });
    });
  }
});

// Export cleanup globally if needed
window.cleanup = cleanup;

document.addEventListener("DOMContentLoaded", initializeSession);

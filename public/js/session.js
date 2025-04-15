// Socket.IO connection
let socket;

// Session variables
let sessionId;
let userId;
let username;

// Initialize session
function initializeSession() {
  // Get data from HTML attributes
  const container = document.getElementById("joined-session-container");
  sessionId = container.getAttribute("data-session-id");
  userId = container.getAttribute("data-user-id");
  username = container.getAttribute("data-username");

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

  // Set up socket event listeners
  setupSocketListeners();

  // Join the session room
  socket.emit("join room", {
    roomId: sessionId,
    userId: userId,
    username: username,
  });
}

function setupSocketListeners() {
  // Handle incoming messages
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
      chatMessages.scrollTop = chatMessages.scrollHeight;
    }
  });

  // Handle user joining
  socket.on("user joined", (data) => {
    const participantsList = document.getElementById("participants-list");
    if (participantsList) {
      const participantElement = document.createElement("div");
      participantElement.className = "participant";
      participantElement.innerHTML = `
        <img src="/images/default-avatar.png" alt="Participant" class="participant-avatar">
        <div class="participant-info">
          <span class="username">${data.username}</span>
        </div>
      `;
      participantsList.appendChild(participantElement);
      updateParticipantCount();
    }
  });

  // Handle user leaving
  socket.on("user left", (data) => {
    const participantsList = document.getElementById("participants-list");
    if (participantsList) {
      const participantElements =
        participantsList.getElementsByClassName("participant");
      for (let element of participantElements) {
        if (element.querySelector(".username").textContent === data.username) {
          element.remove();
          break;
        }
      }
      updateParticipantCount();
    }
  });

  // Handle room participants update
  socket.on("room participants", (participants) => {
    const participantsList = document.getElementById("participants-list");
    if (participantsList) {
      participantsList.innerHTML = ""; // Clear existing participants
      participants.forEach((participant) => {
        const participantElement = document.createElement("div");
        participantElement.className = "participant";
        participantElement.innerHTML = `
          <img src="/images/default-avatar.png" alt="Participant" class="participant-avatar">
          <div class="participant-info">
            <span class="username">${participant.username}</span>
          </div>
        `;
        participantsList.appendChild(participantElement);
      });
      updateParticipantCount();
    }
  });

  // Handle typing notifications
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
}

// Update participant count
function updateParticipantCount() {
  const countElement = document.getElementById("participant-count");
  if (countElement) {
    const participants = document.getElementsByClassName("participant");
    countElement.textContent = participants.length;
  }
}

// Chat form handling
const chatForm = document.getElementById("chat-form");
const chatInput = document.getElementById("chat-input");

if (chatForm && chatInput) {
  chatForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const message = chatInput.value.trim();
    if (message) {
      socket.emit("chat message", {
        roomId: sessionId,
        message: message,
        userId: userId,
        username: username,
      });
      chatInput.value = "";
    }
  });

  // Typing indicator
  let typingTimeout;
  chatInput.addEventListener("input", () => {
    socket.emit("typing", {
      roomId: sessionId,
      username: username,
      isTyping: true,
    });

    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => {
      socket.emit("typing", {
        roomId: sessionId,
        username: username,
        isTyping: false,
      });
    }, 1000);
  });
}

// Clean up function
function cleanup() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

// Toggle Settings Menu Visibility
document.getElementById("settings-btn").addEventListener("click", function () {
  const settingsMenu = document.getElementById("settings-menu");
  settingsMenu.style.display =
    settingsMenu.style.display === "none" ? "block" : "none";
});

// Host-specific functionality for terminating and restarting session
document.getElementById("terminate-session").addEventListener("click", () => {
  socket.emit("terminate session", {
    sessionId: document.querySelector(".session-container").dataset.sessionId,
  });
});

document.getElementById("restart-session").addEventListener("click", () => {
  socket.emit("restart session", {
    sessionId: document.querySelector(".session-container").dataset.sessionId,
  });
});

// Export functions
window.cleanup = cleanup;

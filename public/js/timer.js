// timer.js
document.addEventListener("DOMContentLoaded", () => {
  const timerDisplay = document.getElementById("session-timer");
  if (!timerDisplay) return;

  // Optional: hide UI until session starts
  const chatSection = document.querySelector(".joined-chat-section");
  const ideaForm = document.getElementById("idea-form");
  const nextRoundBtn = document.getElementById("next-round-btn");
  const brainstorming = document.querySelector(".joined-brainstorming-section");

  if (chatSection) chatSection.style.display = "none";
  if (ideaForm) ideaForm.style.display = "none";
  if (nextRoundBtn) nextRoundBtn.style.display = "none";
  if (brainstorming) brainstorming.style.display = "none";

  // Listen to socket event and start the timer
  socket.on("session-started", ({ timer }) => {
    let timeLeft = timer || 90;

    const renderTime = (seconds) => {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      timerDisplay.textContent = `${mins}:${secs.toString().padStart(2, "0")}`;
    };

    renderTime(timeLeft); // Show initial

    const countdown = setInterval(() => {
      timeLeft--;
      if (timeLeft >= 0) {
        renderTime(timeLeft);
      } else {
        clearInterval(countdown);
        if (nextRoundBtn) nextRoundBtn.style.display = "block";

        // Notify server (optional)
        socket.emit("timer-finished");
      }
    }, 1000);
  });

  // Next Round button logic
  if (nextRoundBtn) {
    nextRoundBtn.addEventListener("click", () => {
      const sessionId = document.getElementById("joined-session-container")
        ?.dataset.sessionId;
      if (sessionId) {
        socket.emit("next round", { sessionId });
      }
    });
  }
});

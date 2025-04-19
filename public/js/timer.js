function startTimer(socket) {
  let timeLeft = 90;
  const timerElement = document.getElementById("session-timer");
  const chatInputSection = document.getElementById("chat-input-section");
  const nextRoundBtn = document.getElementById("next-round-btn");

  const timer = setInterval(() => {
    timeLeft--;
    if (timerElement) {
      const minutes = Math.floor(timeLeft / 60);
      const seconds = timeLeft % 60;
      timerElement.innerText = `${minutes}:${
        seconds < 10 ? "0" + seconds : seconds
      }`;
    }

    if (timeLeft <= 0) {
      clearInterval(timer);
      if (chatInputSection) chatInputSection.style.display = "none";
      if (nextRoundBtn) nextRoundBtn.style.display = "block";

      const sessionId = document.getElementById("joined-session-container")
        .dataset.sessionId;
      socket.emit("timer finished", { sessionId });
    }
  }, 1000);
}

document.addEventListener("DOMContentLoaded", function () {
    let timeLeft = 90; // 1 minute 30 seconds
    let timerElement = document.getElementById("timer");
    let chatInputSection = document.getElementById("chat-input-section");
    let nextRoundBtn = document.getElementById("next-round-btn");

    let timer = setInterval(() => {
        timeLeft--;
        if (timerElement) {
            timerElement.innerText = timeLeft;
        }

        if (timeLeft <= 0) {
            clearInterval(timer);
            if (chatInputSection) chatInputSection.style.display = "none"; // Hide chat input
            if (nextRoundBtn) nextRoundBtn.style.display = "block"; // Show Next Round button
        }
    }, 1000);
});

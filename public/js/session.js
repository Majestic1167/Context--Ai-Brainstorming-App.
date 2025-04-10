document.addEventListener("DOMContentLoaded", function () {
  const settingsBtn = document.getElementById("settings-btn");
  const settingsMenu = document.getElementById("settings-menu");
  const terminateButton = document.getElementById("terminate-session");
  const restartButton = document.getElementById("restart-session");

  // Toggle settings menu visibility
  if (settingsBtn) {
    settingsBtn.addEventListener("click", function (event) {
      event.stopPropagation();
      settingsMenu.classList.toggle("visible");
    });
  }

  // Terminate session handler
  if (terminateButton) {
    terminateButton.addEventListener("click", async function () {
      if (confirm("Are you sure you want to terminate this session?")) {
        try {
          const sessionId = document
            .querySelector("[data-session-id]")
            .getAttribute("data-session-id");

          const response = await fetch(`/terminate-session/${sessionId}`, {
            method: "DELETE",
          });

          const data = await response.json();

          if (response.ok) {
            alert("Session terminated successfully");
            window.location.href = "/loggedin"; // Redirect to home page
          } else {
            alert(data.message || "Failed to terminate session");
          }
        } catch (error) {
          console.error("Error:", error);
          alert("Failed to terminate session");
        }
      }
    });
  }

  // Restart session handler
  if (restartButton) {
    restartButton.addEventListener("click", function () {
      if (confirm("Are you sure you want to restart the session?")) {
        fetch("/restart-session", { method: "GET" })
          .then((response) => {
            if (response.ok) {
              window.location.href = "/create";
            } else {
              alert("Failed to restart session.");
            }
          })
          .catch(() => alert("Error restarting session."));
      }
    });
  }

  // Close settings menu if clicking outside
  document.addEventListener("click", function (event) {
    if (
      settingsMenu &&
      !settingsBtn.contains(event.target) &&
      !settingsMenu.contains(event.target)
    ) {
      settingsMenu.classList.remove("visible");
    }
  });
});

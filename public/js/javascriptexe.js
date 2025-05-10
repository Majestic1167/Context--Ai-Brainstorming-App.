document.addEventListener("DOMContentLoaded", () => {
  // Profile dropdown toggle
  const profileIcon = document.getElementById("profile-icon");
  const dropdownMenu = document.getElementById("dropdown-menu");
  if (profileIcon && dropdownMenu) {
    profileIcon.addEventListener("click", (event) => {
      event.stopPropagation();
      dropdownMenu.classList.toggle("hidden");
    });

    document.addEventListener("click", (event) => {
      if (
        !profileIcon.contains(event.target) &&
        !dropdownMenu.contains(event.target)
      ) {
        dropdownMenu.classList.add("hidden");
      }
    });
  }

  // Team member toggle
  const teamMembers = document.querySelectorAll(".team-member");
  teamMembers.forEach((member) => {
    member.addEventListener("click", () => {
      member.classList.toggle("active");
      teamMembers.forEach((other) => {
        if (other !== member) other.classList.remove("active");
      });
    });
  });

  // Settings modal
  const settingsBtn = document.getElementById("settings-btn");
  const closeSettingsBtn = document.getElementById("close-settings");
  const settingsModal = document.getElementById("settings-modal");
  const darkModeToggle = document.getElementById("dark-mode-toggle");

  if (settingsBtn && closeSettingsBtn && settingsModal) {
    settingsBtn.addEventListener("click", () => {
      settingsModal.style.display = "block";
    });

    closeSettingsBtn.addEventListener("click", () => {
      settingsModal.style.display = "none";
    });

    if (darkModeToggle) {
      darkModeToggle.addEventListener("change", () => {
        document.body.classList.toggle("dark-mode");
      });
    }
  }

  // Settings dropdown menu
  const settingsMenu = document.getElementById("settings-menu");
  const restartButton = document.getElementById("restart-session");

  if (settingsBtn && settingsMenu && restartButton) {
    settingsBtn.addEventListener("click", (event) => {
      event.stopPropagation();
      settingsMenu.classList.toggle("visible");
    });

    restartButton.addEventListener("click", () => {
      fetch("/restart-session", { method: "GET" })
        .then((response) => {
          if (response.ok) {
            window.location.href = "/create";
          } else {
            alert("Failed to restart session.");
          }
        })
        .catch(() => alert("Error restarting session."));
    });

    document.addEventListener("click", (event) => {
      if (
        !settingsBtn.contains(event.target) &&
        !settingsMenu.contains(event.target)
      ) {
        settingsMenu.classList.remove("visible");
      }
    });
  }

  // Project summary toggle
  const cards = document.querySelectorAll(".project-card");
  cards.forEach((card) => {
    card.addEventListener("click", () => {
      const details = card.querySelector(".project-details");
      if (details) {
        details.classList.toggle("show");
      }
    });
  });
});

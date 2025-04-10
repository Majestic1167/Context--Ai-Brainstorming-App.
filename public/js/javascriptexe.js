document.addEventListener("DOMContentLoaded", () => {
  const profileIcon = document.getElementById("profile-icon");
  const dropdownMenu = document.getElementById("dropdown-menu");

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
});

document.addEventListener("DOMContentLoaded", () => {
  const teamMembers = document.querySelectorAll(".team-member");

  teamMembers.forEach((member) => {
    member.addEventListener("click", () => {
      // Toggle the 'active' class on the clicked member
      member.classList.toggle("active");

      // Optionally, close other members' details
      teamMembers.forEach((otherMember) => {
        if (otherMember !== member) {
          otherMember.classList.remove("active");
        }
      });
    });
  });
});

document.addEventListener("DOMContentLoaded", function () {
  const settingsBtn = document.getElementById("settings-btn");
  const closeSettingsBtn = document.getElementById("close-settings");
  const settingsModal = document.getElementById("settings-modal");
  const darkModeToggle = document.getElementById("dark-mode-toggle");

  // Open modal
  settingsBtn.addEventListener("click", function () {
    settingsModal.style.display = "block";
  });

  // Close modal
  closeSettingsBtn.addEventListener("click", function () {
    settingsModal.style.display = "none";
  });

  // Dark mode toggle
  darkModeToggle.addEventListener("change", function () {
    document.body.classList.toggle("dark-mode");
  });
});

document.addEventListener("DOMContentLoaded", function () {
  const settingsBtn = document.getElementById("settings-btn");
  const settingsMenu = document.getElementById("settings-menu");
  const restartButton = document.getElementById("restart-session");

  // Toggle settings menu visibility
  settingsBtn.addEventListener("click", function (event) {
    event.stopPropagation(); // Prevent clicking on the button from closing the menu immediately
    settingsMenu.classList.toggle("visible");
  });

  // Restart session button
  restartButton.addEventListener("click", function () {
    // Send a request to the server to render create.ejs
    fetch("/restart-session", { method: "GET" })
      .then((response) => {
        if (response.ok) {
          window.location.href = "/create"; // Redirect to the /create route
        } else {
          alert("Failed to restart session.");
        }
      })
      .catch(() => alert("Error restarting session."));
  });

  // Close settings menu if clicking outside
  document.addEventListener("click", function (event) {
    if (
      !settingsBtn.contains(event.target) &&
      !settingsMenu.contains(event.target)
    ) {
      settingsMenu.classList.remove("visible");
    }
  });
});

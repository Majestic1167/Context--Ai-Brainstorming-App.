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

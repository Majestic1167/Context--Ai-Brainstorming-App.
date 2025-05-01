// public/js/ui.js

let participantCount = 0;

export function updateParticipantCount(count) {
  const countEl = document.getElementById("participant-count");
  if (countEl) {
    countEl.textContent = count;
  } else {
    console.warn("Could not find #participant-count in DOM.");
  }
}

/**
 * renderParticipantsList
 * ----------------------
 * Clears out the current list and re‑renders it
 * from the server's participants array.
 */
export function renderParticipantsList(data) {
  const listEl = document.getElementById("participants-list");
  if (!listEl) return;

  const participants = Array.isArray(data) ? data : data.participants || [];

  // Keep the host element; only remove other participants
  listEl
    .querySelectorAll(".participant:not(.host)")
    .forEach((el) => el.remove());

  let count = 1; // start from 1 for the host
  participants.forEach((p) => {
    if (p.isHost) {
      const hostImg = listEl.querySelector(".participant.host img");
      if (hostImg && p.profilePicture) {
        hostImg.src = p.profilePicture;
      }
      return;
    }

    const profileSrc = p.profilePicture?.trim()
      ? p.profilePicture
      : "/images/profilepictures/default.jpg";

    const item = document.createElement("div");
    item.className = "participant";
    item.innerHTML = `
      <img 
        src="${profileSrc}" 
        onerror="this.onerror=null;this.src='/images/profilepictures/default.jpg';" 
        alt="${p.username}" 
        class="participant-avatar"
      >
      <span class="username">${p.username}</span>
    `;
    listEl.appendChild(item);
    count++;
  });

  updateParticipantCount(count);
}

/**
 * addParticipantToDOM
 * -------------------
 * Appends a single participant if they're not already in the list.
 */
export function addParticipantToDOM(participant) {
  const listEl = document.getElementById("participants-list");
  if (!listEl) return;

  const exists = Array.from(listEl.getElementsByClassName("username")).some(
    (el) => el.textContent === participant.username
  );
  if (exists) return;

  const profileImage = participant.profilePicture?.trim()
    ? participant.profilePicture
    : "/images/profilepictures/default.jpg";

  const item = document.createElement("div");
  item.className = `participant ${participant.isHost ? "host" : ""}`;
  item.innerHTML = `
    <img 
      src="${profileImage}" 
      alt="${participant.username}" 
      class="participant-avatar"
      onerror="this.onerror=null;this.src='/images/profilepictures/default.jpg';"
    >
    <div class="participant-info">
      <span class="username">${participant.username}</span>
      ${participant.isHost ? '<span class="host-badge">Host</span>' : ""}
    </div>
  `;
  listEl.appendChild(item);

  participantCount++;
  updateParticipantCount(participantCount);
}

/**
 * removeParticipantFromDOM
 * ------------------------
 * Removes any participant whose username matches.
 */
export function removeParticipantFromDOM(username) {
  const listEl = document.getElementById("participants-list");
  if (!listEl) return;

  const participants = Array.from(listEl.getElementsByClassName("participant"));

  participants.forEach((participantEl) => {
    const nameSpan = participantEl.querySelector(".username");
    if (nameSpan && nameSpan.textContent === username) {
      participantEl.remove();
      participantCount--;
      updateParticipantCount(participantCount);
    }
  });
}

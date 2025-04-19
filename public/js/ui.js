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

  // clear existing items
  listEl.querySelectorAll(".participant").forEach((el) => el.remove());

  // Determine array structure
  const participants = Array.isArray(data) ? data : data.participants || [];

  // reset internal count
  participantCount = participants.length;

  // render each participant
  participants.forEach((p) => {
    const item = document.createElement("div");
    item.className = `participant ${p.isHost ? "host" : ""}`;
    item.innerHTML = `
      <img src="/images/default-avatar.png" alt="Avatar" class="participant-avatar">
      <div class="participant-info">
        <span class="username">${p.username}</span>
        ${p.isHost ? '<span class="host-badge">Host</span>' : ""}
      </div>
    `;
    listEl.appendChild(item);
  });

  updateParticipantCount(participantCount);
}

/**
 * addParticipantToDOM
 * -------------------
 * Appends a single participant if they're not already in the list.
 */
export function addParticipantToDOM(participant) {
  const listEl = document.getElementById("participants-list");
  if (!listEl) return;

  // avoid duplicates
  const exists = Array.from(listEl.getElementsByClassName("username")).some(
    (el) => el.textContent === participant.username
  );
  if (exists) return;

  const item = document.createElement("div");
  item.className = `participant ${participant.isHost ? "host" : ""}`;
  item.innerHTML = `
    <img src="/images/default-avatar.png" alt="Avatar" class="participant-avatar">
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

document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  // Modal behavior
  const modal = document.getElementById("activity-modal");
  const modalTitle = document.getElementById("modal-title");
  const modalBody = document.getElementById("modal-body");
  const modalClose = document.getElementById("modal-close");

  function openModal(title, bodyHtml) {
    modalTitle.textContent = title;
    modalBody.innerHTML = bodyHtml;
    modal.classList.add("open");
  }

  function closeModal() {
    modal.classList.remove("open");
  }

  modalClose.addEventListener("click", closeModal);
  modal.addEventListener("click", (e) => {
    if (e.target === modal) {
      closeModal();
    }
  });

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - details.participants.length;

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <div class="participants">
            <p><strong>Participants:</strong></p>
            ${details.participants.length > 0 ? `
              <ul class="participants-list">
                ${details.participants.map((participant) => `<li><span>${participant}</span><button class="delete-participant" data-activity="${encodeURIComponent(name)}" data-email="${encodeURIComponent(participant)}" title="Remove participant">✕</button></li>`).join('')}
              </ul>
            ` : '<p class="no-participants">No participants yet</p>'}
          </div>
        `;

        activitiesList.appendChild(activityCard);

        activityCard.addEventListener("click", (evt) => {
          if (evt.target.closest(".delete-participant")) {
            return;
          }

          const participantHtml = details.participants.length
            ? `<ul>${details.participants.map((p) => `<li>${p}</li>`).join("")}</ul>`
            : "<p class='no-participants'>No participants yet</p>";

          const body = `
            <p><strong>Description:</strong> ${details.description}</p>
            <p><strong>Schedule:</strong> ${details.schedule}</p>
            <p><strong>Max participants:</strong> ${details.max_participants}</p>
            <p><strong>Signed Up:</strong> ${details.participants.length}</p>
            <p><strong>Remaining Spots:</strong> ${Math.max(0, details.max_participants - details.participants.length)}</p>
            <div class="modal-participants">
              <h4>Participants</h4>
              ${participantHtml}
            </div>
          `;

          openModal(name, body);
        });

        activityCard.querySelectorAll(".delete-participant").forEach((button) => {
          button.addEventListener("click", async () => {
            const activityName = decodeURIComponent(button.dataset.activity);
            const participantEmail = decodeURIComponent(button.dataset.email);

            try {
              const response = await fetch(
                `/activities/${encodeURIComponent(activityName)}/participants?email=${encodeURIComponent(participantEmail)}`,
                { method: "DELETE" }
              );

              if (!response.ok) {
                const data = await response.json();
                throw new Error(data.detail || "Could not remove participant");
              }

              messageDiv.textContent = `${participantEmail} was removed from ${activityName}`;
              messageDiv.className = "success";
              messageDiv.classList.remove("hidden");

              setTimeout(() => {
                messageDiv.classList.add("hidden");
              }, 5000);

              fetchActivities();
            } catch (error) {
              messageDiv.textContent = error.message || "Failed to remove participant.";
              messageDiv.className = "error";
              messageDiv.classList.remove("hidden");
              console.error("Error removing participant:", error);
            }
          });
        });

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();
        await fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  fetchActivities();
});

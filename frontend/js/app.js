/**
 * Zenith '26 College Fest Management System
 * Student Event Portal (app.js)
 */

document.addEventListener("DOMContentLoaded", () => {
  // State variables
  let currentCategory = "All";
  let searchDebounceTimer = null;
  let activeEventData = null;

  // DOM Elements
  const eventsGrid = document.getElementById("events-grid");
  const loadingState = document.getElementById("loading-state");
  const errorState = document.getElementById("error-state");
  const errorMessage = document.getElementById("error-message");
  const emptyState = document.getElementById("empty-state");
  const retryBtn = document.getElementById("retry-btn");
  const resetFiltersBtn = document.getElementById("reset-filters-btn");
  const searchInput = document.getElementById("search-input");
  const clearSearchBtn = document.getElementById("clear-search-btn");
  const categoryFilters = document.getElementById("category-filters");
  const eventStatsCounter = document.getElementById("event-stats-counter");

  // Modal Elements
  const modal = document.getElementById("registration-modal");
  const closeModalBtn = document.getElementById("close-modal-btn");
  const cancelModalBtn = document.getElementById("cancel-modal-btn");
  const modalEventIcon = document.getElementById("modal-event-icon");
  const modalEventTitle = document.getElementById("modal-event-title");
  const modalEventCategory = document.getElementById("modal-event-category");
  const modalEventFee = document.getElementById("modal-event-fee");
  const modalEventDesc = document.getElementById("modal-event-description");
  const modalEventTime = document.getElementById("modal-event-time");
  const modalEventVenue = document.getElementById("modal-event-venue");
  const modalEventSeats = document.getElementById("modal-event-seats");
  const modalSeatPill = document.getElementById("modal-seat-pill");
  const modalAlertBox = document.getElementById("modal-alert-box");
  const modalAlertIcon = document.getElementById("modal-alert-icon");
  const modalAlertText = document.getElementById("modal-alert-text");
  const registrationForm = document.getElementById("registration-form");
  const formEventId = document.getElementById("form-event-id");
  const submitRegisterBtn = document.getElementById("submit-register-btn");
  const btnText = document.getElementById("btn-text");
  const btnSpinner = document.getElementById("btn-spinner");

  // Error label elements
  const errStudentName = document.getElementById("err-student-name");
  const errRollNumber = document.getElementById("err-roll-number");
  const errEmail = document.getElementById("err-email");
  const errPhone = document.getElementById("err-phone");

  // Category Badges & Color Palette
  const categoryStyles = {
    Technical: {
      badge: "bg-cyan-950/70 text-cyan-300 border-cyan-800",
      accent: "from-cyan-500/20 to-blue-500/5",
    },
    Cultural: {
      badge: "bg-fuchsia-950/70 text-fuchsia-300 border-fuchsia-800",
      accent: "from-fuchsia-500/20 to-pink-500/5",
    },
    Sports: {
      badge: "bg-emerald-950/70 text-emerald-300 border-emerald-800",
      accent: "from-emerald-500/20 to-teal-500/5",
    },
    Gaming: {
      badge: "bg-rose-950/70 text-rose-300 border-rose-800",
      accent: "from-rose-500/20 to-orange-500/5",
    },
    Workshop: {
      badge: "bg-amber-950/70 text-amber-300 border-amber-800",
      accent: "from-amber-500/20 to-yellow-500/5",
    },
    Default: {
      badge: "bg-slate-800 text-slate-300 border-slate-700",
      accent: "from-slate-800 to-slate-900",
    },
  };

  /**
   * Fetch events with current search and category filter params
   */
  async function fetchEvents() {
    showLoading();

    const params = new URLSearchParams();
    if (currentCategory && currentCategory !== "All") {
      params.append("category", currentCategory);
    }
    const query = searchInput.value.trim();
    if (query) {
      params.append("search", query);
      clearSearchBtn.classList.remove("hidden");
    } else {
      clearSearchBtn.classList.add("hidden");
    }

    const url = `/api/events${params.toString() ? "?" + params.toString() : ""}`;

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Server returned status ${response.status}: ${response.statusText}`);
      }
      const events = await response.json();
      renderEvents(events);
    } catch (err) {
      console.error("Error fetching events:", err);
      showError(err.message || "Failed to reach backend server. Please check that FastAPI is running.");
    }
  }

  /**
   * Render event cards into #events-grid
   */
  function renderEvents(events) {
    hideAllStates();

    if (!events || events.length === 0) {
      emptyState.classList.remove("hidden");
      eventStatsCounter.textContent = "0 events found";
      return;
    }

    eventStatsCounter.textContent = `Showing ${events.length} event${events.length === 1 ? "" : "s"}`;
    eventsGrid.innerHTML = "";

    events.forEach((event, idx) => {
      const isFull = event.available_seats <= 0;
      const catStyle = categoryStyles[event.category] || categoryStyles.Default;

      const card = document.createElement("div");
      card.className = "card-fade bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 hover:border-violet-500/50 rounded-2xl p-5 shadow-lg hover:shadow-violet-500/10 transition-all duration-300 flex flex-col justify-between group";
      card.style.animationDelay = `${idx * 40}ms`;

      // Header row with Icon, Category badge, and Fee/Status
      card.innerHTML = `
        <div>
          <div class="flex items-start justify-between gap-3 mb-4">
            <div class="flex items-center gap-3">
              <span class="text-3xl p-2.5 rounded-xl bg-slate-900 border border-slate-700/80 group-hover:scale-110 transition-transform duration-200">
                ${event.icon || "⚡"}
              </span>
              <div>
                <span class="inline-block text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${catStyle.badge}">
                  ${event.category}
                </span>
                <div class="text-[11px] text-slate-400 mt-0.5 font-medium flex items-center gap-1">
                  <span>📅 ${formatDate(event.event_date)} • ${event.event_time}</span>
                </div>
              </div>
            </div>

            ${isFull ? `
              <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-black bg-rose-950/80 text-rose-300 border border-rose-700/80 tracking-wide animate-pulse">
                FULL
              </span>
            ` : `
              <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${event.fee > 0 ? 'bg-amber-950/70 text-amber-300 border border-amber-800' : 'bg-slate-900 text-emerald-400 border border-emerald-800/50'}">
                ${event.fee > 0 ? `₹${event.fee}` : 'FREE'}
              </span>
            `}
          </div>

          <h3 class="text-lg font-bold text-white group-hover:text-violet-300 transition-colors line-clamp-1 mb-2">
            ${escapeHTML(event.title)}
          </h3>

          <p class="text-xs text-slate-300/90 line-clamp-2 leading-relaxed mb-4 font-normal">
            ${escapeHTML(event.description || "Exciting college fest event — participate and win certificates!")}
          </p>
        </div>

        <div class="pt-4 border-t border-slate-700/60 mt-auto space-y-3">
          <div class="flex items-center justify-between text-xs">
            <span class="text-slate-400 flex items-center gap-1.5 font-medium">
              📍 <span class="truncate max-w-[130px] sm:max-w-[150px]">${escapeHTML(event.venue)}</span>
            </span>
            <div class="text-right">
              ${isFull ? `
                <span class="text-rose-400 font-bold text-[11px]">0 seats left</span>
              ` : `
                <span class="text-emerald-400 font-semibold text-[11px]">${event.available_seats} / ${event.capacity} seats left</span>
              `}
            </div>
          </div>

          <!-- Capacity Bar -->
          <div class="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
            <div 
              class="h-full rounded-full transition-all duration-500 ${isFull ? 'bg-rose-500' : (event.available_seats / event.capacity < 0.2 ? 'bg-amber-400' : 'bg-violet-500')}"
              style="width: ${Math.min(100, Math.round(((event.capacity - event.available_seats) / event.capacity) * 100))}%"
            ></div>
          </div>

          <button 
            data-event-id="${event.id}" 
            class="view-details-btn w-full mt-2 py-2.5 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm active:scale-95 ${
              isFull 
                ? 'bg-slate-700/60 hover:bg-slate-700 text-slate-300 border border-slate-600' 
                : 'bg-violet-600 hover:bg-violet-500 text-white shadow-violet-600/20'
            }"
          >
            <span>View Details</span>
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      `;

      eventsGrid.appendChild(card);
    });

    // Attach click listeners to "View Details" buttons
    document.querySelectorAll(".view-details-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const eventId = btn.getAttribute("data-event-id");
        openEventModal(eventId);
      });
    });
  }

  /**
   * Open detail modal and fetch live event details
   */
  async function openEventModal(eventId) {
    resetModalForm();
    formEventId.value = eventId;
    modal.classList.remove("hidden");
    document.body.classList.add("overflow-hidden");

    try {
      const response = await fetch(`/api/events/${eventId}`);
      if (!response.ok) {
        throw new Error("Unable to fetch event details.");
      }
      activeEventData = await response.json();
      populateModal(activeEventData);
    } catch (err) {
      console.error("Modal fetch error:", err);
      showModalAlert(err.message || "Failed to load event details.", "error");
    }
  }

  /**
   * Populate modal with event data
   */
  function populateModal(event) {
    modalEventIcon.textContent = event.icon || "⚡";
    modalEventTitle.textContent = event.title;
    modalEventCategory.textContent = event.category;
    modalEventFee.textContent = event.fee > 0 ? `Fee: ₹${event.fee}` : "Free Entry";
    modalEventDesc.textContent = event.description || "Join us for this premier Zenith '26 fest event!";
    modalEventTime.textContent = `${formatDate(event.event_date)}, ${event.event_time}`;
    modalEventVenue.textContent = event.venue;

    const isFull = event.available_seats <= 0;
    if (isFull) {
      modalEventSeats.textContent = `0 / ${event.capacity} remaining`;
      modalEventSeats.className = "text-rose-400 font-bold";
      modalSeatPill.innerHTML = `
        <span class="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-rose-950 text-rose-300 border border-rose-800">
          EVENT FULL
        </span>
      `;
      submitRegisterBtn.disabled = true;
      submitRegisterBtn.classList.add("opacity-50", "cursor-not-allowed");
      btnText.textContent = "Registration Closed (Full)";
    } else {
      modalEventSeats.textContent = `${event.available_seats} / ${event.capacity} seats remaining`;
      modalEventSeats.className = "text-emerald-400 font-bold";
      modalSeatPill.innerHTML = `
        <span class="px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase bg-emerald-950 text-emerald-300 border border-emerald-800">
          Seats Open
        </span>
      `;
      submitRegisterBtn.disabled = false;
      submitRegisterBtn.classList.remove("opacity-50", "cursor-not-allowed");
      btnText.textContent = "Confirm Registration";
    }
  }

  /**
   * Handle form submission for registering
   */
  registrationForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearFieldErrors();
    hideModalAlert();

    const eventId = formEventId.value;
    const studentName = document.getElementById("student-name").value.trim();
    const rollNumber = document.getElementById("roll-number").value.trim();
    const email = document.getElementById("email").value.trim();
    const phone = document.getElementById("phone").value.trim();

    // Client-side validation checks
    let hasClientError = false;
    if (!studentName) {
      showFieldError(errStudentName, "Please enter your full name.");
      hasClientError = true;
    }
    if (!rollNumber) {
      showFieldError(errRollNumber, "Please enter your roll number.");
      hasClientError = true;
    }
    if (!email || !email.includes("@")) {
      showFieldError(errEmail, "Please enter a valid email address (must include '@').");
      hasClientError = true;
    }

    if (hasClientError) return;

    // Submit payload to server
    setSubmitting(true);

    try {
      const response = await fetch(`/api/events/${eventId}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          student_name: studentName,
          roll_number: rollNumber,
          email: email,
          phone: phone || null,
        }),
      });

      const data = await response.json();

      if (response.status === 201) {
        // Registration successful
        const eventTitle = activeEventData ? activeEventData.title : "Event";
        showModalAlert(
          `🎉 Registered successfully for ${eventTitle}! Registration ID: #${data.id}`,
          "success"
        );
        submitRegisterBtn.disabled = true;

        // Re-fetch event data to update seat count in modal and grid
        setTimeout(async () => {
          await fetchEvents();
          if (modal.classList.contains("hidden") === false) {
            const updated = await fetch(`/api/events/${eventId}`);
            if (updated.ok) {
              populateModal(await updated.json());
            }
          }
        }, 300);

        // Auto close after 2.5 seconds
        setTimeout(() => {
          closeEventModal();
        }, 2200);

      } else {
        // Handled 400 or 409 error from server
        const errorDetail = data.detail || "Registration could not be completed.";
        showModalAlert(errorDetail, "error");
      }
    } catch (err) {
      console.error("Registration request failed:", err);
      showModalAlert("Network error. Unable to reach registration server.", "error");
    } finally {
      setSubmitting(false);
    }
  });

  /**
   * Modal and helper functions
   */
  function closeEventModal() {
    modal.classList.add("hidden");
    document.body.classList.remove("overflow-hidden");
    resetModalForm();
  }

  function resetModalForm() {
    registrationForm.reset();
    clearFieldErrors();
    hideModalAlert();
    submitRegisterBtn.disabled = false;
    submitRegisterBtn.classList.remove("opacity-50", "cursor-not-allowed");
    btnText.textContent = "Confirm Registration";
    activeEventData = null;
  }

  function showModalAlert(msg, type = "error") {
    modalAlertBox.classList.remove("hidden", "bg-rose-950/80", "border-rose-800", "text-rose-200", "bg-emerald-950/80", "border-emerald-800", "text-emerald-200");
    if (type === "success") {
      modalAlertBox.classList.add("bg-emerald-950/80", "border-emerald-800", "text-emerald-200");
      modalAlertIcon.textContent = "✅";
    } else {
      modalAlertBox.classList.add("bg-rose-950/80", "border-rose-800", "text-rose-200");
      modalAlertIcon.textContent = "⚠️";
    }
    modalAlertText.textContent = msg;
  }

  function hideModalAlert() {
    modalAlertBox.classList.add("hidden");
  }

  function showFieldError(el, msg) {
    el.textContent = msg;
    el.classList.remove("hidden");
  }

  function clearFieldErrors() {
    [errStudentName, errRollNumber, errEmail, errPhone].forEach((el) => {
      el.textContent = "";
      el.classList.add("hidden");
    });
  }

  function setSubmitting(isSubmitting) {
    if (isSubmitting) {
      submitRegisterBtn.disabled = true;
      btnSpinner.classList.remove("hidden");
      btnText.textContent = "Processing...";
    } else {
      btnSpinner.classList.add("hidden");
    }
  }

  // Close modal event listeners
  closeModalBtn.addEventListener("click", closeEventModal);
  cancelModalBtn.addEventListener("click", closeEventModal);
  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeEventModal();
  });
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !modal.classList.contains("hidden")) {
      closeEventModal();
    }
  });

  // Category filter buttons
  categoryFilters.addEventListener("click", (e) => {
    const btn = e.target.closest(".filter-btn");
    if (!btn) return;

    const category = btn.getAttribute("data-category");
    currentCategory = category;

    // Update active button styling
    document.querySelectorAll(".filter-btn").forEach((b) => {
      b.classList.remove("active-category", "bg-violet-600", "text-white", "border-violet-500");
      b.classList.add("inactive-category", "bg-slate-800/80", "text-slate-300", "border-slate-700");
    });
    btn.classList.add("active-category", "bg-violet-600", "text-white", "border-violet-500");
    btn.classList.remove("inactive-category", "bg-slate-800/80", "text-slate-300", "border-slate-700");

    fetchEvents();
  });

  // Search input with debounce
  searchInput.addEventListener("input", () => {
    clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(() => {
      fetchEvents();
    }, 280);
  });

  clearSearchBtn.addEventListener("click", () => {
    searchInput.value = "";
    clearSearchBtn.classList.add("hidden");
    fetchEvents();
  });

  retryBtn.addEventListener("click", fetchEvents);
  resetFiltersBtn.addEventListener("click", () => {
    currentCategory = "All";
    searchInput.value = "";
    clearSearchBtn.classList.add("hidden");
    document.querySelectorAll(".filter-btn").forEach((b) => {
      if (b.getAttribute("data-category") === "All") {
        b.classList.add("active-category", "bg-violet-600", "text-white", "border-violet-500");
        b.classList.remove("inactive-category", "bg-slate-800/80", "text-slate-300", "border-slate-700");
      } else {
        b.classList.remove("active-category", "bg-violet-600", "text-white", "border-violet-500");
        b.classList.add("inactive-category", "bg-slate-800/80", "text-slate-300", "border-slate-700");
      }
    });
    fetchEvents();
  });

  // Helper State management
  function showLoading() {
    hideAllStates();
    loadingState.classList.remove("hidden");
  }

  function showError(msg) {
    hideAllStates();
    errorMessage.textContent = msg;
    errorState.classList.remove("hidden");
    eventStatsCounter.textContent = "Error loading events";
  }

  function hideAllStates() {
    loadingState.classList.add("hidden");
    errorState.classList.add("hidden");
    emptyState.classList.add("hidden");
    eventsGrid.innerHTML = "";
  }

  function formatDate(isoStr) {
    if (!isoStr) return "";
    try {
      const parts = isoStr.split("-");
      if (parts.length === 3) {
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const month = months[parseInt(parts[1], 10) - 1] || parts[1];
        return `${parts[2]} ${month} ${parts[0]}`;
      }
      return isoStr;
    } catch {
      return isoStr;
    }
  }

  function escapeHTML(str) {
    if (!str) return "";
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // Initial load
  fetchEvents();
});

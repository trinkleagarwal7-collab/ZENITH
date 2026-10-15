/**
 * Zenith '26 College Fest Management System
 * Admin Dashboard & Management (admin.js)
 */

document.addEventListener("DOMContentLoaded", () => {
  // Elements
  const adminLoading = document.getElementById("admin-loading");
  const adminError = document.getElementById("admin-error");
  const adminErrorText = document.getElementById("admin-error-text");
  const adminRetryBtn = document.getElementById("admin-retry-btn");
  const dashboardContent = document.getElementById("dashboard-content");
  const refreshDashboardBtn = document.getElementById("refresh-dashboard-btn");
  const refreshIcon = document.getElementById("refresh-icon");

  // Stat Card Elements
  const statTotalEvents = document.getElementById("stat-total-events");
  const statTotalRegistrations = document.getElementById("stat-total-registrations");
  const statUtilizationPct = document.getElementById("stat-utilization-pct");
  const statCapacitySubtext = document.getElementById("stat-capacity-subtext");
  const statUpcomingEvents = document.getElementById("stat-upcoming-events");
  const categoryBreakdownContainer = document.getElementById("category-breakdown-container");

  // Tabs
  const tabEventsBtn = document.getElementById("tab-events-btn");
  const tabRegistrationsBtn = document.getElementById("tab-registrations-btn");
  const tabEventsView = document.getElementById("tab-events-view");
  const tabRegistrationsView = document.getElementById("tab-registrations-view");
  const tabEventsBadge = document.getElementById("tab-events-badge");
  const tabRegBadge = document.getElementById("tab-reg-badge");

  // Tables
  const eventsTableBody = document.getElementById("events-table-body");
  const registrationsTableBody = document.getElementById("registrations-table-body");
  const filterRegEvent = document.getElementById("filter-reg-event");
  const regCountLabel = document.getElementById("reg-count-label");
  const noRegistrationsMsg = document.getElementById("no-registrations-msg");

  // Add Event Modal (Stretch Goal)
  const openAddEventBtn = document.getElementById("open-add-event-btn");
  const closeAddEventBtn = document.getElementById("close-add-event-btn");
  const cancelAddEventBtn = document.getElementById("cancel-add-event-btn");
  const addEventModal = document.getElementById("add-event-modal");
  const addEventForm = document.getElementById("add-event-form");
  const addEventAlert = document.getElementById("add-event-alert");

  let cachedEventsList = [];

  /**
   * Initialize and Load Dashboard Data
   */
  async function loadDashboard() {
    showLoading();
    refreshIcon.classList.add("animate-spin");

    try {
      // Parallel fetch of stats and events
      const [statsRes, eventsRes] = await Promise.all([
        fetch("/api/stats"),
        fetch("/api/events"),
      ]);

      if (!statsRes.ok || !eventsRes.ok) {
        throw new Error("Failed to load statistics or event data from server.");
      }

      const stats = await statsRes.json();
      const events = await eventsRes.json();
      cachedEventsList = events;

      renderStats(stats);
      renderCategoryBreakdown(stats.events_by_category);
      renderEventsTable(events);
      populateEventFilterDropdown(events);

      // If registrations tab is active, load registrations too
      if (!tabRegistrationsView.classList.contains("hidden")) {
        await loadRegistrations();
      }

      showContent();
    } catch (err) {
      console.error("Admin dashboard load error:", err);
      showError(err.message || "Unable to communicate with the FastAPI backend.");
    } finally {
      refreshIcon.classList.remove("animate-spin");
    }
  }

  /**
   * Render Top 4 Metric Cards
   */
  function renderStats(stats) {
    statTotalEvents.textContent = stats.total_events;
    statTotalRegistrations.textContent = stats.total_registrations;
    statUtilizationPct.textContent = `${stats.overall_utilization_pct}%`;
    statCapacitySubtext.textContent = `${stats.total_registrations} of ${stats.total_capacity} capacity utilized`;
    statUpcomingEvents.textContent = stats.upcoming_events_count;
    tabEventsBadge.textContent = stats.total_events;
    tabRegBadge.textContent = stats.total_registrations;
  }

  /**
   * Render Category Distribution Pills
   */
  function renderCategoryBreakdown(categories) {
    categoryBreakdownContainer.innerHTML = "";
    if (!categories || Object.keys(categories).length === 0) {
      categoryBreakdownContainer.innerHTML = '<span class="text-xs text-slate-400">No category data.</span>';
      return;
    }

    const catColors = {
      Technical: "bg-cyan-950/70 text-cyan-300 border-cyan-800",
      Cultural: "bg-fuchsia-950/70 text-fuchsia-300 border-fuchsia-800",
      Sports: "bg-emerald-950/70 text-emerald-300 border-emerald-800",
      Gaming: "bg-rose-950/70 text-rose-300 border-rose-800",
      Workshop: "bg-amber-950/70 text-amber-300 border-amber-800",
    };

    Object.entries(categories).forEach(([cat, count]) => {
      const colorClass = catColors[cat] || "bg-slate-800 text-slate-300 border-slate-700";
      const pill = document.createElement("div");
      pill.className = `flex items-center gap-2 px-3.5 py-1.5 rounded-xl border text-xs font-semibold ${colorClass}`;
      pill.innerHTML = `
        <span>${getCategoryIcon(cat)}</span>
        <span>${escapeHTML(cat)}:</span>
        <span class="font-black px-1.5 py-0.5 rounded-md bg-black/30">${count}</span>
      `;
      categoryBreakdownContainer.appendChild(pill);
    });
  }

  /**
   * Render Events Table Sorted by Utilization % Descending
   */
  function renderEventsTable(events) {
    eventsTableBody.innerHTML = "";

    // Calculate utilization percentage and attach to each event object
    const processed = events.map((ev) => {
      const registered = ev.capacity - ev.available_seats;
      const utilPct = ev.capacity > 0 ? (registered / ev.capacity) * 100 : 0;
      return {
        ...ev,
        registered,
        utilPct: Math.round(utilPct * 10) / 10,
      };
    });

    // Sort by utilization percentage descending (highest first)
    processed.sort((a, b) => b.utilPct - a.utilPct);

    processed.forEach((ev) => {
      const isHighDemand = ev.utilPct >= 90;
      const row = document.createElement("tr");
      row.className = `hover:bg-slate-800/60 transition ${isHighDemand ? "bg-amber-950/20" : ""}`;

      row.innerHTML = `
        <td class="py-3 px-4 font-semibold text-white flex items-center gap-2.5">
          <span class="text-xl">${ev.icon || "⚡"}</span>
          <div>
            <div class="font-bold">${escapeHTML(ev.title)}</div>
            <div class="text-[11px] text-slate-400 font-normal">ID: #${ev.id}</div>
          </div>
        </td>
        <td class="py-3 px-4">
          <span class="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-800 border border-slate-700 text-slate-300">
            ${escapeHTML(ev.category)}
          </span>
        </td>
        <td class="py-3 px-4 text-slate-300">
          <div>${ev.event_date}</div>
          <div class="text-[11px] text-slate-400">${ev.event_time}</div>
        </td>
        <td class="py-3 px-4 text-slate-300">${escapeHTML(ev.venue)}</td>
        <td class="py-3 px-4 text-center">
          <span class="font-mono font-bold ${ev.registered >= ev.capacity ? 'text-rose-400' : 'text-slate-200'}">
            ${ev.registered} / ${ev.capacity}
          </span>
        </td>
        <td class="py-3 px-4 text-right">
          <div class="flex items-center justify-end gap-2">
            ${isHighDemand ? `
              <span class="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse">
                ${ev.utilPct >= 100 ? 'FULL (100%)' : '≥90% HIGH'}
              </span>
            ` : ""}
            <span class="font-mono font-black ${isHighDemand ? 'text-amber-400' : 'text-slate-300'}">
              ${ev.utilPct.toFixed(1)}%
            </span>
          </div>
        </td>
      `;

      eventsTableBody.appendChild(row);
    });
  }

  /**
   * Load and Render Registrations
   */
  async function loadRegistrations() {
    registrationsTableBody.innerHTML = `
      <tr><td colspan="8" class="text-center py-6 text-slate-400">Loading registrations...</td></tr>
    `;
    noRegistrationsMsg.classList.add("hidden");

    const eventIdFilter = filterRegEvent.value;
    const url = eventIdFilter ? `/api/registrations?event_id=${eventIdFilter}` : "/api/registrations";

    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to load registration list.");
      const list = await response.json();

      registrationsTableBody.innerHTML = "";
      tabRegBadge.textContent = list.length;
      regCountLabel.textContent = `Showing ${list.length} registration${list.length === 1 ? '' : 's'}`;

      if (list.length === 0) {
        noRegistrationsMsg.classList.remove("hidden");
        return;
      }

      list.forEach((reg) => {
        const row = document.createElement("tr");
        row.className = "hover:bg-slate-800/60 transition";
        row.innerHTML = `
          <td class="py-3 px-4 font-mono text-violet-400 font-bold">#${reg.id}</td>
          <td class="py-3 px-4 font-bold text-white">${escapeHTML(reg.student_name)}</td>
          <td class="py-3 px-4 font-mono text-slate-300">${escapeHTML(reg.roll_number)}</td>
          <td class="py-3 px-4 text-slate-300">${escapeHTML(reg.email)}</td>
          <td class="py-3 px-4 text-slate-400">${reg.phone ? escapeHTML(reg.phone) : '—'}</td>
          <td class="py-3 px-4">
            <span class="px-2 py-0.5 rounded-md text-xs font-medium bg-slate-800 border border-slate-700 text-slate-200">
              ${escapeHTML(reg.event_title)}
            </span>
          </td>
          <td class="py-3 px-4 text-slate-400 text-[11px]">${reg.registered_at}</td>
          <td class="py-3 px-4 text-right">
            <button 
              data-reg-id="${reg.id}" 
              data-student-name="${escapeHTML(reg.student_name)}"
              class="cancel-reg-btn px-2.5 py-1 text-xs font-semibold rounded-lg bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 border border-rose-800/60 hover:border-rose-600 transition"
              title="Cancel Registration"
            >
              Cancel
            </button>
          </td>
        `;
        registrationsTableBody.appendChild(row);
      });

      // Attach cancel listeners (Stretch Goal 2)
      document.querySelectorAll(".cancel-reg-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
          const regId = btn.getAttribute("data-reg-id");
          const name = btn.getAttribute("data-student-name");
          handleCancelRegistration(regId, name);
        });
      });

    } catch (err) {
      console.error("Error loading registrations:", err);
      registrationsTableBody.innerHTML = `
        <tr><td colspan="8" class="text-center py-6 text-rose-400">${err.message || 'Error loading registrations'}</td></tr>
      `;
    }
  }

  /**
   * Cancel a Registration (Stretch Goal 2)
   */
  async function handleCancelRegistration(regId, studentName) {
    const confirmed = window.confirm(`Are you sure you want to cancel Registration #${regId} for "${studentName}"? This will free up a seat immediately.`);
    if (!confirmed) return;

    try {
      const response = await fetch(`/api/registrations/${regId}`, {
        method: "DELETE",
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || "Failed to cancel registration.");
      }

      alert(`✅ Registration #${regId} cancelled successfully.`);
      // Reload both dashboard stats and registrations list immediately
      await loadDashboard();
      await loadRegistrations();
    } catch (err) {
      alert(`⚠️ Error: ${err.message}`);
    }
  }

  /**
   * Populate Event Filter Dropdown
   */
  function populateEventFilterDropdown(events) {
    const currentVal = filterRegEvent.value;
    filterRegEvent.innerHTML = '<option value="">All Events</option>';
    events.forEach((ev) => {
      const opt = document.createElement("option");
      opt.value = ev.id;
      opt.textContent = `#${ev.id} - ${ev.title}`;
      filterRegEvent.appendChild(opt);
    });
    if (currentVal) filterRegEvent.value = currentVal;
  }

  /**
   * Add New Event Handler (Stretch Goal 1)
   */
  addEventForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    hideAddEventAlert();

    const payload = {
      title: document.getElementById("new-event-title").value.trim(),
      category: document.getElementById("new-event-category").value,
      icon: document.getElementById("new-event-icon").value.trim() || "⚡",
      event_date: document.getElementById("new-event-date").value,
      event_time: document.getElementById("new-event-time").value.trim(),
      capacity: parseInt(document.getElementById("new-event-cap").value, 10),
      fee: parseInt(document.getElementById("new-event-fee").value, 10) || 0,
      venue: document.getElementById("new-event-venue").value.trim(),
      description: document.getElementById("new-event-desc").value.trim(),
    };

    try {
      const response = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const resData = await response.json();

      if (response.status === 201) {
        showAddEventAlert("🎉 Event created successfully!", "success");
        setTimeout(() => {
          addEventModal.classList.add("hidden");
          addEventForm.reset();
          loadDashboard();
        }, 1200);
      } else {
        showAddEventAlert(resData.detail || "Validation failed.", "error");
      }
    } catch (err) {
      showAddEventAlert("Network error while creating event.", "error");
    }
  });

  function showAddEventAlert(msg, type = "error") {
    addEventAlert.classList.remove("hidden", "bg-emerald-950", "border-emerald-800", "text-emerald-200", "bg-rose-950", "border-rose-800", "text-rose-200");
    if (type === "success") {
      addEventAlert.classList.add("bg-emerald-950", "border-emerald-800", "text-emerald-200");
    } else {
      addEventAlert.classList.add("bg-rose-950", "border-rose-800", "text-rose-200");
    }
    addEventAlert.textContent = msg;
  }

  function hideAddEventAlert() {
    addEventAlert.classList.add("hidden");
  }

  // Modal handlers
  openAddEventBtn.addEventListener("click", () => {
    hideAddEventAlert();
    addEventModal.classList.remove("hidden");
  });
  closeAddEventBtn.addEventListener("click", () => addEventModal.classList.add("hidden"));
  cancelAddEventBtn.addEventListener("click", () => addEventModal.classList.add("hidden"));

  // Tab Switching
  tabEventsBtn.addEventListener("click", () => {
    tabEventsBtn.className = "pb-3 text-sm font-bold border-b-2 border-violet-500 text-violet-400 transition flex items-center gap-2";
    tabRegistrationsBtn.className = "pb-3 text-sm font-semibold border-b-2 border-transparent text-slate-400 hover:text-slate-200 transition flex items-center gap-2";
    tabEventsView.classList.remove("hidden");
    tabRegistrationsView.classList.add("hidden");
  });

  tabRegistrationsBtn.addEventListener("click", () => {
    tabRegistrationsBtn.className = "pb-3 text-sm font-bold border-b-2 border-violet-500 text-violet-400 transition flex items-center gap-2";
    tabEventsBtn.className = "pb-3 text-sm font-semibold border-b-2 border-transparent text-slate-400 hover:text-slate-200 transition flex items-center gap-2";
    tabRegistrationsView.classList.remove("hidden");
    tabEventsView.classList.add("hidden");
    loadRegistrations();
  });

  filterRegEvent.addEventListener("change", loadRegistrations);
  refreshDashboardBtn.addEventListener("click", loadDashboard);
  adminRetryBtn.addEventListener("click", loadDashboard);

  // State visibility helpers
  function showLoading() {
    adminLoading.classList.remove("hidden");
    adminError.classList.add("hidden");
    dashboardContent.classList.add("hidden");
  }

  function showContent() {
    adminLoading.classList.add("hidden");
    adminError.classList.add("hidden");
    dashboardContent.classList.remove("hidden");
  }

  function showError(msg) {
    adminLoading.classList.add("hidden");
    adminErrorText.textContent = msg;
    adminError.classList.remove("hidden");
    dashboardContent.classList.add("hidden");
  }

  function getCategoryIcon(cat) {
    const icons = {
      Technical: "💻",
      Cultural: "🎸",
      Sports: "⚽",
      Gaming: "🎮",
      Workshop: "🛠️",
    };
    return icons[cat] || "🏷️";
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

  // Initial dashboard load
  loadDashboard();
});

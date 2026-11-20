(() => {
  "use strict";

  const page = document.body.dataset.page;
  const csrf = document.querySelector('meta[name="csrf-token"]')?.content || "";
  const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[char]);
  const api = async (url, options = {}) => {
    const response = await fetch(url, {
      ...options,
      headers: {
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        "X-CSRF-Token": csrf,
        ...(options.headers || {}),
      },
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload.success === false) {
      throw new Error(payload.message || `Request failed (${response.status}).`);
    }
    return payload;
  };
  const toast = (message, type = "success") => {
    const region = document.querySelector("#toast-region");
    if (!region) return;
    const item = document.createElement("div");
    item.className = `toast ${type}`;
    item.textContent = message;
    region.append(item);
    window.setTimeout(() => item.remove(), 3600);
  };
  const buttonBusy = (button, busy, label) => {
    if (!button) return;
    button.disabled = busy;
    if (busy) {
      button.dataset.originalText = button.textContent;
      button.textContent = label || "One moment…";
    } else if (button.dataset.originalText) {
      button.textContent = button.dataset.originalText;
    }
  };
  const onError = (error) => toast(error.message || "Something went wrong. Please try again.", "error");

  const revealSelector = ".app-main > *, .section-heading, .glass, .quest-card, .activity-card, .reward-card, .game-card, .achievement-card";
  const revealObserver = "IntersectionObserver" in window
    ? new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("revealed");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08, rootMargin: "0px 0px -35px 0px" })
    : null;
  const observeReveals = (root) => {
    const candidates = [];
    if (root instanceof Element && root.matches(revealSelector)) candidates.push(root);
    if (root.querySelectorAll) candidates.push(...root.querySelectorAll(revealSelector));
    candidates.forEach((element) => {
      if (element.matches(".map-detail-panel")) return;
      if (element.classList.contains("reveal-on-scroll")) return;
      element.classList.add("reveal-on-scroll");
      if (revealObserver) revealObserver.observe(element);
      else element.classList.add("revealed");
    });
  };
  observeReveals(document);
  const contentRoot = document.querySelector(".app-main");
  if (contentRoot && "MutationObserver" in window) {
    new MutationObserver((changes) => {
      changes.forEach((change) => change.addedNodes.forEach((node) => {
        if (node instanceof Element) observeReveals(node);
      }));
    }).observe(contentRoot, { childList: true, subtree: true });
  }

  document.addEventListener("pointerdown", (event) => {
    if (!(event.target instanceof Element)) return;
    const control = event.target.closest("button, a:not(.map-marker), .filter-chip, .quiz-option, .memory-card, .pattern-key");
    if (!control || control.hasAttribute("disabled") || control.classList.contains("map-marker")) return;
    const bounds = control.getBoundingClientRect();
    const ripple = document.createElement("span");
    ripple.className = "interaction-ripple";
    ripple.style.left = `${event.clientX - bounds.left}px`;
    ripple.style.top = `${event.clientY - bounds.top}px`;
    control.append(ripple);
    window.setTimeout(() => ripple.remove(), 700);
  }, { passive: true });

  document.querySelector(".menu-toggle")?.addEventListener("click", (event) => {
    const nav = document.querySelector(".main-nav");
    const opened = nav.classList.toggle("nav-open");
    event.currentTarget.setAttribute("aria-expanded", String(opened));
  });

  const notificationMenu = document.querySelector("#notification-menu");
  document.querySelector("#notification-toggle")?.addEventListener("click", async () => {
    notificationMenu.hidden = !notificationMenu.hidden;
    if (notificationMenu.hidden) return;
    const list = document.querySelector("#notification-list");
    try {
      const { data } = await api("/api/notifications");
      list.innerHTML = data.length ? data.map((item) => `
        <button class="notification-item ${item.read ? "" : "unread"}" data-notification-id="${escapeHtml(item._id)}">
          <span class="notification-spark">✦</span><span><b>${escapeHtml(item.title)}</b><small>${escapeHtml(item.message)}</small></span>
        </button>`).join("") : '<p class="muted notification-empty">No messages yet. Your next quest may change that.</p>';
      list.querySelectorAll("[data-notification-id]").forEach((item) => item.addEventListener("click", async () => {
        try {
          await api(`/api/notifications/${item.dataset.notificationId}/read`, { method: "POST", body: "{}" });
          item.classList.remove("unread");
        } catch (error) { onError(error); }
      }));
    } catch (error) { list.innerHTML = `<p class="muted">${escapeHtml(error.message)}</p>`; }
  });
  document.querySelector("#read-all")?.addEventListener("click", async () => {
    try {
      await api("/api/notifications/read-all", { method: "POST", body: "{}" });
      document.querySelectorAll(".notification-item").forEach((item) => item.classList.remove("unread"));
      document.querySelector(".notification-dot")?.remove();
      toast("All notifications marked as read.");
    } catch (error) { onError(error); }
  });

  document.querySelectorAll("[data-quiz-answer]").forEach((button) => button.addEventListener("click", async () => {
    const feedback = document.querySelector("#quiz-feedback");
    const answer = button.dataset.quizAnswer;
    try {
      const { data } = await api("/api/quests");
      const quest = data.find((item) => item.type === "quiz" && item.title === "Style the Web");
      if (!quest) throw new Error("The tech challenge is not available.");
      await api(`/api/quests/${quest._id}/start`, { method: "POST", body: "{}" });
      const result = await api(`/api/quests/${quest._id}/complete`, { method: "POST", body: JSON.stringify({ answer }) });
      feedback.textContent = result.data?.already_completed
        ? "You have already completed this challenge."
        : `Correct! +${result.data?.xp || 0} XP added to your player.`;
      feedback.className = "quiz-feedback correct";
      document.querySelectorAll("[data-quiz-answer]").forEach((option) => { option.disabled = true; });
    } catch (error) {
      feedback.textContent = error.message === "Not quite. Try another answer." ? "Not quite. Give it another try!" : error.message;
      feedback.className = "quiz-feedback incorrect";
    }
  }));

  const fetchQuests = async (category = "all") => {
    const grid = document.querySelector("#quest-grid");
    if (!grid) return;
    grid.innerHTML = '<div class="loading-card">Opening the quest board…</div>';
    try {
      const { data } = await api(`/api/quests?category=${encodeURIComponent(category)}`);
      grid.innerHTML = data.length ? data.map((quest) => `
        <article class="quest-card glass">
          <div class="quest-card-top"><span class="category-chip">${escapeHtml(quest.category.toUpperCase())}</span><span class="difficulty">${escapeHtml(quest.difficulty)}</span></div>
          <h3>${escapeHtml(quest.title)}</h3><p>${escapeHtml(quest.description)}</p>
          <div class="quest-card-meta"><span>⌖ ${escapeHtml(quest.location)}</span><span class="gold-text">✦ ${quest.xp} XP</span><span>◈ ${quest.coins}</span></div>
          <a class="card-action ${quest.status === "completed" ? "is-complete" : ""}" href="/quests/${quest._id}">${quest.status === "completed" ? "Completed" : quest.status === "active" ? "Continue" : "Start quest"} <span>→</span></a>
        </article>`).join("") : '<div class="empty-state">No quests in this constellation yet.</div>';
    } catch (error) { grid.innerHTML = `<div class="empty-state">${escapeHtml(error.message)}</div>`; }
  };
  document.querySelectorAll("#quest-filters [data-category]").forEach((button) => button.addEventListener("click", () => {
    document.querySelectorAll("#quest-filters .filter-chip").forEach((chip) => chip.classList.remove("selected"));
    button.classList.add("selected");
    fetchQuests(button.dataset.category);
  }));
  if (page === "quests") fetchQuests();

  const questStart = document.querySelector("#quest-start");
  if (questStart) {
    questStart.addEventListener("click", async () => {
      buttonBusy(questStart, true, "Starting quest…");
      try {
        await api(`/api/quests/${questStart.dataset.questId}/start`, { method: "POST", body: "{}" });
        questStart.textContent = "Quest started";
        questStart.disabled = true;
        const { data } = await api(`/api/quests/${questStart.dataset.questId}`);
        if (data.type === "quiz") document.querySelector("#quest-quiz").hidden = false;
        toast("Quest added to your journey.");
      } catch (error) { buttonBusy(questStart, false); onError(error); }
    });
  }
  document.querySelectorAll("#quest-quiz [data-answer]").forEach((button) => button.addEventListener("click", async () => {
    const feedback = document.querySelector("#quest-result");
    try {
      await api(`/api/quests/${questStart.dataset.questId}/complete`, { method: "POST", body: JSON.stringify({ answer: button.dataset.answer }) });
      feedback.textContent = "Correct! Quest complete — your rewards are waiting.";
      feedback.className = "quiz-feedback correct";
      document.querySelectorAll("#quest-quiz [data-answer]").forEach((option) => { option.disabled = true; });
    } catch (error) {
      feedback.textContent = error.message;
      feedback.className = "quiz-feedback incorrect";
    }
  }));
  document.querySelector("#complete-location-quest")?.addEventListener("click", async (event) => {
    const button = event.currentTarget;
    const result = document.querySelector("#location-result");
    buttonBusy(button, true, "Completing quest…");
    try {
      const response = await api(`/api/quests/${button.dataset.questId}/complete`, {
        method: "POST", body: "{}",
      });
      result.textContent = response.message;
      result.className = "quiz-feedback correct";
      button.remove();
      toast(response.message);
    } catch (error) {
      buttonBusy(button, false);
      result.textContent = error.message;
      result.className = "quiz-feedback incorrect";
    }
  });

  const loadLeaderboard = async (scope = "global") => {
    const root = document.querySelector("#leaderboard-list");
    if (!root) return;
    root.innerHTML = '<div class="loading-card">Tuning the campus leaderboard…</div>';
    try {
      const { data } = await api(`/api/leaderboard?scope=${scope}`);
      root.innerHTML = data.length ? data.map((entry, index) => `
        <div class="leader-row ${index < 3 ? `podium podium-${index + 1}` : ""}">
          <span class="leader-rank">${String(index + 1).padStart(2, "0")}</span>
          <span class="avatar">${escapeHtml((entry.full_name || entry.username).slice(0, 1).toUpperCase())}</span>
          <span class="leader-player"><b>${escapeHtml(entry.full_name)}</b><small>@${escapeHtml(entry.username)} · ${escapeHtml(entry.department)}</small></span>
          <span class="leader-level">LVL ${entry.level}</span><strong class="leader-xp">${entry.xp.toLocaleString()} <small>XP</small></strong>
        </div>`).join("") : '<div class="empty-state">The leaderboard is waiting for its first explorers.</div>';
    } catch (error) { root.innerHTML = `<div class="empty-state">${escapeHtml(error.message)}</div>`; }
  };
  document.querySelectorAll("#leaderboard-filters [data-scope]").forEach((button) => button.addEventListener("click", () => {
    document.querySelectorAll("#leaderboard-filters .filter-chip").forEach((chip) => chip.classList.remove("selected"));
    button.classList.add("selected");
    loadLeaderboard(button.dataset.scope);
  }));
  if (page === "leaderboard") loadLeaderboard();

  const loadProfile = async () => {
    const root = document.querySelector("#profile-content");
    if (!root) return;
    try {
      const { data } = await api("/api/profile");
      const s = data.stats;
      const progress = Math.min(100, Math.round(100 * data.level_progress.current_xp / data.level_progress.needed_xp));
      root.innerHTML = `
        <section class="profile-banner glass"><div class="avatar avatar-large">${escapeHtml(data.user.full_name.slice(0, 1).toUpperCase())}</div><div class="profile-name"><div class="eyebrow">CAMPUSQUEST PLAYER</div><h2>${escapeHtml(data.user.full_name)}</h2><p>@${escapeHtml(data.user.username)} · ${escapeHtml(data.user.department)}</p></div><div class="profile-level"><span>LEVEL</span><b>${s.level}</b></div></section>
        <section class="glass profile-xp"><div class="progress-title"><div><div class="eyebrow">LEVEL ${s.level} PROGRESS</div><h3>${s.xp} total XP</h3></div><span class="progress-number">${data.level_progress.current_xp} <small>/ ${data.level_progress.needed_xp} XP</small></span></div><div class="progress-track"><span style="width:${progress}%"></span></div></section>
        <section class="profile-stats">${[
          ["EXPERIENCE", `${s.xp} XP`, "✦"], ["COINS", s.coins, "◈"], ["QUESTS COMPLETE", data.completed_quests, "⌖"],
          ["CURRENT STREAK", `${s.current_streak} days`, "◷"], ["LONGEST STREAK", `${s.longest_streak} days`, "✧"], ["CAMPUS RANK", `#${data.rank}`, "♛"],
        ].map(([label, value, icon]) => `<div class="glass stat-card"><span>${icon}</span><small>${label}</small><b>${value}</b></div>`).join("")}</section>
        <section class="profile-lower"><div class="glass profile-section"><div class="eyebrow">MILESTONES</div><h3>Achievements</h3><div class="mini-badges">${data.achievements.length ? data.achievements.map((a) => `<span title="${escapeHtml(a.name)}">✦</span>`).join("") : '<p class="muted">Your first achievement is out there.</p>'}</div><a class="text-link" href="/achievements">View all ↗</a></div><div class="glass profile-section"><div class="eyebrow">RECENT LOG</div><h3>Recent activity</h3>${data.recent_activity.length ? data.recent_activity.map((a) => `<div class="activity-log-row"><span>✧</span><b>${escapeHtml(a.message)}</b><small>+${a.xp} XP</small></div>`).join("") : '<p class="muted">The beginning of a great story.</p>'}</div></section>
        <section class="glass profile-edit"><div class="eyebrow">PLAYER DETAILS</div><h3>Edit your profile</h3><form id="profile-form" class="profile-edit-form"><label>Full name<input name="full_name" value="${escapeHtml(data.user.full_name)}" required></label><label>Department<input name="department" value="${escapeHtml(data.user.department)}" required></label><label>Year<input name="year" value="${escapeHtml(data.user.year)}" required></label><label>Semester<input name="semester" value="${escapeHtml(data.user.semester)}" required></label><button class="button button-outline" type="submit">Save details</button></form></section>`;
      document.querySelector("#profile-form").addEventListener("submit", async (event) => {
        event.preventDefault();
        const body = Object.fromEntries(new FormData(event.currentTarget));
        try { await api("/api/profile", { method: "PUT", body: JSON.stringify(body) }); toast("Profile updated."); }
        catch (error) { onError(error); }
      });
    } catch (error) { root.innerHTML = `<div class="empty-state">${escapeHtml(error.message)}</div>`; }
  };
  if (page === "profile") loadProfile();

  if (page === "achievements") {
    const root = document.querySelector("#achievement-grid");
    api("/api/achievements").then(({ data }) => {
      root.innerHTML = data.map((item) => `<article class="achievement-card glass ${item.unlocked ? "unlocked" : "locked"}"><span class="achievement-icon">${escapeHtml(item.icon)}</span><div class="eyebrow">${item.unlocked ? "UNLOCKED" : "LOCKED"}</div><h3>${escapeHtml(item.name)}</h3><p>${escapeHtml(item.description)}</p>${item.unlocked ? '<span class="achievement-stamp">✦ CLAIMED</span>' : '<span class="muted">Keep exploring to discover this badge</span>'}</article>`).join("");
    }).catch((error) => { root.innerHTML = `<div class="empty-state">${escapeHtml(error.message)}</div>`; });
  }

  if (page === "rewards") {
    const root = document.querySelector("#reward-grid");
    const loadRewards = () => api("/api/rewards").then(({ data }) => {
      root.innerHTML = data.map((item) => `<article class="reward-card glass"><span class="reward-icon">${escapeHtml(item.icon)}</span><span class="category-chip">${item.claimed ? "COLLECTED" : "CAMPUSQUEST SHOP"}</span><h3>${escapeHtml(item.name)}</h3><p>${escapeHtml(item.description)}</p><div class="reward-cost"><span>◈ ${item.cost} coins</span><button class="button ${item.claimed ? "button-quiet" : "button-outline"} button-small" data-claim="${item._id}" ${item.claimed ? "disabled" : ""}>${item.claimed ? "Collected" : "Claim"}</button></div></article>`).join("");
      root.querySelectorAll("[data-claim]").forEach((button) => button.addEventListener("click", async () => {
        buttonBusy(button, true, "Claiming…");
        try { const result = await api(`/api/rewards/${button.dataset.claim}/claim`, { method: "POST", body: "{}" }); toast(result.message); loadRewards(); }
        catch (error) { buttonBusy(button, false); onError(error); }
      }));
    }).catch((error) => { root.innerHTML = `<div class="empty-state">${escapeHtml(error.message)}</div>`; });
    loadRewards();
  }

  const loadSquad = async () => {
    const root = document.querySelector("#squad-details");
    if (!root) return;
    try {
      const { data } = await api("/api/squad");
      root.innerHTML = data ? `<div class="glass squad-card"><div class="eyebrow">YOUR SQUAD · INVITE ID ${escapeHtml(data._id)}</div><h2>${escapeHtml(data.name)}</h2><p>${data.member_count} member${data.member_count === 1 ? "" : "s"} · ${data.xp} squad XP · Rank #${data.rank}</p><div class="squad-weekly"><div><span>WEEKLY PROGRESS</span><b>${data.weekly_xp} <small>/ 1,000 XP</small></b></div><div class="progress-track"><span style="width:${Math.min(100, Math.round(data.weekly_xp / 10))}%"></span></div></div><div class="squad-members">${data.members.map((member) => `<div class="squad-member"><span class="avatar">${escapeHtml(member.full_name.slice(0, 1).toUpperCase())}</span><b>${escapeHtml(member.full_name)}</b><small>LVL ${member.level} · ${member.xp} XP · ${member.role}</small></div>`).join("")}</div><button class="button button-quiet" id="leave-squad">Leave squad</button></div>` : '<div class="glass squad-empty"><span>✧</span><h3>Your story, your crew.</h3><p>Create a squad or join one with an invite ID.</p></div>';
      document.querySelector("#leave-squad")?.addEventListener("click", async () => {
        try { const result = await api("/api/squad/leave", { method: "POST", body: "{}" }); toast(result.message); loadSquad(); }
        catch (error) { onError(error); }
      });
    } catch (error) { root.innerHTML = `<div class="empty-state">${escapeHtml(error.message)}</div>`; }
  };
  document.querySelector("#create-squad-form")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const name = new FormData(event.currentTarget).get("name");
    try { const result = await api("/api/squad/create", { method: "POST", body: JSON.stringify({ name }) }); toast(result.message); event.currentTarget.reset(); loadSquad(); }
    catch (error) { onError(error); }
  });
  document.querySelector("#join-squad-form")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const squad_id = new FormData(event.currentTarget).get("squad_id");
    try { const result = await api("/api/squad/join", { method: "POST", body: JSON.stringify({ squad_id }) }); toast(result.message); event.currentTarget.reset(); loadSquad(); }
    catch (error) { onError(error); }
  });
  if (page === "squad") loadSquad();

  const loadActivities = async (category = "") => {
    const root = document.querySelector("#activity-grid");
    if (!root) return;
    try {
      const { data } = await api(`/api/activities${category ? `?category=${encodeURIComponent(category)}` : ""}`);
      root.innerHTML = data.length ? data.map((item) => `<article class="activity-card glass"><div class="activity-card-top"><span class="category-chip">${escapeHtml(item.category.toUpperCase())}</span><span class="activity-xp">✦ +${item.xp} XP</span></div><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.organization)}</p><div class="activity-details"><span>◷ ${escapeHtml(item.date)} · ${escapeHtml(item.time)}</span><span>⌖ ${escapeHtml(item.location)}</span></div><a class="text-link activity-view-link" href="/activities/${item._id}">View activity ↗</a><button class="button ${item.joined ? "button-quiet" : "button-outline"} button-small" data-join="${item._id}" ${item.joined ? "disabled" : ""}>${item.joined ? "You're going" : "Join activity"} <span>→</span></button></article>`).join("") : '<div class="empty-state">No events in this category just yet.</div>';
      root.querySelectorAll("[data-join]").forEach((button) => button.addEventListener("click", async () => {
        try { const result = await api(`/api/activities/${button.dataset.join}/join`, { method: "POST", body: "{}" }); toast(result.message); loadActivities(category); }
        catch (error) { onError(error); }
      }));
    } catch (error) { root.innerHTML = `<div class="empty-state">${escapeHtml(error.message)}</div>`; }
  };
  document.querySelectorAll("#activity-filters [data-category]").forEach((button) => button.addEventListener("click", () => {
    document.querySelectorAll("#activity-filters .filter-chip").forEach((chip) => chip.classList.remove("selected"));
    button.classList.add("selected");
    loadActivities(button.dataset.category);
  }));
  if (page === "activities") loadActivities();
  document.querySelector("#activity-join")?.addEventListener("click", async (event) => {
    const button = event.currentTarget;
    try {
      const result = await api(`/api/activities/${button.dataset.activityId}/join`, { method: "POST", body: "{}" });
      button.textContent = "You're going";
      button.disabled = true;
      document.querySelector("#activity-join-feedback").textContent = result.message;
      toast(result.message);
    } catch (error) {
      document.querySelector("#activity-join-feedback").textContent = error.message;
      document.querySelector("#activity-join-feedback").className = "quiz-feedback incorrect";
    }
  });

  const initMap = async () => {
    const map = document.querySelector("#campus-map");
    if (!map) return;
    const detail = document.querySelector("#map-location-detail");
    const state = document.querySelector("#exploring-state b");
    const mapLayout = document.querySelector(".map-layout");
    const detailPanel = document.querySelector("#map-detail-panel");
    const amenityPopup = document.querySelector("#map-amenity-popup");
    const amenityTitle = document.querySelector("#map-amenity-title");
    const amenityDescription = document.querySelector("#map-amenity-description");
    const amenityAction = document.querySelector("#map-amenity-action");
    const exploredStat = document.querySelector("#explored-stat");
    const activeQuestStat = document.querySelector("#active-quest-stat");
    const rendererHost = document.querySelector("#campus-3d-world");
    const tooltip = document.querySelector("#map-3d-tooltip");
    const accessibleLocations = document.querySelector("#map-location-accessible-list");
    const visuals = {
      "Main Gate": { label: "Main Gate", icon: "⌑", sub: "The Lantern Gate", about: "Every adventure begins beneath the old lanterns. The whole campus is waiting beyond the arch.", x: 50, y: 90, type: "gate" },
      "Main Academic Block": { label: "Academic Hall", icon: "♜", sub: "Hall of Ideas", about: "A quiet courtyard of lecture halls, late-night notes and bright new ideas.", x: 25, y: 30, type: "academic" },
      "IT Block": { label: "Innovation Lab", icon: "⌘", sub: "The Foundry", about: "A workshop for curious minds, prototypes and the next unexpected discovery.", x: 75, y: 30, type: "lab" },
      "Library": { label: "Digital Library", icon: "▤", sub: "Knowledge Zone", about: "Ancient knowledge hides more than books. Follow the clues tucked between the archives.", x: 50, y: 15, type: "library" },
      "Auditorium": { label: "Auditorium", icon: "◖", sub: "The Grand Stage", about: "A warm glow spills across the old stage. The next story may be waiting in the wings.", x: 30, y: 55, type: "auditorium" },
      "Canteen": { label: "Campus Café", icon: "♨", sub: "The Commons", about: "A lively corner for good food, better conversation and a clue or two.", x: 66, y: 60, type: "cafe" },
      "Management Block": { label: "Student Hub", icon: "⌂", sub: "The Meeting Place", about: "A welcoming stop where campus plans, clubs and new friendships come together.", x: 50, y: 49, type: "hub" },
      "Sports Ground": { label: "Sports Ground", icon: "◎", sub: "The Field", about: "Open skies, friendly rivalries and room to make your next move.", x: 79, y: 76, type: "sports" },
      "Hostel": { label: "Knowledge Tower", icon: "♜", sub: "The Observatory", about: "A quiet tower above the trees. Look closely; its windows keep a curious secret.", x: 65, y: 15, type: "tower" },
      "Garden": { label: "Mystery Garden", icon: "❋", sub: "The Hidden Green", about: "Follow the lantern-lit paths into a peaceful garden where unexpected things grow.", x: 76, y: 64, type: "garden" },
      "Administration": { label: "Quest Board", icon: "▧", sub: "The Notice Wall", about: "Rumours, requests and fresh leads are pinned here for those willing to look.", x: 50, y: 40, type: "board" },
      "Parking": { label: "Game Arena", icon: "✣", sub: "The Arcade", about: "Step into the arena for a playful challenge and a chance to beat your best.", x: 72, y: 47, type: "arena" },
    };
    let locations = [];
    let selected = null;
    let campusWorld = null;
    const questsFor = (location) => Array.isArray(location.quests) ? location.quests : [];
    const getVisual = (location) => visuals[location.name] || {
      label: location.name, icon: "⌖", sub: "Campus landmark", about: location.description || "A familiar corner of the virtual campus.", x: location.map_x, y: location.map_y, type: "default",
    };
    const setPanelOpen = (open) => {
      const desktopClosed = !open && window.matchMedia("(min-width: 921px)").matches;
      const wasOpen = detailPanel.classList.contains("is-open");
      detailPanel.classList.toggle("is-open", open);
      detailPanel.classList.toggle("is-collapsed", !open);
      mapLayout.classList.toggle("has-panel-open", open);
      detailPanel.setAttribute("aria-hidden", String(desktopClosed));
      detailPanel.inert = desktopClosed;
      map.classList.toggle("has-location-selection", open && Boolean(selected));
      document.querySelector("#map-panel-toggle").setAttribute("aria-expanded", String(open));
      if (wasOpen !== open) requestAnimationFrame(() => requestAnimationFrame(() => campusWorld?.resize()));
    };
    const desktopQuery = window.matchMedia("(min-width: 921px)");
    setPanelOpen(false);
    desktopQuery.addEventListener("change", () => setPanelOpen(detailPanel.classList.contains("is-open")));
    const movePlayerTo = (location) => {
      campusWorld?.movePlayerTo(location);
    };
    const renderAmenity = (amenity) => {
      if (!amenity) {
        amenityPopup.hidden = true;
        amenityAction.hidden = true;
        return;
      }
      renderLocation(null, false, false);
      amenityTitle.textContent = amenity.name;
      amenityDescription.textContent = amenity.description;
      if (amenity.href) {
        amenityAction.href = amenity.href;
        amenityAction.textContent = amenity.id === "reward-shop" ? "Browse rewards ↗"
          : amenity.id === "achievement-wall" ? "View achievements ↗" : "Open quests ↗";
        amenityAction.hidden = false;
      } else {
        amenityAction.hidden = true;
      }
      amenityPopup.hidden = false;
    };
    const renderLocation = (location, openPanel = Boolean(location), syncWorld = true) => {
      renderAmenity(null);
      selected = location;
      if (syncWorld) campusWorld?.selectLocation(location);
      if (!location) {
        state.textContent = "Campus overview";
        detail.innerHTML = `<div class="location-empty-state"><span class="location-empty-icon">⌖</span><div class="eyebrow">CHOOSE YOUR DESTINATION</div><h3>Where will you explore?</h3><p>Tap a landmark to uncover its story, see available quests and chart your next step.</p><div class="panel-progress"><span>Exploration progress</span><b>${exploredStat.textContent} / ${locations.length} locations</b><i><em style="--progress:${Math.min(100, Number(exploredStat.textContent) / Math.max(1, locations.length) * 100)}%"></em></i></div></div>`;
        setPanelOpen(false);
        return;
      }
      const visual = getVisual(location);
      const quests = questsFor(location);
      const activeQuests = quests.filter((quest) => quest.status !== "completed");
      const primaryQuest = activeQuests[0] || quests[0];
      const additionalQuests = activeQuests.filter((quest) => quest !== primaryQuest);
      const stars = primaryQuest ? ({ Easy: "★☆☆", Medium: "★★☆", Hard: "★★★" }[primaryQuest.difficulty] || "★☆☆") : "";
      state.textContent = visual.label;
      detail.innerHTML = `
        <article class="location-card">
          <div class="location-art location-art-${visual.type}"><span>${escapeHtml(visual.icon)}</span><i></i><b></b></div>
          <div class="location-card-title"><div class="eyebrow">${escapeHtml(visual.sub)}</div><h3>${escapeHtml(visual.label)}</h3></div>
          <p class="location-description">${escapeHtml(location.description && !location.description.startsWith("Discover ") ? location.description : visual.about)}</p>
          <div class="location-state ${location.locked ? "state-locked" : location.explored ? "state-explored" : activeQuests.length ? "state-quest" : "state-mystery"}"><i></i>${location.locked ? "LOCKED" : location.explored ? "DISCOVERED" : activeQuests.length ? "QUEST AVAILABLE" : "MYSTERY LOCATION"}</div>
          ${primaryQuest ? `<section class="location-quest-feature"><div class="eyebrow">${primaryQuest.status === "completed" ? "COMPLETED QUEST" : primaryQuest.status === "active" ? "YOUR ACTIVE QUEST" : "ACTIVE QUEST"}</div><h4>${escapeHtml(primaryQuest.title)}</h4><div class="location-difficulty"><span>${stars}</span><small>${escapeHtml(primaryQuest.difficulty || "Easy")} difficulty</small></div><div class="location-rewards"><span>✦ +${Number(primaryQuest.xp) || 0} XP</span><span>◈ +${Number(primaryQuest.coins) || 0} coins</span></div>${primaryQuest.status === "active" ? `<div class="location-quest-progress"><span>Quest progress</span><b>${Math.max(0, Math.min(100, Number(primaryQuest.progress) || 0))}%</b><i><em style="--progress:${Math.max(0, Math.min(100, Number(primaryQuest.progress) || 0))}%"></em></i></div>` : ""}</section>` : `<section class="location-quest-feature mystery-quest"><div class="eyebrow">NO ACTIVE QUEST</div><h4>No active quest here yet</h4><p>Explore it anyway and add this landmark to your discoveries.</p></section>`}
          <button class="button button-primary location-explore-button" id="explore-location" data-location-id="${location._id}" ${location.explored || location.locked ? "disabled" : ""}>${location.locked ? "Location locked" : location.explored ? "Location explored" : "Explore location"} <span>${location.locked ? "⌑" : location.explored ? "✓" : "✦"}</span></button>
          ${primaryQuest && primaryQuest.status !== "completed" && !location.locked ? `<button class="button button-outline location-start-button" data-start-map-quest="${primaryQuest._id}" data-location-id="${location._id}">${primaryQuest.status === "active" ? "Continue quest" : "Start location quest"} <span>↗</span></button>` : ""}
          ${additionalQuests.length ? `<div class="location-extra-quests"><span>${additionalQuests.length} MORE QUEST${additionalQuests.length > 1 ? "S" : ""}</span>${additionalQuests.map((quest) => `<button class="map-quest-row" data-start-map-quest="${quest._id}" data-location-id="${location._id}"><span>${escapeHtml(quest.title)}</span><small>+${Number(quest.xp) || 0} XP · +${Number(quest.coins) || 0} coins</small><b>→</b></button>`).join("")}</div>` : ""}
          <div class="panel-progress"><span>Exploration progress</span><b>${exploredStat.textContent} / ${locations.length} locations</b><i><em style="--progress:${Math.min(100, Number(exploredStat.textContent) / Math.max(1, locations.length) * 100)}%"></em></i></div>
        </article>`;
      setPanelOpen(openPanel);
      detail.querySelector("#explore-location")?.addEventListener("click", async (event) => {
        const button = event.currentTarget;
        buttonBusy(button, true, "Exploring…");
        try {
          const result = await api(`/api/map/locations/${button.dataset.locationId}/explore`, { method: "POST", body: "{}" });
          movePlayerTo(location);
          map.classList.remove("exploration-celebration");
          void map.offsetWidth;
          map.classList.add("exploration-celebration");
          toast(`Discovery recorded: ${visual.label}`);
          await loadMap();
          renderLocation(locations.find((item) => item._id === result.data.location_id));
        } catch (error) { buttonBusy(button, false); onError(error); }
      });
      detail.querySelectorAll("[data-start-map-quest]").forEach((button) => button.addEventListener("click", async (event) => {
        const target = event.currentTarget;
        buttonBusy(target, true, "Starting…");
        try {
          const questLocation = locations.find((item) => item._id === target.dataset.locationId);
          if (!questLocation.explored) {
            await api(`/api/map/locations/${questLocation._id}/explore`, { method: "POST", body: "{}" });
          }
          await api(`/api/quests/${target.dataset.startMapQuest}/start`, {
            method: "POST", body: JSON.stringify({ location_id: questLocation._id }),
          });
          window.location.assign(`/quests/${target.dataset.startMapQuest}`);
        } catch (error) { buttonBusy(target, false); onError(error); }
      }));
    };
    const loadMap = async () => {
      const { data } = await api("/api/map/locations");
      locations = data;
      const explored = locations.filter((item) => item.explored).length;
      const questCount = new Set(locations.flatMap((location) => questsFor(location).filter((quest) => quest.status !== "completed").map((quest) => quest._id))).size;
      exploredStat.textContent = String(explored);
      activeQuestStat.textContent = String(questCount);
      campusWorld.setLocations(locations);
      accessibleLocations.innerHTML = locations.map((location) => {
        const visual = getVisual(location);
        const available = questsFor(location).some((quest) => quest.status !== "completed");
        return `<button type="button" class="campus-location-sr-button" data-location-id="${location._id}">${escapeHtml(visual.label)}${location.explored ? ", explored" : available ? ", quest available" : ", undiscovered"}</button>`;
      }).join("");
      accessibleLocations.querySelectorAll("[data-location-id]").forEach((button) => button.addEventListener("click", () => {
        const location = locations.find((item) => item._id === button.dataset.locationId);
        renderLocation(location);
      }));
      if (selected) {
        selected = locations.find((item) => item._id === selected._id) || null;
        renderLocation(selected, detailPanel.classList.contains("is-open"));
      }
    };
    const resetMap = () => {
      campusWorld.fitCampusToView();
      renderLocation(null);
    };
    document.querySelector("#map-zoom-in").addEventListener("click", () => campusWorld.zoomBy(1));
    document.querySelector("#map-zoom-out").addEventListener("click", () => campusWorld.zoomBy(-1));
    document.querySelector("#map-reset").addEventListener("click", resetMap);
    document.querySelector("#map-fit").addEventListener("click", () => campusWorld.fitCampusToView());
    document.querySelector("#map-top-view").addEventListener("click", () => campusWorld.setTopView());
    document.querySelector("#map-isometric").addEventListener("click", () => campusWorld.setIsometric());
    document.querySelector("#map-panel-toggle").addEventListener("click", () => setPanelOpen(!detailPanel.classList.contains("is-open")));
    document.querySelector("#map-panel-close").addEventListener("click", () => renderLocation(null));
    document.querySelector("#map-amenity-close").addEventListener("click", () => renderAmenity(null));
    document.querySelector("#map-open-hint").addEventListener("click", () => {
      if (selected) renderLocation(selected);
      else setPanelOpen(true);
    });
    map.addEventListener("keydown", (event) => {
      if (event.target !== map) return;
      if (event.key === "+" || event.key === "=") campusWorld.zoomBy(1);
      if (event.key === "-") campusWorld.zoomBy(-1);
      if (event.key === "Escape") {
        if (!amenityPopup.hidden) renderAmenity(null);
        else resetMap();
      }
    });
    try {
      const loading = document.querySelector("#map-3d-loading");
      campusWorld = window.CampusWorld.create({
        container: rendererHost,
        tooltip,
        onSelect: (location) => renderLocation(location),
        onAmenitySelect: renderAmenity,
      });
      await loadMap();
      loading.remove();
      const questId = new URLSearchParams(window.location.search).get("quest");
      if (questId) {
        const location = locations.find((item) => item.quests.some((quest) => quest._id === questId));
        if (location) renderLocation(location);
      }
    } catch (error) {
      const loading = document.querySelector("#map-3d-loading");
      if (loading) {
        loading.hidden = false;
        loading.textContent = `The 3D campus could not be loaded: ${error.message}`;
        loading.setAttribute("role", "alert");
      }
    }
  };
  if (page === "map") initMap();

  const games = {
    "quick-tap": (root, finish) => {
      root.innerHTML = `<div class="game-play-head"><span>Tap targets as fast as you can</span><b id="game-timer">12</b></div><div class="tap-arena"><button class="tap-target" aria-label="Tap target">✦</button></div><p class="game-instruction">Every hit earns a point. Stay sharp.</p>`;
      let score = 0, remaining = 12;
      const timer = root.querySelector("#game-timer");
      const target = root.querySelector(".tap-target");
      const interval = window.setInterval(() => { remaining -= 1; timer.textContent = remaining; if (remaining <= 0) { clearInterval(interval); finish(score * 10); } }, 1000);
      target.addEventListener("click", () => { score += 1; target.style.left = `${8 + Math.random() * 78}%`; target.style.top = `${8 + Math.random() * 72}%`; timer.dataset.hits = score; });
      return () => clearInterval(interval);
    },
    "code-rush": (root, finish) => {
      const questions = [
        ["What does CSS style?", ["Web pages", "Databases", "Networks", "Servers"], 0],
        ["Which tag creates a link?", ["<p>", "<a>", "<h1>", "<img>"], 1],
        ["Which is a JavaScript value?", ["undefined", "stylesheet", "browser-only", "html-tag"], 0],
        ["What does HTTP stand for?", ["Hypertext Transfer Protocol", "High Tech Transfer Page", "Host Text Transport Program", "Hyperlink Table Transfer Process"], 0],
        ["Which stores key/value data in JS?", ["Map", "Canvas", "Style", "Socket"], 0],
      ];
      let index = 0, score = 0;
      const draw = () => {
        if (index >= questions.length) return finish(score * 20);
        const [question, options, answer] = questions[index];
        root.innerHTML = `<div class="game-play-head"><span>QUESTION ${index + 1} / ${questions.length}</span><b>${score} pts</b></div><h3 class="game-question">${question}</h3><div class="game-options">${options.map((item, i) => `<button class="quiz-option" data-choice="${i}">${escapeHtml(item)}</button>`).join("")}</div>`;
        root.querySelectorAll("[data-choice]").forEach((button) => button.addEventListener("click", () => { if (Number(button.dataset.choice) === answer) score += 1; index += 1; draw(); }));
      };
      draw();
    },
    "cyber-escape": (root, finish) => {
      const codes = [
        ["2580", "Follow the center column of the number keypad."],
        ["2468", "Read the even numbers from smallest to largest."],
        ["1397", "Trace the keypad corners clockwise, starting at 1."],
      ];
      const [code, clue] = codes[Math.floor(Math.random() * codes.length)];
      root.innerHTML = `<div class="game-play-head"><span>Crack the four-digit lock</span><b>3 tries</b></div><p class="game-instruction">Clue: ${clue}</p><form class="escape-form"><input inputmode="numeric" maxlength="4" pattern="[0-9]{4}" placeholder="••••" required><button class="button button-primary">Unlock</button></form><div class="game-feedback"></div>`;
      let tries = 3, solved = false;
      root.querySelector("form").addEventListener("submit", (event) => {
        event.preventDefault();
        const guess = event.currentTarget.querySelector("input").value;
        const feedback = root.querySelector(".game-feedback");
        if (guess === code) { solved = true; feedback.textContent = "Access granted. Nice work."; feedback.className = "game-feedback correct"; }
        else { tries -= 1; feedback.textContent = `${tries} attempts remaining.`; if (!tries) { feedback.textContent = `Lockdown. The code was ${code}.`; event.currentTarget.querySelector("button").disabled = true; } }
        if (solved || !tries) window.setTimeout(() => finish(solved ? 100 : 10), 650);
      });
    },
    "memory-match": (root, finish) => {
      const symbols = ["✦", "⌖", "◈", "⌘", "☼", "✧", "✦", "⌖", "◈", "⌘", "☼", "✧"].sort(() => Math.random() - 0.5);
      root.innerHTML = `<div class="game-play-head"><span>Find all six pairs</span><b id="memory-moves">0 moves</b></div><div class="memory-board">${symbols.map((_, i) => `<button class="memory-card" data-card="${i}" aria-label="Hidden card">?</button>`).join("")}</div>`;
      let opened = [], matched = new Set(), moves = 0, locked = false;
      root.querySelectorAll(".memory-card").forEach((button) => button.addEventListener("click", () => {
        const i = Number(button.dataset.card);
        if (locked || matched.has(i) || opened.includes(i)) return;
        button.textContent = symbols[i]; button.classList.add("revealed"); opened.push(i);
        if (opened.length === 2) {
          moves += 1; root.querySelector("#memory-moves").textContent = `${moves} moves`;
          if (symbols[opened[0]] === symbols[opened[1]]) { opened.forEach((id) => matched.add(id)); opened = []; }
          else { locked = true; window.setTimeout(() => { opened.forEach((id) => { const card = root.querySelector(`[data-card="${id}"]`); card.textContent = "?"; card.classList.remove("revealed"); }); opened = []; locked = false; }, 700); }
          if (matched.size === symbols.length) window.setTimeout(() => finish(Math.max(10, 120 - moves * 5)), 500);
        }
      }));
    },
    "pattern-breaker": (root, finish) => {
      const sequence = Array.from({ length: 4 }, () => Math.floor(Math.random() * 4));
      const labels = ["✦", "⌖", "◈", "⌘"];
      root.innerHTML = `<div class="game-play-head"><span>Memorize the pattern</span><b>4 symbols</b></div><div class="pattern-display">${labels.map((label, i) => `<button class="pattern-key" data-key="${i}">${label}</button>`).join("")}</div><p class="game-instruction" id="pattern-status">Watch closely…</p>`;
      let index = 0, running = false;
      const status = root.querySelector("#pattern-status");
      sequence.forEach((key, i) => window.setTimeout(() => {
        const target = root.querySelector(`[data-key="${key}"]`); target.classList.add("lit"); window.setTimeout(() => target.classList.remove("lit"), 420);
        if (i === sequence.length - 1) window.setTimeout(() => { running = true; status.textContent = "Your turn — repeat the pattern."; }, 500);
      }, i * 650));
      root.querySelectorAll(".pattern-key").forEach((button) => button.addEventListener("click", () => {
        if (!running) return;
        const target = Number(button.dataset.key);
        if (target !== sequence[index]) { running = false; status.textContent = "Pattern broken. Give it another go."; return finish(Math.max(0, index * 20)); }
        button.classList.add("lit"); window.setTimeout(() => button.classList.remove("lit"), 260);
        index += 1;
        if (index === sequence.length) { running = false; status.textContent = "Perfect sequence!"; finish(100); }
      }));
    },
  };
  const finishGame = async (game, score, stage) => {
    if (activeGameCleanup) activeGameCleanup();
    activeGameCleanup = null;
    stage.innerHTML = `<div class="game-result"><span class="game-result-icon">✦</span><div class="eyebrow">ROUND COMPLETE</div><h2>${score} points</h2><p>Your result will be saved to your player profile.</p><button class="button button-primary" id="play-again">Play again <span>↻</span></button></div>`;
    try {
      const result = await api(`/api/games/${game._id}/play`, { method: "POST", body: JSON.stringify({ score }) });
      toast(result.message);
      document.querySelector("#play-again").addEventListener("click", () => launchGame(game, stage));
    } catch (error) { stage.querySelector(".game-result p").textContent = error.message; }
  };
  let activeGameCleanup = null;
  const launchGame = (game, stage) => {
    if (activeGameCleanup) activeGameCleanup();
    stage.hidden = false;
    stage.dataset.activeGame = game.key;
    activeGameCleanup = games[game.key](stage, (score) => finishGame(game, score, stage)) || null;
    stage.scrollIntoView({ behavior: "smooth", block: "center" });
  };
  if (page === "games") {
    const root = document.querySelector("#game-grid"), stage = document.querySelector("#game-stage");
    api("/api/games").then(({ data }) => {
      root.innerHTML = data.map((game) => `<article class="game-card glass"><span class="game-icon">${escapeHtml(game.icon)}</span><span class="category-chip">${escapeHtml(game.difficulty.toUpperCase())}</span><h3>${escapeHtml(game.name)}</h3><p>${escapeHtml(game.description)}</p><div class="game-score"><span>BEST SCORE</span><b>${game.best_score}</b></div><button class="button button-outline button-small" data-play-game="${game._id}">Play now <span>↗</span></button></article>`).join("");
      root.querySelectorAll("[data-play-game]").forEach((button) => button.addEventListener("click", () => launchGame(data.find((game) => game._id === button.dataset.playGame), stage)));
    }).catch((error) => { root.innerHTML = `<div class="empty-state">${escapeHtml(error.message)}</div>`; });
  }

  const adminFields = {
    quests: [["title", "Title", "text"], ["description", "Description", "text"], ["category", "Category: story, daily, exploration, tech, fun", "text"], ["difficulty", "Difficulty", "text"], ["xp", "XP", "number"], ["coins", "Coins", "number"], ["location", "Location", "text"], ["type", "Type: location or quiz", "text"], ["answer", "Quiz answer (optional)", "text"]],
    activities: [["title", "Activity title", "text"], ["organization", "Organization", "text"], ["category", "Category", "text"], ["date", "Date (YYYY-MM-DD)", "text"], ["time", "Time", "text"], ["location", "Location", "text"], ["xp", "XP reward", "number"]],
    locations: [["name", "Location name", "text"], ["description", "Description", "text"], ["map_x", "Map position X (0-100)", "number"], ["map_y", "Map position Y (0-100)", "number"], ["kind", "Kind", "text"]],
    rewards: [["name", "Reward name", "text"], ["description", "Description", "text"], ["cost", "Coin cost", "number"], ["icon", "Icon", "text"]],
    achievements: [["key", "Achievement key", "text"], ["name", "Achievement name", "text"], ["description", "Description", "text"], ["icon", "Icon", "text"], ["target", "Target", "number"]],
    games: [["key", "Game key", "text"], ["name", "Game name", "text"], ["description", "Description", "text"], ["difficulty", "Difficulty", "text"], ["xp", "XP reference (not awarded)", "number"], ["icon", "Icon", "text"]],
  };
  if (page === "admin") {
    let entity = "quests", editingId = null;
    const fields = document.querySelector("#admin-fields"), form = document.querySelector("#admin-create-form");
    const endpoints = { quests: "/api/admin/quests", activities: "/api/admin/activities", locations: "/api/admin/locations", rewards: "/api/admin/rewards", achievements: "/api/admin/achievements", games: "/api/admin/games", users: "/api/admin/users" };
    const showFields = (record = {}) => {
      form.hidden = entity === "users";
      if (entity === "users") { fields.innerHTML = ""; return; }
      fields.innerHTML = adminFields[entity].map(([key, label, type]) => `<label>${label}<input name="${key}" type="${type}" ${type === "number" ? 'min="0"' : ""} value="${escapeHtml(record[key] ?? "")}" ${["title", "name", "key", "description"].includes(key) ? "required" : ""}></label>`).join("");
      const objectives = record.objectives || [];
      if (entity === "quests") fields.insertAdjacentHTML("beforeend", `<label>Objectives (one per line)<textarea name="objectives" rows="3">${escapeHtml(objectives.join("\n"))}</textarea></label><label>Options (one per line)<textarea name="options" rows="2">${escapeHtml((record.options || []).join("\n"))}</textarea></label>`);
    };
    const loadAdminRecords = async () => {
      const list = document.querySelector("#admin-records");
      try {
        const { data } = await api(endpoints[entity]);
        list.innerHTML = data.map((record) => entity === "users"
          ? `<div class="admin-record"><span><b>${escapeHtml(record.full_name)} · @${escapeHtml(record.username)}</b><small>${escapeHtml(record.email)} · ${escapeHtml(record.department)} · ${record.role} · ${record.is_active ? "Active" : "Inactive"}</small></span><div><button class="text-button" data-toggle-user="${record._id}" data-active="${record.is_active}">${record.is_active ? "Deactivate" : "Activate"}</button><button class="text-button" data-role-user="${record._id}" data-role="${record.role}">${record.role === "admin" ? "Make student" : "Make admin"}</button></div></div>`
          : `<div class="admin-record"><span><b>${escapeHtml(record.title || record.name)}</b><small>${escapeHtml(record.description || record.location || record.key || "")}</small></span><div><button class="text-button" data-edit="${record._id}">Edit</button><button class="text-button danger-text" data-archive="${record._id}">Archive</button></div></div>`
        ).join("") || '<p class="muted">No records yet. Create one above.</p>';
        list.querySelectorAll("[data-toggle-user]").forEach((button) => button.addEventListener("click", async () => {
          try { await api(`/api/admin/users/${button.dataset.toggleUser}`, { method: "PUT", body: JSON.stringify({ is_active: button.dataset.active !== "true" }) }); toast("User status updated."); loadAdminRecords(); }
          catch (error) { onError(error); }
        }));
        list.querySelectorAll("[data-role-user]").forEach((button) => button.addEventListener("click", async () => {
          try { await api(`/api/admin/users/${button.dataset.roleUser}`, { method: "PUT", body: JSON.stringify({ role: button.dataset.role === "admin" ? "student" : "admin" }) }); toast("User role updated."); loadAdminRecords(); }
          catch (error) { onError(error); }
        }));
        list.querySelectorAll("[data-edit]").forEach((button) => button.addEventListener("click", () => {
          const record = data.find((item) => item._id === button.dataset.edit);
          editingId = record._id; showFields(record);
          form.querySelector("button[type=submit]").textContent = "Save changes";
          form.scrollIntoView({ behavior: "smooth" });
        }));
        list.querySelectorAll("[data-archive]").forEach((button) => button.addEventListener("click", async () => {
          if (!window.confirm("Archive this record? It will no longer appear to players.")) return;
          try { await api(`/api/admin/${entity}/${button.dataset.archive}`, { method: "DELETE" }); toast("Record archived."); loadAdminRecords(); }
          catch (error) { onError(error); }
        }));
      } catch (error) { list.innerHTML = `<p class="muted">${escapeHtml(error.message)}</p>`; }
    };
    showFields();
    document.querySelectorAll("#admin-tabs [data-entity]").forEach((button) => button.addEventListener("click", () => {
      document.querySelectorAll("#admin-tabs .filter-chip").forEach((chip) => chip.classList.remove("selected"));
      button.classList.add("selected"); entity = button.dataset.entity; editingId = null; showFields();
      document.querySelector(".admin-help").textContent = entity === "users"
        ? "Manage account activation and roles. A student never has permission to grant admin access."
        : "Records created here are persisted in MongoDB and displayed in their player-facing sections. Archiving preserves player history.";
      loadAdminRecords();
    }));
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const body = Object.fromEntries(new FormData(form));
      for (const key of ["xp", "coins", "cost", "target", "map_x", "map_y"]) if (body[key] !== undefined && body[key] !== "") body[key] = Number(body[key]);
      if (body.objectives) body.objectives = body.objectives.split("\n").map((item) => item.trim()).filter(Boolean);
      if (body.options) body.options = body.options.split("\n").map((item) => item.trim()).filter(Boolean);
      try {
        await api(editingId ? `/api/admin/${entity}/${editingId}` : `/api/admin/${entity}`, {
          method: editingId ? "PUT" : "POST", body: JSON.stringify(body),
        });
        toast(editingId ? "Record updated." : "Record created.");
        editingId = null; form.reset(); showFields(); form.querySelector("button[type=submit]").textContent = "Create record ＋"; loadAdminRecords();
      } catch (error) { onError(error); }
    });
    const list = document.createElement("div"); list.id = "admin-records"; list.className = "admin-record-list";
    form.after(list);
    loadAdminRecords();
  }
})();

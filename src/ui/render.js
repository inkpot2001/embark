import { t, getTravelLabels, getTutorialCaptions } from "./i18n.js";
import { getCutsceneLines } from "../data/cutscene.js";

const el = (id) => document.getElementById(id);

function renderNpcCard(npc, draggable = false, gameState) {
  const deadClass = npc.isDead ? "dead" : "";
  const draggableAttr = draggable && !npc.isDead ? 'draggable="true"' : "";
  const dataAttr = `data-npc-id="${npc.id}"`;
  const avatar = getNpcAvatar(npc, gameState);
  const flashClass = npc.damageFlashAt && Date.now() - npc.damageFlashAt < 800 ? "damage-flash" : "";
  const bubbleLines = [];
  if (!npc.isDead) {
    if (npc.state.stamina <= 2) bubbleLines.push(t(gameState, "tiredBubble"));
    if (npc.state.morale <= 3) bubbleLines.push(t(gameState, "hopelessBubble"));
  }
  const bubbles = bubbleLines.length
    ? `
      <div class="npc-bubbles" aria-hidden="true">
        ${bubbleLines.map((line) => `<div class="npc-bubble">${line}</div>`).join("")}
      </div>
    `
    : "";
  return `
    <div class="npc-card ${deadClass} ${flashClass}" ${draggableAttr} ${dataAttr}>
      ${bubbles}
      <div class="npc-top">
        <div class="npc-meta">
          <div class="npc-avatar" aria-hidden="true">${avatar}</div>
          <h3 class="npc-name-top">${npc.name}</h3>
          ${renderHealth(npc, gameState)}
          ${renderStatusBars(npc, gameState)}
        </div>
      </div>
      ${renderSkillBars(npc.skills, gameState)}
      <div class="npc-name-footer">${npc.name}</div>
    </div>
  `;
}

function getNpcAvatar(npc, gameState) {
  const src = getNpcAvatarSrc(npc);
  if (!src) return "";
  const alt = npc.isDead ? t(gameState, "dead") : npc.name;
  return `<img src="${src}" alt="${alt}" class="avatar-img">`;
}

function getNpcAvatarSrc(npc) {
  if (!npc) return "";
  if (npc.isDead) return "./skull.png";
  const morale = Number(npc.state.morale ?? 0);
  const bucket =
    morale <= 2 ? "0-2" :
    morale <= 4 ? "3-4" :
    morale <= 7 ? "5-7" :
    morale <= 9 ? "8-9" : "10";
  const availableBuckets = {
    yabi: ["0-2", "3-4", "5-7", "8-9", "10"],
    hishor: ["0-2", "3-4", "5-7", "8-9", "10"],
    nayuka: ["0-2", "3-4", "5-7", "8-9", "10"],
    cubiri: ["0-2", "3-4", "5-7", "8-9", "10"],
    kobu: ["5-7", "8-9", "10"]
  };
  const hasBucket = availableBuckets[npc.id]?.includes(bucket);
  const rangedSrc = `./npc avater pics/${npc.id}${bucket}.png`;
  const fallbackSrc = npc.id === "kobu"
    ? "./npc avater pics/kobu5-7.png"
    : `./npc avater pics/${npc.id}.png`;
  return hasBucket ? rangedSrc : fallbackSrc;
}

function getNpcPortrait(npc, gameState) {
  if (npc.isDead) return "💀";
  const map = {
    yabi: `<img src="./npc avater pics/yabi.png" alt="${t(gameState, "portraitAlt", { name: "Yabi" })}" class="npc-profile-img">`,
    hishor: `<img src="./npc avater pics/hishor.png" alt="${t(gameState, "portraitAlt", { name: "Hishor" })}" class="npc-profile-img">`,
    nayuka: `<img src="./npc avater pics/nayuka.png" alt="${t(gameState, "portraitAlt", { name: "Nayuka" })}" class="npc-profile-img">`,
    cubiri: `<img src="./npc avater pics/cubiri.png" alt="${t(gameState, "portraitAlt", { name: "Cubiri" })}" class="npc-profile-img">`,
    kobu: `<img src="./npc avater pics/kobu.png" alt="${t(gameState, "portraitAlt", { name: "Kobu" })}" class="npc-profile-img">`
  };
  return map[npc.id] || '<div class="npc-profile-img placeholder">🙂</div>';
}

function renderHealth(npc, gameState) {
  const maxHealth = 5;
  const current = Math.max(0, Math.min(maxHealth, npc.state.health ?? 0));
  const hearts = Array.from({ length: maxHealth }, (_, idx) => {
    const filled = idx < current;
    return `<img src="./heart.png" alt="${filled ? t(gameState, "heart") : t(gameState, "lostHeart")}" class="heart-icon${filled ? "" : " heart-icon--lost"}">`;
  }).join("");
  return `<div class="health-row" aria-label="${t(gameState, "healthAria", { current, max: maxHealth })}"><span class="health-hearts">${hearts}</span></div>`;
}

function renderSkillBars(skills, gameState) {
  const maxVal = 10;
  const rows = [
    { label: "💪", key: "physique", className: "skill-physique", display: t(gameState, "physique") },
    { label: "🧠", key: "intellect", className: "skill-intellect", display: t(gameState, "intellect") },
    { label: "🗣️", key: "charisma", className: "skill-charisma", display: t(gameState, "charisma") }
  ];
  return `
    <div class="skill-bars">
      ${rows.map((row) => {
        const val = skills[row.key] ?? 0;
        const pct = Math.min(100, Math.max(0, (val / maxVal) * 100));
        return `
          <div class="skill-row ${row.className}">
            <div class="skill-label">${row.label} ${val}</div>
            <div class="skill-bar">
              <div class="skill-fill" style="width:${pct}%"></div>
            </div>
          </div>
        `;
      }).join("")}
    </div>
  `;
}

function renderStatusBars(npc, gameState) {
  const staminaMax = 5;
  const stamina = Math.max(0, Math.min(staminaMax, npc.state.stamina ?? 0));
  const staminaPct = Math.round((stamina / staminaMax) * 100);
  return `
    <div class="status-bars">
      <div class="status-row">
        <div class="status-bar" aria-label="${t(gameState, "stamina")} ${stamina}/${staminaMax}">
          <div class="status-fill" style="width:${staminaPct}%"></div>
        </div>
        <div class="status-label">${t(gameState, "stamina")}</div>
      </div>
    </div>
  `;
}

function resolveSpeakerNpc(speaker, gameState) {
  const speakerAliases = {
    ナユカ: "nayuka",
    ヒショル: "hishor",
    ヤビ: "yabi",
    クビリ: "cubiri",
    コブ: "kobu"
  };
  if (!speaker) return null;
  let npc = gameState.npcs.find((n) => n.name === speaker) || null;
  if (!npc && speakerAliases[speaker]) {
    const alias = speakerAliases[speaker];
    npc = gameState.npcs.find((n) => n.id === alias || n.name === alias) || null;
  }
  return npc;
}

function renderDialogueLine(line, gameState, opts = {}) {
  const { typewriter = false } = opts;
  const [rawSpeaker, ...rest] = line.split(":");
  const speaker = rest.length ? rawSpeaker.trim() : "";
  const text = rest.length ? rest.join(":").trim() : line;
  const npc = resolveSpeakerNpc(speaker, gameState);
  const avatar = npc ? getNpcAvatar(npc, gameState) : "";
  const typingClass = typewriter ? " is-typing" : "";
  const label = speaker ? `<strong class="conversation-speaker">${speaker}:</strong>` : "";
  const bodyClass = speaker ? "conversation-text-body" : "";
  return `
    <div class="conversation-line${typingClass}">
      <div class="conversation-avatar${avatar ? "" : " is-empty"}">
        ${avatar}
      </div>
      <div class="conversation-text">${speaker ? `${label} <span class="${bodyClass}">${text}</span>` : text}</div>
    </div>
  `;
}

function runTypewriter(modal) {
  if (!modal) return;
  if (modal._typewriterTimers) {
    modal._typewriterTimers.forEach((timer) => clearInterval(timer));
  }
  modal._typewriterTimers = [];

  const targets = modal.querySelectorAll(".conversation-line.is-typing .conversation-text-body");
  targets.forEach((typeTarget) => {
    const fullText = typeTarget.textContent || "";
    typeTarget.textContent = "";
    let idx = 0;
    const timer = setInterval(() => {
      idx += 1;
      typeTarget.textContent = fullText.slice(0, idx);
      if (idx >= fullText.length) {
        clearInterval(timer);
      }
    }, 18);
    modal._typewriterTimers.push(timer);
  });
}

function renderHeader(gameState) {
  const header = el("header-panel");
  const goal = 20;
  const pct = Math.min(100, Math.max(0, Math.round((gameState.distanceTraveled / goal) * 100)));
  const linePoints = [
    { x: 0, y: 1 },
    { x: 1, y: 4 },
    { x: 2, y: 10 },
    { x: 3, y: 6 },
    { x: 4, y: 1 },
    { x: 5, y: 5 },
    { x: 6, y: 3 },
    { x: 7, y: 1 },
    { x: 8, y: 3 },
    { x: 9, y: 2 },
    { x: 10, y: 6 },
    { x: 11, y: 1 },
    { x: 12, y: 10 },
    { x: 13, y: 4 },
    { x: 14, y: 8 },
    { x: 15, y: 1 },
    { x: 16, y: 2 },
    { x: 17, y: 4 },
    { x: 18, y: 10 },
    { x: 19, y: 3 },
    { x: 20, y: 1 }
  ];
  const linePointsStr = linePoints.map((pt) => `${pt.x},${pt.y}`).join(" ");
  const getLinePoint = (x) => {
    if (x <= linePoints[0].x) return linePoints[0];
    for (let i = 0; i < linePoints.length - 1; i += 1) {
      const a = linePoints[i];
      const b = linePoints[i + 1];
      if (x <= b.x) {
        const t = (x - a.x) / (b.x - a.x || 1);
        return { x, y: a.y + (b.y - a.y) * t };
      }
    }
    return linePoints[linePoints.length - 1];
  };
  const markerX = Math.max(0, Math.min(20, gameState.distanceTraveled));
  const marker = getLinePoint(markerX);
  const markerLeft = (marker.x / 20) * 100;
  const markerTop = (1 - marker.y / 10) * 100;
  const markerPulseClass = gameState.phase === "morning" ? " is-pulsing" : "";
  const winterMarkerX = Math.max(0, Math.min(20, gameState.day >= 2 ? (gameState.blueMarkerPos || 0) : 0));
  const winterMarkerPoint = getLinePoint(winterMarkerX);
  const winterMarkerLeft = (winterMarkerPoint.x / 20) * 100;
  const winterMarkerTop = (1 - winterMarkerPoint.y / 10) * 100;
  const winterClipWidth = winterMarkerLeft;
  const winterMarker = gameState.day >= 2
    ? `<div class="header-progress-marker-winter" style="left:${winterMarkerLeft}%; top:${winterMarkerTop}%;"></div>`
    : "";
  const winterSnow = gameState.day >= 2
    ? `<div class="map-snow" style="width:${winterClipWidth}%;"></div>`
    : "";
  header.innerHTML = `
    <div class="header-top">
      <div class="header-actions header-actions--center">${t(gameState, "dayLabel", { day: gameState.day })}</div>
    </div>
    <div class="header-progress">
      <div class="header-progress-stack">
        <div class="header-progress-labels">
          <span>${t(gameState, "journeyStart")}</span>
          <span class="header-progress-goal">${t(gameState, "progressText", { pct })}</span>
        </div>
        <div class="header-progress-graph" aria-hidden="true">
          <svg viewBox="0 0 20 10" preserveAspectRatio="none">
            <defs>
              <clipPath id="winter-clip">
                <rect x="0" y="0" width="${winterClipWidth}%" height="100%"></rect>
              </clipPath>
            </defs>
            <polygon
              points="0,0 ${linePointsStr} 20,0"
              class="header-progress-fill-area"
            />
            <polyline
              points="${linePointsStr}"
              fill="none"
              class="header-progress-line"
            />
            <polyline
              points="${linePointsStr}"
              fill="none"
              class="header-progress-line header-progress-line--winter"
              clip-path="url(#winter-clip)"
            />
          </svg>
          ${winterSnow}
          ${winterMarker}
          <div class="header-progress-marker-dot${markerPulseClass}" style="left:${markerLeft}%; top:${markerTop}%;"></div>
        </div>
      </div>
    </div>
  `;
}

function renderSettingsModal(gameState) {
  let modal = document.getElementById("settings-modal");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "settings-modal";
    document.body.appendChild(modal);
  }

  if (!gameState.showSettingsModal) {
    modal.className = "settings-modal";
    modal.style.display = "none";
    modal.innerHTML = "";
    return;
  }

  modal.style.display = "flex";
  modal.className = "settings-modal open";
  modal.innerHTML = `
    <div class="conversation-overlay" data-action="close-settings"></div>
    <div class="settings-window">
      <div class="settings-header">
        <h2>${t(gameState, "settingsTitle")}</h2>
        <button class="button secondary" id="settings-close">${t(gameState, "close")}</button>
      </div>
      <div class="settings-body">
        <div class="settings-section">
          <h3>${t(gameState, "languages")}</h3>
          <div class="settings-options">
            <button class="button secondary ${gameState.language === "en" ? "is-selected" : ""}" type="button" data-language="en">${t(gameState, "english")}</button>
            <button class="button secondary ${gameState.language === "ja" ? "is-selected" : ""}" type="button" data-language="ja">${t(gameState, "japanese")}</button>
          </div>
        </div>
        <div class="settings-section">
          <h3>${t(gameState, "sound")}</h3>
          <div class="settings-options">
            <button class="button secondary ${gameState.soundOn ? "is-selected" : ""}" type="button" id="sound-toggle">
              ${gameState.soundOn ? t(gameState, "soundOn") : t(gameState, "soundOff")}
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderStatusBlock(gameState) {
  if (gameState.phase !== "morning") return "";

  const travelLabels = getTravelLabels(gameState);
  const travelLabel = travelLabels[gameState.plannedTravelToday] || travelLabels[0];

  return `
    <div class="status-block">
      <label for="travel-input">${t(gameState, "travelDistance")}: <span id="travel-value">${travelLabel}</span></label>
      <div class="travel-slider">
        <img src="./stay.png" alt="${t(gameState, "stay")}" class="travel-icon travel-icon--left">
        <input type="range" id="travel-input" min="0" max="4" step="1" value="${gameState.plannedTravelToday}">
        <img src="./walk.png" alt="${t(gameState, "walk")}" class="travel-icon travel-icon--right">
      </div>
      <div class="travel-actions">
        <button class="button image-button" id="confirm-travel" aria-label="${t(gameState, "confirmTravel")}">
          <img src="./embark.png" alt="${t(gameState, "embark")}">
        </button>
      </div>
    </div>
  `;
}

function renderNpcs(gameState) {
  const npcPanel = el("npc-panel");
  const assignedIds = new Set(gameState.tasksToday.flatMap((t) => t.assignedNpcIds || []));
  const available = gameState.npcs.filter((npc) => !assignedIds.has(npc.id));

  const availableCards = available.map((npc) => renderNpcCard(npc, gameState.phase === "assign", gameState)).join("");
  const poolClass = available.length ? "drop-target" : "drop-target empty";

  npcPanel.innerHTML = `
    <div id="npc-pool" class="${poolClass}" data-drop-target="pool">
      ${availableCards || `<div class='muted'>${t(gameState, "noFree")}</div>`}
    </div>
  `;
}

function renderTaskAssignments(gameState) {
  const allNpcs = gameState.npcs;

  const renderRequirementBars = (task) => {
    const assigned = task.assignedNpcIds
      .map((id) => allNpcs.find((n) => n.id === id))
      .filter(Boolean);

    const totals = { physique: 0, intellect: 0, charisma: 0 };
    assigned.forEach((npc) => {
      if (npc.isDead) return;
      totals.physique += npc.skills.physique || 0;
      totals.intellect += npc.skills.intellect || 0;
      totals.charisma += npc.skills.charisma || 0;
    });

    const maxScale = 20;

    const rows = [
      { key: "physique", label: t(gameState, "physique") },
      { key: "intellect", label: t(gameState, "intellect") },
      { key: "charisma", label: t(gameState, "charisma") }
    ];

    return `
      <div class="task-req-bars">
        ${rows.map((row) => {
          const req = task.requiredSkills[row.key] || 0;
          const have = totals[row.key] || 0;
          const reqPct = Math.min(maxScale, req) / maxScale * 100;
          const havePct = Math.min(maxScale, have) / maxScale * 100;
          return `
            <div class="task-req-row">
              <div class="task-req-label">${row.label} ${have}/${req}</div>
              <div class="task-req-bar">
                <div class="task-req-fill required" style="width:${reqPct}%"></div>
                <div class="task-req-fill assigned" style="width:${havePct}%"></div>
              </div>
            </div>
          `;
        }).join("")}
      </div>
    `;
  };

  return gameState.tasksToday.map((task, idx) => {
    const assignedNpcs = task.assignedNpcIds.map((id) => allNpcs.find((n) => n.id === id)).filter(Boolean);
    const assignedStack = assignedNpcs.map((npc, idx) => {
      return `
        <div class="assigned-card-wrapper" style="z-index:${idx + 1};">
          ${renderNpcCard(npc, true, gameState)}
        </div>
      `;
    }).join("");
    const statusClass = task.lastOutcome === "success" ? "task-success" : task.lastOutcome === "fail" ? "task-fail" : "";
    const statusStamp = task.lastOutcome
      ? `<div class="task-stamp ${task.lastOutcome === "success" ? "stamp-success" : "stamp-fail"}">${task.lastOutcome === "success" ? t(gameState, "passed") : t(gameState, "failed")}</div>`
      : "";
    const penaltyWho = task.penaltyTaker === "all"
      ? `<span class="task-penalty-all">${t(gameState, "penaltyAll")}</span>`
      : t(gameState, "penaltyAssigned");
    const penaltyText = task.penalty && task.penalty > 0
      ? t(gameState, "penaltyText", {
          who: penaltyWho,
          damage: task.penalty
        })
      : "";
    const typeClass = task.id === "talk" ? "task-card--talk" : task.id === "rest" ? "task-card--rest" : "";
    return `
      <div class="task-item">
        <div class="task-card ${statusClass} ${typeClass}" data-task-id="${task.id}">
          ${statusStamp}
          <h3>${task.name}</h3>
        <p>${task.description}</p>
        ${renderRequirementBars(task)}
        <div class="task-meta">${penaltyText}</div>
        </div>
        ${assignedStack ? `<div class="assigned-stack">${assignedStack}</div>` : ""}
      </div>
    `;
  }).join("");
}

function renderTasks(gameState) {
  const taskPanel = el("task-panel");
  taskPanel.className = "";
  taskPanel.classList.add(`phase-${gameState.phase}`);
  const animateTasks = gameState.taskAnimationPending && gameState.phase === "assign";
  if (gameState.isLoadingTasks) {
    taskPanel.innerHTML = `
      <h2>${t(gameState, "preparingTasks")}</h2>
      <div class="loader-spinner"></div>
      <p class="muted">${t(gameState, "consulting")}</p>
    `;
    return;
  }
  const statusBlock = renderStatusBlock(gameState);
  if (gameState.phase === "morning") {
    taskPanel.innerHTML = `
      <h2>${t(gameState, "morning")}</h2>
      ${statusBlock}
      <p>${t(gameState, "morningTip")}</p>
    `;
    return;
  }

  if (gameState.phase === "assign") {
    const tasksGridClass = animateTasks ? "tasks-grid animate-tasks" : "tasks-grid";
    if (gameState.taskAnimationPending) {
      gameState.taskAnimationPending = false;
    }
    taskPanel.innerHTML = `
      <h2>${t(gameState, "daytime")}</h2>
      ${statusBlock}
      <div class="${tasksGridClass}">
        ${renderTaskAssignments(gameState)}
      </div>
      <button class="button image-button" id="simulate-day" aria-label="${t(gameState, "simulateDay")}">
        <img src="./simulateday.png" alt="${t(gameState, "simulateDay")}">
      </button>
    `;
    return;
  }

  if (gameState.phase === "night") {
    taskPanel.innerHTML = `
      <h2>${t(gameState, "nightfall")}</h2>
      ${statusBlock}
      <div class="tasks-grid">
        ${renderTaskAssignments(gameState)}
      </div>
      <button class="button image-button" id="next-day" aria-label="${t(gameState, "nextDay")}">
        <img src="./endday.png" alt="${t(gameState, "nextDay")}">
      </button>
    `;
    return;
  }

  if (gameState.phase === "gameover") {
    document.body.classList.add("is-journey-end");
    const text = gameState.gameOverReason === "win" ? t(gameState, "winText") : t(gameState, "loseText");
    taskPanel.innerHTML = `
      <h2>${t(gameState, "journeyEnd")}</h2>
      ${statusBlock}
      <p>${text}</p>
    `;
    return;
  }

  if (gameState.phase === "ending") {
    document.body.classList.add("is-journey-end");
    taskPanel.innerHTML = `
      <h2>${t(gameState, "journeyEnd")}</h2>
      ${statusBlock}
      <p>${t(gameState, "processing")}</p>
    `;
    return;
  }

  document.body.classList.remove("is-journey-end");

  taskPanel.innerHTML = `<h2>${t(gameState, "tasks")}</h2><p>${t(gameState, "processing")}</p>`;
}

function renderLog(gameState) {
  const logPanel = el("log-panel");
  const isVisible = gameState.logVisible !== false;
  logPanel.style.display = isVisible ? "" : "none";
  const total = gameState.log.length;
  const entries = gameState.log
    .slice()
    .reverse()
    .map((entry, idx) => `<div class="log-entry">${total - idx}. ${entry}</div>`)
    .join("");
  logPanel.innerHTML = `
    <h2>${t(gameState, "log")}</h2>
    ${entries || `<p>${t(gameState, "noEvents")}</p>`}
  `;
}

function renderLogToggle(gameState) {
  let btn = document.getElementById("toggle-log");
  if (!btn) {
    btn = document.createElement("button");
    btn.id = "toggle-log";
    btn.className = "button secondary log-toggle";
    document.body.appendChild(btn);
  }
  btn.textContent = gameState.logVisible ? t(gameState, "hideLog") : t(gameState, "showLog");
}

function renderDebugButton() {
  let btn = document.getElementById("debug-open");
  if (!btn) {
    btn = document.createElement("button");
    btn.id = "debug-open";
    btn.className = "button secondary debug-toggle";
    btn.textContent = "Debug";
    document.body.appendChild(btn);
  }
}

function renderTutorialButton(gameState) {
  let btn = document.getElementById("tutorial-open");
  if (!btn) {
    btn = document.createElement("button");
    btn.id = "tutorial-open";
    btn.className = "button secondary tutorial-toggle";
    document.body.appendChild(btn);
  }
  btn.textContent = t(gameState, "howToPlay");
}

function renderSettingsButton(gameState) {
  let btn = document.getElementById("settings-open");
  if (!btn) {
    btn = document.createElement("button");
    btn.id = "settings-open";
    btn.className = "button secondary settings-toggle";
    document.body.appendChild(btn);
  }
  btn.textContent = t(gameState, "settings");
}

function renderDiaryButton(gameState) {
  if (gameState.showIntroModal || gameState.showCutscene) {
    const existing = document.getElementById("diary-open");
    if (existing) existing.remove();
    return;
  }
  let btn = document.getElementById("diary-open");
  if (!btn) {
    btn = document.createElement("button");
    btn.id = "diary-open";
    btn.className = "diary-toggle";
    btn.type = "button";
    btn.setAttribute("aria-label", t(gameState, "diary"));
    btn.innerHTML = `
      <img src="./diary.png" alt="${t(gameState, "diary")}" class="diary-icon">
      <span class="diary-label">Diary</span>
    `;
    document.body.appendChild(btn);
  }
}

function renderVaseButton(gameState) {
  if (gameState.showIntroModal || gameState.showCutscene) {
    const existing = document.getElementById("vase-open");
    if (existing) existing.remove();
    return;
  }
  let btn = document.getElementById("vase-open");
  if (!btn) {
    btn = document.createElement("button");
    btn.id = "vase-open";
    btn.className = "vase-toggle";
    btn.type = "button";
    btn.setAttribute("aria-label", "Vase");
    btn.innerHTML = `
      <img src="./vase.png" alt="Vase" class="vase-icon">
      <span class="vase-label">Relationships</span>
    `;
    document.body.appendChild(btn);
  }
}

function renderDebugModal(gameState) {
  let modal = document.getElementById("debug-modal");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "debug-modal";
    document.body.appendChild(modal);
  }

  if (!gameState.showDebugModal) {
    modal.className = "debug-modal";
    modal.style.display = "none";
    modal.innerHTML = "";
    return;
  }

  const worldControls = `
    <div class="debug-row">
      <div class="debug-name">World</div>
      <label class="debug-field">
        <span>Day</span>
        <input type="number" min="1" max="99" step="1" value="${gameState.day}" data-debug-field="day">
      </label>
      <label class="debug-field">
        <span>Distance</span>
        <input type="number" min="0" max="20" step="1" value="${gameState.distanceTraveled}" data-debug-field="distance">
      </label>
      <label class="debug-field">
        <span>Winter</span>
        <input type="number" min="0" max="20" step="1" value="${gameState.blueMarkerPos ?? 0}" data-debug-field="winter">
      </label>
    </div>
  `;

  const npcRows = gameState.npcs.map((npc) => `
    <div class="debug-row">
      <div class="debug-name">${npc.name}</div>
      <label class="debug-field">
        <span>HP</span>
        <input type="number" min="0" max="5" step="1" value="${npc.state.health}" data-debug-field="health" data-npc-id="${npc.id}">
      </label>
      <label class="debug-field">
        <span>STM</span>
        <input type="number" min="0" max="5" step="1" value="${npc.state.stamina}" data-debug-field="stamina" data-npc-id="${npc.id}">
      </label>
      <label class="debug-field">
        <span>MOR</span>
        <input type="number" min="0" max="10" step="1" value="${npc.state.morale}" data-debug-field="morale" data-npc-id="${npc.id}">
      </label>
    </div>
  `).join("");

  modal.style.display = "flex";
  modal.className = "debug-modal open";
  modal.innerHTML = `
    <div class="conversation-overlay" data-action="close-debug"></div>
    <div class="debug-window">
      <div class="debug-header">
        <h2>Debug</h2>
        <button class="button secondary" id="debug-close">Close</button>
      </div>
      <div class="debug-body">
        ${worldControls}
        ${npcRows}
      </div>
    </div>
  `;
}

function renderDiaryModal(gameState) {
  let modal = document.getElementById("diary-modal");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "diary-modal";
    document.body.appendChild(modal);
  }

  if (!gameState.showDiaryModal || gameState.showIntroModal || gameState.showCutscene) {
    modal.className = "diary-modal";
    modal.style.display = "none";
    modal.innerHTML = "";
    return;
  }

  modal.style.display = "flex";
  modal.className = "diary-modal open";
  const highlightNames = (text) => {
    if (!text) return "";
    const names = (gameState.npcs || []).map((npc) => npc.name).filter(Boolean);
    if (!names.length) return text;
    const escape = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return names.reduce((acc, name) => {
      const pattern = new RegExp(`\\b${escape(name)}\\b`, "g");
      return acc.replace(pattern, `<strong>${name}</strong>`);
    }, text);
  };
  modal.innerHTML = `
    <div class="conversation-overlay" data-action="close-diary"></div>
    <div class="diary-window">
      <div class="diary-header">
        <h2>${t(gameState, "diary")}</h2>
      </div>
      <div class="diary-body">
        ${(gameState.diaryEntries || [])
          .map((entry) => `
            <div class="diary-entry">
              <h3>${entry.title}</h3>
              <p>${highlightNames(entry.body)}</p>
            </div>
          `)
          .join("")}
      </div>
    </div>
  `;

  const diaryBody = modal.querySelector(".diary-body");
  if (diaryBody) {
    diaryBody.scrollTop = diaryBody.scrollHeight;
  }
}

function renderNpcProfileModal(gameState) {
  let modal = document.getElementById("npc-profile-modal");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "npc-profile-modal";
    document.body.appendChild(modal);
  }

  const npc = gameState.npcs.find((n) => n.id === gameState.npcProfileId);
  const shouldShow = gameState.showNpcProfile && npc;

  if (!shouldShow) {
    modal.className = "npc-profile-modal";
    modal.style.display = "none";
    modal.innerHTML = "";
    return;
  }

  modal.style.display = "flex";
  modal.className = "npc-profile-modal open";
  modal.innerHTML = `
    <div class="conversation-overlay" data-action="close-npc-profile"></div>
    <div class="npc-profile-window">
      <div class="npc-profile-header">
        <button class="button secondary" id="npc-profile-close">${t(gameState, "close")}</button>
      </div>
      <div class="npc-profile-body">
        <div class="npc-profile-content">
          <div class="npc-profile-portrait">
            <div class="npc-profile-portrait-frame">${getNpcPortrait(npc, gameState)}</div>
            <div class="npc-profile-name">${npc.name}</div>
          </div>
          <div class="npc-profile-details">
            <h3>${t(gameState, "backstory")}</h3>
            <p class="npc-profile-backstory">${(gameState.language === "ja" ? (npc.backstoryJa || npc.backstory) : npc.backstory) || t(gameState, "noBackstory")}</p>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderIntroModal(gameState) {
  let modal = document.getElementById("intro-modal");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "intro-modal";
    document.body.appendChild(modal);
  }

  if (!gameState.showIntroModal) {
    modal.className = "intro-modal";
    modal.style.display = "none";
    modal.innerHTML = "";
    return;
  }

  modal.style.display = "flex";
  modal.className = "intro-modal open";
  modal.innerHTML = `
    <div class="title-screen">
      <div class="title-screen__content">
        <div class="title-screen__language">
          <div class="settings-options">
            <button class="button secondary ${gameState.language === "en" ? "is-selected" : ""}" type="button" data-language="en">${t(gameState, "english")}</button>
            <button class="button secondary ${gameState.language === "ja" ? "is-selected" : ""}" type="button" data-language="ja">${t(gameState, "japanese")}</button>
          </div>
        </div>
        <button class="button title-screen__start" id="title-start">${t(gameState, "startJourney")}</button>
        <button class="button secondary title-screen__skip" id="title-skip">${t(gameState, "skipIntro")}</button>
      </div>
    </div>
  `;
}

function renderCutsceneModal(gameState) {
  let modal = document.getElementById("cutscene-modal");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "cutscene-modal";
    document.body.appendChild(modal);
  }

  if (!gameState.showCutscene) {
    modal.className = "cutscene-modal";
    modal.style.display = "none";
    modal.innerHTML = "";
    return;
  }

  const lines = getCutsceneLines(gameState);
  const clampedIndex = Math.min(Math.max(gameState.cutsceneIndex || 0, 0), Math.max(lines.length - 1, 0));
  const nextLabel = clampedIndex < lines.length - 1 ? t(gameState, "nextLine") : t(gameState, "beginJourney");
  const visibleLines = lines.slice(0, clampedIndex + 1);
  const currentLine = lines[clampedIndex] || "";
  const [rawSpeaker] = currentLine.split(":");
  const speakerName = rawSpeaker ? rawSpeaker.trim() : "";
  const speakerNpc = resolveSpeakerNpc(speakerName, gameState);
  const speakerAvatar = speakerNpc ? getNpcAvatarSrc(speakerNpc) : "";
  const speakerBg = speakerAvatar
    ? `<img class="conversation-window-bg" src="${speakerAvatar}" alt="" aria-hidden="true">`
    : "";

  modal.style.display = "flex";
  modal.className = "cutscene-modal open";
  modal.innerHTML = `
    <div class="cutscene-frame">
      <div class="conversation-window cutscene-window">
        ${speakerBg}
        <div class="conversation-header">
          <h2>${t(gameState, "openingCutscene")}</h2>
        </div>
        <div class="conversation-body">
          <div class="conversation-block">
            ${visibleLines
              .map((line, idx) =>
                renderDialogueLine(line, gameState, { typewriter: idx === visibleLines.length - 1 })
              )
              .join("")}
          </div>
        </div>
        <div class="cutscene-actions">
          <button class="button cutscene-continue" id="cutscene-next">${nextLabel}</button>
        </div>
      </div>
    </div>
  `;
  runTypewriter(modal);
  const cutsceneBody = modal.querySelector(".conversation-body");
  if (cutsceneBody) {
    cutsceneBody.scrollTop = cutsceneBody.scrollHeight;
  }
}

function renderEndingCutsceneModal(gameState) {
  let modal = document.getElementById("ending-cutscene-modal");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "ending-cutscene-modal";
    document.body.appendChild(modal);
  }

  if (!gameState.showEndingCutscene) {
    modal.className = "cutscene-modal";
    modal.style.display = "none";
    modal.innerHTML = "";
    return;
  }

  const lines = gameState.endingCutsceneLines || [];
  const maxIndex = Math.max(lines.length - 1, 0);
  const currentIndex = Math.min(Math.max(gameState.endingCutsceneIndex || 0, 0), maxIndex);
  const visibleLines = lines.slice(0, currentIndex + 1);
  const isFinal = currentIndex >= maxIndex;
  const nextLabel = isFinal ? t(gameState, "close") : t(gameState, "nextLine");

  modal.style.display = "flex";
  modal.className = "cutscene-modal open ending-cutscene-modal";
  modal.innerHTML = `
    <div class="conversation-overlay" data-action="close-ending-cutscene"></div>
    <div class="conversation-window cutscene-window">
      <div class="conversation-header">
        <h2>${t(gameState, "journeyEnd")}</h2>
      </div>
      <div class="conversation-body">
        <div class="conversation-block">
          ${visibleLines
            .map((line, idx) =>
              renderDialogueLine(line, gameState, { typewriter: idx === visibleLines.length - 1 })
            )
            .join("")}
        </div>
      </div>
      <div class="cutscene-actions">
        <button class="button cutscene-continue" id="ending-cutscene-next">${nextLabel}</button>
      </div>
    </div>
  `;
  runTypewriter(modal);
  const cutsceneBody = modal.querySelector(".conversation-body");
  if (cutsceneBody) {
    cutsceneBody.scrollTop = cutsceneBody.scrollHeight;
  }
}

function renderConversationModal(gameState) {
  let modal = document.getElementById("conversation-modal");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "conversation-modal";
    document.body.appendChild(modal);
  }

  const hasConversations = (gameState.conversations?.length || 0) > 0;
  const hasSuccesses = (gameState.successNarratives?.length || 0) > 0;
  const hasFailures = (gameState.failureNarratives?.length || 0) > 0;
  const shouldShow = gameState.showConversationModal && (hasConversations || hasSuccesses || hasFailures);

  if (!shouldShow) {
    modal.className = "conversation-modal";
    modal.style.display = "none";
    modal.innerHTML = "";
    return;
  }

  modal.style.display = "flex";
  modal.className = "conversation-modal open";
  const step = gameState.conversationStep || (hasConversations
    ? { section: "camp", blockIndex: 0, lineIndex: 0 }
    : hasSuccesses
      ? { section: "success", blockIndex: 0, lineIndex: 0 }
      : { section: "failure", blockIndex: 0, lineIndex: 0 });
  const isFailure = step.section === "failure";
  const isSuccess = step.section === "success";
  const blocks = isFailure
    ? gameState.failureNarratives
    : isSuccess
      ? gameState.successNarratives
      : gameState.conversations;
  const activeBlock = blocks[step.blockIndex] || blocks[0];
  const lines = activeBlock?.lines || [];
  const lastIndex = Math.max(lines.length - 1, 0);
  const currentIndex = Math.min(Math.max(step.lineIndex || 0, 0), lastIndex);
  const visibleLines = lines.slice(0, currentIndex + 1);
  const isFinalBlock = step.blockIndex >= blocks.length - 1;
  const hasNextSection = step.section === "camp"
    ? (hasSuccesses || hasFailures)
    : step.section === "success"
      ? hasFailures
      : false;
  const isFinalSection = isFinalBlock && currentIndex >= lastIndex && !hasNextSection;
  const nextLabel = isFinalSection ? t(gameState, "close") : t(gameState, "nextLine");
  const taskTitle = activeBlock?.taskName || "";
  const headerLabel = isFailure
    ? `${taskTitle} (${t(gameState, "failed")})`
    : isSuccess
      ? `${taskTitle} (${t(gameState, "passed")})`
      : t(gameState, "campChatter");
  const windowClass = isFailure
    ? "conversation-window failure-window"
    : isSuccess
      ? "conversation-window success-window"
      : "conversation-window";
  const blockClass = isFailure
    ? "conversation-block failure-block"
    : isSuccess
      ? "conversation-block success-block"
      : "conversation-block";
  const currentLine = visibleLines[visibleLines.length - 1] || "";
  const [rawSpeaker] = currentLine.split(":");
  const speakerName = rawSpeaker ? rawSpeaker.trim() : "";
  const speakerNpc = resolveSpeakerNpc(speakerName, gameState);
  const speakerAvatar = speakerNpc ? getNpcAvatarSrc(speakerNpc) : "";
  const speakerBg = speakerAvatar
    ? `<img class="conversation-window-bg" src="${speakerAvatar}" alt="" aria-hidden="true">`
    : "";

  modal.innerHTML = `
    <div class="conversation-overlay" data-action="close-conversation"></div>
    <div class="conversation-stack">
      <div class="${windowClass}">
        ${speakerBg}
        <div class="conversation-header">
          <h2>${headerLabel}</h2>
        </div>
        <div class="conversation-body">
          <div class="${blockClass}">
            ${isFailure || isSuccess ? "" : `<h3>${taskTitle}</h3>`}
            ${visibleLines
              .map((line, idx) =>
                renderDialogueLine(line, gameState, { typewriter: idx === visibleLines.length - 1 })
              )
              .join("")}
          </div>
        </div>
        <div class="conversation-actions">
          <button class="button" id="conversation-next">${nextLabel}</button>
        </div>
      </div>
    </div>
  `;
  runTypewriter(modal);
}

function renderMoonModal(gameState) {
  let modal = document.getElementById("moon-modal");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "moon-modal";
    document.body.appendChild(modal);
  }

  if (!gameState.showMoonModal || gameState.showIntroModal || gameState.showCutscene) {
    modal.className = "moon-modal";
    modal.style.display = "none";
    modal.innerHTML = "";
    return;
  }

  modal.style.display = "flex";
  modal.className = "moon-modal open";
  const moonNpcIds = ["yabi", "hishor", "nayuka", "cubiri", "kobu"];
  const radiusPx = 200;
  const moonPositions = moonNpcIds
    .map((id) => gameState.npcs.find((npc) => npc.id === id))
    .filter(Boolean)
    .map((npc, idx, arr) => {
      const angle = (-90 + (360 / arr.length) * idx) * (Math.PI / 180);
      const dx = Math.cos(angle) * radiusPx;
      const dy = Math.sin(angle) * radiusPx + 0;
      return { npc, dx, dy };
    });
  const moonAvatars = moonPositions
    .map(({ npc, dx, dy }) => `
      <img
        class="moon-avatar"
        src="${getNpcAvatarSrc(npc)}"
        alt="${npc.name}"
        data-npc-id="${npc.id}"
        style="left:50%; top:50%; transform: translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px));"
      >
    `)
    .join("");
  const moonLines = moonPositions
    .flatMap((a, idx) => moonPositions.slice(idx + 1).map((b) => {
      const x1 = a.dx;
      const y1 = a.dy;
      const x2 = b.dx;
      const y2 = b.dy;
      const length = Math.hypot(x2 - x1, y2 - y1);
      const angle = Math.atan2(y2 - y1, x2 - x1);
      const relFromA = a.npc.relationships?.[b.npc.id];
      const relFromB = b.npc.relationships?.[a.npc.id];
      const intensityA = Number(relFromA?.intensity || 0);
      const intensityB = Number(relFromB?.intensity || 0);
      const combinedIntensity = Math.max(-6, Math.min(6, intensityA + intensityB));
      const mix = (a, b, t) => Math.round(a + (b - a) * t);
      const negative = [89, 25, 39];
      const neutral = [171, 148, 99];
      const positive = [255, 241, 191];
      let color = neutral;
      if (combinedIntensity < 0) {
        const t = (combinedIntensity + 6) / 6;
        color = [mix(negative[0], neutral[0], t), mix(negative[1], neutral[1], t), mix(negative[2], neutral[2], t)];
      } else if (combinedIntensity > 0) {
        const t = combinedIntensity / 6;
        color = [mix(neutral[0], positive[0], t), mix(neutral[1], positive[1], t), mix(neutral[2], positive[2], t)];
      }
      const lineColor = `rgb(${color[0]}, ${color[1]}, ${color[2]})`;
      const glowColor = `rgba(${color[0]}, ${color[1]}, ${color[2]}, 0.6)`;
      const relLabelA = relFromA
        ? (gameState.language === "ja" ? relFromA.labelJa || relFromA.label || "" : relFromA.label || "")
        : "";
      const relNotesA = relFromA
        ? (gameState.language === "ja" ? relFromA.notesJa || relFromA.notes || "" : relFromA.notes || "")
        : "";
      const relLabelB = relFromB
        ? (gameState.language === "ja" ? relFromB.labelJa || relFromB.label || "" : relFromB.label || "")
        : "";
      const relNotesB = relFromB
        ? (gameState.language === "ja" ? relFromB.notesJa || relFromB.notes || "" : relFromB.notes || "")
        : "";
      const formatRel = (from, to, notes) => {
        if (!notes) return "";
        return `${from} → ${to}: ${notes}`;
      };
      const aText = formatRel(a.npc.name, b.npc.name, relNotesA);
      const bText = formatRel(b.npc.name, a.npc.name, relNotesB);
      const relText = [aText, bText].filter(Boolean).join("\n") || `${a.npc.name} ↔ ${b.npc.name}`;
      return `
        <div
          class="moon-line"
          data-rel="${relText}"
          style="left:calc(50% + ${x1}px); top:calc(50% + ${y1}px); width:${length}px; transform: rotate(${angle}rad); background:${lineColor}; box-shadow: 0 0 6px ${glowColor}, 0 0 12px ${glowColor};"
        ></div>
      `;
    }))
    .join("");
  modal.innerHTML = `
    <div class="conversation-overlay" data-action="close-moon"></div>
    <div class="moon-window">
      <div class="moon-frame">
        <img src="./moon.png" alt="Moon" class="moon-image">
        <div class="moon-lines">
          ${moonLines}
        </div>
        ${moonAvatars}
        <div class="moon-tooltip" id="moon-tooltip" aria-hidden="true"></div>
      </div>
      <div class="moon-legend" aria-hidden="true">
        <span class="moon-legend-label">Negative</span>
        <div class="moon-legend-bar"></div>
        <span class="moon-legend-label">Positive</span>
      </div>
    </div>
  `;
}

function renderTutorialModal(gameState) {
  let modal = document.getElementById("tutorial-modal");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "tutorial-modal";
    document.body.appendChild(modal);
  }

  if (!gameState.showTutorialModal) {
    modal.className = "tutorial-modal";
    modal.style.display = "none";
    modal.innerHTML = "";
    return;
  }

  const tutorialImages = [
    "./tutorial/tut1.png",
    "./tutorial/tut2.png",
    "./tutorial/tut3.png",
    "./tutorial/tut4.png",
    "./tutorial/tut5.png"
  ];
  const tutorialCaptions = getTutorialCaptions(gameState);
  const maxIndex = tutorialImages.length - 1;
  const currentIndex = Math.min(Math.max(gameState.tutorialIndex || 0, 0), maxIndex);
  const src = tutorialImages[currentIndex];
  const caption = tutorialCaptions[currentIndex] || "";
  const isFirst = currentIndex === 0;
  const isLast = currentIndex === maxIndex;

  modal.style.display = "flex";
  modal.className = "tutorial-modal open";
  modal.innerHTML = `
    <div class="conversation-overlay" data-action="close-tutorial"></div>
    <div class="tutorial-window">
      <button class="tutorial-close" data-action="close-tutorial" aria-label="${t(gameState, "close")}">✕</button>
      <h2 class="tutorial-title">${t(gameState, "howToPlay")}</h2>
      <img class="tutorial-image" src="${src}" alt="Tutorial ${currentIndex + 1}">
      <div class="tutorial-caption">${caption}</div>
      <div class="tutorial-controls">
        <button class="button secondary" id="tutorial-prev" ${isFirst ? "disabled" : ""}>◀</button>
        <div class="tutorial-counter">${currentIndex + 1} / ${tutorialImages.length}</div>
        <button class="button secondary" id="tutorial-next" ${isLast ? "disabled" : ""}>▶</button>
      </div>
    </div>
  `;
}

export function renderGame(gameState) {
  renderHeader(gameState);
  renderNpcs(gameState);
  renderTasks(gameState);
  renderLog(gameState);
  renderLogToggle(gameState);
  renderDebugButton();
  renderTutorialButton(gameState);
  renderSettingsButton(gameState);
  renderDiaryButton(gameState);
  renderVaseButton(gameState);
  renderConversationModal(gameState);
  renderSettingsModal(gameState);
  renderDebugModal(gameState);
  renderDiaryModal(gameState);
  renderMoonModal(gameState);
  renderNpcProfileModal(gameState);
  renderIntroModal(gameState);
  renderCutsceneModal(gameState);
  renderEndingCutsceneModal(gameState);
  renderTutorialModal(gameState);
}

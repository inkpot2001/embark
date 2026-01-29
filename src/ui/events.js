import { generateTasks, runTasksForDay } from "../systems/taskLogic.js";
import { finalizeDay, startNewDay, checkGameOver } from "../systems/dayCycle.js";
import { renderGame } from "./render.js";
import { getTravelLabels } from "./i18n.js";
import {
  fetchTaskConversation,
  fetchTaskFailureNarrative,
  fetchTaskSuccessNarrative,
  fetchRelationshipUpdate,
  fetchDiaryEntry,
  fetchEndingCutscene
} from "../api/openai.js";
import { getCutsceneLines } from "../data/cutscene.js";

let daytimeAudio = null;
let nightAudio = null;
let owlTimeoutId = null;
let crowTimeoutId = null;
let crowStarted = false;
let birdsTimeoutId = null;
let lastMorningBirdDay = null;
let lastNightFireDay = null;
let fireAudio = null;

function initConversationStep(gameState) {
  if (gameState.conversations?.length) {
    return { section: "camp", blockIndex: 0, lineIndex: 0 };
  }
  if (gameState.successNarratives?.length) {
    return { section: "success", blockIndex: 0, lineIndex: 0 };
  }
  if (gameState.failureNarratives?.length) {
    return { section: "failure", blockIndex: 0, lineIndex: 0 };
  }
  return null;
}

function syncDaytimeAudio(gameState) {
  if (!gameState.soundOn) {
    if (daytimeAudio && !daytimeAudio.paused) {
      daytimeAudio.pause();
      daytimeAudio.currentTime = 0;
    }
    return;
  }
  const shouldPlay = gameState.phase === "assign";
  if (shouldPlay) {
    if (!daytimeAudio) {
      daytimeAudio = new Audio("./sounds/heavydrums.mp3");
      daytimeAudio.loop = false;
      daytimeAudio.volume = 0.4;
    }
    if (daytimeAudio.paused) {
      daytimeAudio.play().catch(() => {});
    }
    return;
  }

  if (daytimeAudio && !daytimeAudio.paused) {
    daytimeAudio.pause();
    daytimeAudio.currentTime = 0;
  }
}

function syncNightAudio(gameState) {
  if (!gameState.soundOn) {
    if (nightAudio && !nightAudio.paused) {
      nightAudio.pause();
      nightAudio.currentTime = 0;
    }
    if (fireAudio && !fireAudio.paused) {
      fireAudio.pause();
      fireAudio.currentTime = 0;
    }
    if (owlTimeoutId) {
      clearTimeout(owlTimeoutId);
      owlTimeoutId = null;
    }
    return;
  }
  const shouldPlay = gameState.phase === "night";
  if (shouldPlay) {
    if (!nightAudio) {
      nightAudio = new Audio("./sounds/softdrums.mp3");
      nightAudio.loop = false;
      nightAudio.volume = 0.4;
    }
    if (nightAudio.paused) {
      nightAudio.play().catch(() => {});
    }
    if (gameState.day !== lastNightFireDay) {
      lastNightFireDay = gameState.day;
      try {
        fireAudio = new Audio("./sounds/fire.mp3");
        fireAudio.volume = 0.75;
        fireAudio.play().catch(() => {});
      } catch (err) {
        console.warn("Fire sound failed", err);
      }
    }
    scheduleNightOwl(gameState);
    return;
  }

  if (nightAudio && !nightAudio.paused) {
    nightAudio.pause();
    nightAudio.currentTime = 0;
  }
  if (fireAudio && !fireAudio.paused) {
    fireAudio.pause();
    fireAudio.currentTime = 0;
  }
  if (owlTimeoutId) {
    clearTimeout(owlTimeoutId);
    owlTimeoutId = null;
  }
}

function scheduleNightOwl(gameState) {
  if (!gameState.soundOn || owlTimeoutId || gameState.phase !== "night") return;
  const delayMs = 8000 + Math.random() * 12000;
  owlTimeoutId = setTimeout(() => {
    owlTimeoutId = null;
    if (!gameState.soundOn || gameState.phase !== "night") return;
    const src = Math.random() < 0.5 ? "./sounds/owl1.mp3" : "./sounds/owl2.mp3";
    try {
      const owl = new Audio(src);
      owl.volume = 0.8;
      owl.play().catch(() => {});
    } catch (err) {
      console.warn("Owl sound failed", err);
    }
    scheduleNightOwl(gameState);
  }, delayMs);
}

function syncBirdsAmbience(gameState) {
  if (!gameState.soundOn) {
    if (birdsTimeoutId) {
      clearTimeout(birdsTimeoutId);
      birdsTimeoutId = null;
    }
    return;
  }
  const shouldPlay = gameState.phase === "morning" || gameState.phase === "assign";
  if (shouldPlay) {
    if (gameState.phase === "morning" && gameState.day !== lastMorningBirdDay) {
      lastMorningBirdDay = gameState.day;
      const src = Math.random() < 0.5 ? "./sounds/birds1.mp3" : "./sounds/birds2.mp3";
      try {
        const birds = new Audio(src);
        birds.volume = 0.3;
        birds.play().catch(() => {});
      } catch (err) {
        console.warn("Morning birds sound failed", err);
      }
    }
    scheduleBirdsAmbience(gameState);
    return;
  }
  if (birdsTimeoutId) {
    clearTimeout(birdsTimeoutId);
    birdsTimeoutId = null;
  }
}

function scheduleBirdsAmbience(gameState) {
  if (!gameState.soundOn || birdsTimeoutId || !(gameState.phase === "morning" || gameState.phase === "assign")) return;
  const delayMs = 10000 + Math.random() * 65000;
  birdsTimeoutId = setTimeout(() => {
    birdsTimeoutId = null;
    if (!gameState.soundOn || !(gameState.phase === "morning" || gameState.phase === "assign")) return;
    try {
      const birds = new Audio("./sounds/birds3.mp3");
      birds.volume = 0.25;
      birds.play().catch(() => {});
    } catch (err) {
      console.warn("Birds sound failed", err);
    }
    scheduleBirdsAmbience(gameState);
  }, delayMs);
}

function scheduleCrowAmbience(gameState) {
  if (!gameState.soundOn || crowTimeoutId) return;
  const delayMs = 12000 + Math.random() * 28000;
  crowTimeoutId = setTimeout(() => {
    crowTimeoutId = null;
    if (!gameState.soundOn) return;
    const src = Math.random() < 0.5 ? "./sounds/crow1.mp3" : "./sounds/crow2.mp3";
    try {
      const crow = new Audio(src);
      crow.volume = 0.7;
      crow.play().catch(() => {});
    } catch (err) {
      console.warn("Crow sound failed", err);
    }
    scheduleCrowAmbience(gameState);
  }, delayMs);
}

function startCrowAmbience(gameState) {
  if (!gameState.soundOn || crowStarted) return;
  crowStarted = true;
  scheduleCrowAmbience(gameState);
}

async function buildConversations(gameState) {
  const conversations = [];
  for (const task of gameState.tasksToday) {
    const assignedNpcs = task.assignedNpcIds
      .map((id) => gameState.npcs.find((npc) => npc.id === id))
      .filter((npc) => npc);

    if (assignedNpcs.length < 2) continue;

    let convResult = null;
    try {
      convResult = await fetchTaskConversation(task, assignedNpcs, gameState);
    } catch (err) {
      console.warn("conversation fetch failed", err);
    }

    let lines = convResult?.lines;
    if (!lines || !lines.length) {
      lines = assignedNpcs.slice(0, 2).map((n, idx) => `${n.name}: Hi ${assignedNpcs[(idx + 1) % assignedNpcs.length].name}!`);
    }

    conversations.push({
      taskName: task.name,
      lines
    });
  }

  return conversations;
}

async function buildFailureNarratives(gameState) {
  const failures = [];
  const failedTasks = gameState.tasksToday.filter((task) => task.lastOutcome === "fail");

  for (const task of failedTasks) {
    const assignedNpcs = task.assignedNpcIds
      .map((id) => gameState.npcs.find((npc) => npc.id === id))
      .filter((npc) => npc);

    if (assignedNpcs.length === 0) continue;

    let narrative = null;
    try {
      narrative = await fetchTaskFailureNarrative(task, assignedNpcs, gameState);
    } catch (err) {
      console.warn("failure narrative fetch failed", err);
    }

    let lines = narrative?.lines;
    if (!lines || !lines.length) {
      const speaker = assignedNpcs[0].name;
      lines = [`${speaker}: We misjudged the task and had to pull back.`];
    }

    failures.push({
      taskName: task.name,
      lines
    });
  }

  return failures;
}

async function buildSuccessNarratives(gameState) {
  const successes = [];
  const succeededTasks = gameState.tasksToday.filter((task) => task.lastOutcome === "success");

  for (const task of succeededTasks) {
    const assignedNpcs = task.assignedNpcIds
      .map((id) => gameState.npcs.find((npc) => npc.id === id))
      .filter((npc) => npc);

    if (assignedNpcs.length === 0) continue;

    let narrative = null;
    try {
      narrative = await fetchTaskSuccessNarrative(task, assignedNpcs, gameState);
    } catch (err) {
      console.warn("success narrative fetch failed", err);
    }

    let lines = narrative?.lines;
    if (!lines || !lines.length) {
      const speaker = assignedNpcs[0].name;
      lines = [`${speaker}: We pulled it off. The task went as planned.`];
    }

    successes.push({
      taskName: task.name,
      lines
    });
  }

  return successes;
}

async function updateTaskRelationships(gameState) {
  const pushHistory = (rel, entry) => {
    rel.history = Array.isArray(rel.history) ? rel.history : [];
    rel.history.push(entry);
  };

  for (const task of gameState.tasksToday) {
    if (!task || !task.assignedNpcIds || task.assignedNpcIds.length !== 2) continue;
    if (!task.lastOutcome) continue;
    const assignedNpcs = task.assignedNpcIds
      .map((id) => gameState.npcs.find((npc) => npc.id === id))
      .filter((npc) => npc && !npc.isDead);
    if (assignedNpcs.length !== 2) continue;

    const [npcA, npcB] = assignedNpcs;
    let update = null;
    try {
      update = await fetchRelationshipUpdate(npcA, npcB, task, task.lastOutcome, gameState);
    } catch (err) {
      console.warn("relationship update fetch failed", err);
    }
    if (!update) continue;

    npcA.relationships = npcA.relationships || {};
    npcB.relationships = npcB.relationships || {};
    npcA.relationships[npcB.id] = npcA.relationships[npcB.id] || { label: "", notes: "", intensity: 0 };
    npcB.relationships[npcA.id] = npcB.relationships[npcA.id] || { label: "", notes: "", intensity: 0 };
    const relA = npcA.relationships[npcB.id];
    const relB = npcB.relationships[npcA.id];
    const historyEntryA = {
      day: gameState.day,
      taskId: task.id,
      taskName: task.name,
      outcome: task.lastOutcome,
      label: relA.label || "",
      notes: relA.notes || "",
      labelJa: relA.labelJa || "",
      notesJa: relA.notesJa || ""
    };
    const historyEntryB = {
      day: gameState.day,
      taskId: task.id,
      taskName: task.name,
      outcome: task.lastOutcome,
      label: relB.label || "",
      notes: relB.notes || "",
      labelJa: relB.labelJa || "",
      notesJa: relB.notesJa || ""
    };
    pushHistory(relA, historyEntryA);
    pushHistory(relB, historyEntryB);

    if (gameState.language === "ja") {
      if (update.aToB?.labelJa) relA.labelJa = update.aToB.labelJa;
      if (update.aToB?.notesJa) relA.notesJa = update.aToB.notesJa;
      if (update.bToA?.labelJa) relB.labelJa = update.bToA.labelJa;
      if (update.bToA?.notesJa) relB.notesJa = update.bToA.notesJa;
    } else {
      if (update.aToB?.label) relA.label = update.aToB.label;
      if (update.aToB?.notes) relA.notes = update.aToB.notes;
      if (update.bToA?.label) relB.label = update.bToA.label;
      if (update.bToA?.notes) relB.notes = update.bToA.notes;
    }
  }
}

function upsertDiaryEntry(gameState, entry) {
  if (!entry) return;
  if (!gameState.diaryEntries) gameState.diaryEntries = [];
  const existingIdx = gameState.diaryEntries.findIndex((item) => item.day === gameState.day);
  const normalized = { day: gameState.day, title: entry.title || `Day ${gameState.day}`, body: entry.body || "" };
  if (existingIdx >= 0) {
    gameState.diaryEntries[existingIdx] = normalized;
  } else {
    gameState.diaryEntries.push(normalized);
  }
}

export function attachEventHandlers(gameState) {
  const moonTooltip = () => document.getElementById("moon-tooltip");

  document.addEventListener("input", (evt) => {
    if (evt.target.id === "travel-input") {
      const value = Number(evt.target.value);
      gameState.plannedTravelToday = value;
      const span = document.getElementById("travel-value");
      if (span) {
        const travelLabels = getTravelLabels(gameState);
        span.textContent = travelLabels[value] || travelLabels[0];
      }
    }
  });

  document.addEventListener("click", async (evt) => {
    const target = evt.target;
    if (!(target instanceof HTMLElement)) return;
    startCrowAmbience(gameState);

    const settingsBtn = target.closest("#settings-open");
    if (settingsBtn) {
      gameState.showSettingsModal = true;
      renderGame(gameState);
      syncBirdsAmbience(gameState);
      return;
    }

    const tutorialBtn = target.closest("#tutorial-open");
    if (tutorialBtn) {
      gameState.showTutorialModal = true;
      renderGame(gameState);
      syncBirdsAmbience(gameState);
      return;
    }

    const diaryBtn = target.closest("#diary-open");
    if (diaryBtn) {
      gameState.showDiaryModal = !gameState.showDiaryModal;
      if (gameState.showDiaryModal) {
        gameState.showMoonModal = false;
      }
      renderGame(gameState);
      syncBirdsAmbience(gameState);
      return;
    }

    const vaseBtn = target.closest("#vase-open");
    if (vaseBtn) {
      gameState.showMoonModal = !gameState.showMoonModal;
      if (gameState.showMoonModal) {
        gameState.showDiaryModal = false;
      }
      renderGame(gameState);
      syncBirdsAmbience(gameState);
      return;
    }

    const debugBtn = target.closest("#debug-open");
    if (debugBtn) {
      gameState.showDebugModal = true;
      renderGame(gameState);
      syncBirdsAmbience(gameState);
      return;
    }

    const languageBtn = target.closest("[data-language]");
    if (languageBtn) {
      const language = languageBtn.getAttribute("data-language");
      gameState.language = language === "ja" ? "ja" : "en";
      renderGame(gameState);
      syncBirdsAmbience(gameState);
      return;
    }

    if (target.id === "sound-toggle") {
      gameState.soundOn = !gameState.soundOn;
      if (!gameState.soundOn) {
        if (crowTimeoutId) {
          clearTimeout(crowTimeoutId);
          crowTimeoutId = null;
        }
        crowStarted = false;
      }
      renderGame(gameState);
      syncDaytimeAudio(gameState);
      syncNightAudio(gameState);
      syncBirdsAmbience(gameState);
      return;
    }

    const confirmBtn = target.closest("#confirm-travel");
    if (confirmBtn && gameState.phase === "morning") {
      (async () => {
        gameState.isLoadingTasks = true;
        renderGame(gameState);
        gameState.tasksToday = await generateTasks(gameState);
        gameState.taskAnimationPending = true;
        if (gameState.soundOn) {
          try {
            const audio = new Audio("./sounds/carddeal.mp3");
            audio.volume = 1;
            audio.play().catch(() => {});
          } catch (err) {
            console.warn("Task generate sound failed", err);
          }
        }
        gameState.isLoadingTasks = false;
        gameState.phase = "assign";
        renderGame(gameState);
        syncDaytimeAudio(gameState);
        syncBirdsAmbience(gameState);
        syncNightAudio(gameState);
      })();
      return;
    }

    const simulateBtn = target.closest("#simulate-day");
    if (simulateBtn && gameState.phase === "assign") {
      (async () => {
        gameState.phase = "simulation";
        renderGame(gameState);
        syncDaytimeAudio(gameState);
        syncBirdsAmbience(gameState);
        syncNightAudio(gameState);
        gameState.conversations = await buildConversations(gameState);
        runTasksForDay(gameState);
        await updateTaskRelationships(gameState);
        finalizeDay(gameState);
        if (gameState.phase !== "gameover") {
          checkGameOver(gameState);
        }
        if (gameState.phase !== "gameover") {
          gameState.phase = "night";
        }
        gameState.successNarratives = await buildSuccessNarratives(gameState);
        gameState.failureNarratives = await buildFailureNarratives(gameState);
        gameState.showConversationModal =
          gameState.conversations.length > 0 ||
          gameState.successNarratives.length > 0 ||
          gameState.failureNarratives.length > 0;
        gameState.conversationStep = gameState.showConversationModal ? initConversationStep(gameState) : null;
        if (gameState.day >= 2) {
          const step = 1 + Math.floor(Math.random() * 2);
          gameState.blueMarkerPos = Math.min(20, (gameState.blueMarkerPos || 0) + step);
        }
        try {
          const diaryEntry = await fetchDiaryEntry(gameState);
          if (diaryEntry?.body) {
            upsertDiaryEntry(gameState, diaryEntry);
          }
        } catch (err) {
          console.warn("Diary entry fetch failed", err);
        }
        renderGame(gameState);
        syncDaytimeAudio(gameState);
        syncBirdsAmbience(gameState);
        syncNightAudio(gameState);
      })();
      return;
    }

    const nextDayBtn = target.closest("#next-day");
    if (nextDayBtn && gameState.phase === "night") {
      if (gameState.distanceTraveled >= 20 && !gameState.showEndingCutscene) {
        gameState.phase = "ending";
        gameState.showConversationModal = false;
        gameState.conversationStep = null;
        renderGame(gameState);
        syncDaytimeAudio(gameState);
        syncBirdsAmbience(gameState);
        syncNightAudio(gameState);
        const aliveNpcs = gameState.npcs.filter((npc) => !npc.isDead);
        const deadNpcs = gameState.npcs.filter((npc) => npc.isDead);
        let ending = null;
        try {
          ending = await fetchEndingCutscene(gameState, aliveNpcs, deadNpcs);
        } catch (err) {
          console.warn("Ending cutscene fetch failed", err);
        }
        const fallbackLines = gameState.language === "ja"
          ? [
              "ナレーター: ギシュテが見えた。長い旅の果てに、ようやく辿り着いた。",
              "ナレーター: 失われた者たちの名を胸に、彼らは静かに門をくぐる。"
            ]
          : [
              "Narrator: Gishute appears on the horizon. After a long road, they finally arrive.",
              "Narrator: They carry the names of the fallen as they step through the gates."
            ];
        gameState.endingCutsceneLines = ending?.lines?.length ? ending.lines : fallbackLines;
        gameState.endingCutsceneIndex = 0;
        gameState.showEndingCutscene = true;
        gameState.pendingGameOverReason = "win";
        gameState.gameOverReason = "win";
        gameState.phase = "ending";
        renderGame(gameState);
        syncDaytimeAudio(gameState);
        syncBirdsAmbience(gameState);
        syncNightAudio(gameState);
        return;
      }
      startNewDay(gameState);
      renderGame(gameState);
      syncDaytimeAudio(gameState);
      syncBirdsAmbience(gameState);
      syncNightAudio(gameState);
      return;
    }

    if (target.id === "conversation-close" || target.dataset.action === "close-conversation") {
      gameState.showConversationModal = false;
      gameState.conversationStep = null;
      renderGame(gameState);
      syncBirdsAmbience(gameState);
    }

    if (target.dataset.action === "close-ending-cutscene") {
      gameState.showEndingCutscene = false;
      gameState.endingCutsceneIndex = 0;
      gameState.phase = "gameover";
      gameState.gameOverReason = gameState.pendingGameOverReason || "win";
      renderGame(gameState);
      syncBirdsAmbience(gameState);
    }

    if (target.id === "settings-close" || target.dataset.action === "close-settings") {
      gameState.showSettingsModal = false;
      renderGame(gameState);
      syncBirdsAmbience(gameState);
    }

    if (target.id === "diary-close" || target.dataset.action === "close-diary") {
      gameState.showDiaryModal = false;
      renderGame(gameState);
      syncBirdsAmbience(gameState);
    }

    if (target.id === "moon-close" || target.dataset.action === "close-moon") {
      gameState.showMoonModal = false;
      renderGame(gameState);
      syncBirdsAmbience(gameState);
    }

    if (target.id === "debug-close" || target.dataset.action === "close-debug") {
      gameState.showDebugModal = false;
      renderGame(gameState);
      syncBirdsAmbience(gameState);
    }

    if (target.id === "npc-profile-close" || target.dataset.action === "close-npc-profile") {
      gameState.showNpcProfile = false;
      gameState.npcProfileId = null;
      renderGame(gameState);
      syncBirdsAmbience(gameState);
    }

    if (target.id === "title-start") {
      gameState.showIntroModal = false;
      gameState.showCutscene = true;
      gameState.cutsceneIndex = 0;
      if (gameState.soundOn) {
        try {
          const fire = new Audio("./sounds/fire.mp3");
          fire.volume = 0.75;
          fire.play().catch(() => {});
        } catch (err) {
          console.warn("Cutscene fire sound failed", err);
        }
      }
      renderGame(gameState);
      syncBirdsAmbience(gameState);
    }

    if (target.id === "title-skip") {
      gameState.showIntroModal = false;
      gameState.showCutscene = false;
      gameState.cutsceneIndex = 0;
      renderGame(gameState);
      syncBirdsAmbience(gameState);
    }

    if (target.id === "cutscene-next") {
      const lines = getCutsceneLines(gameState);
      const maxIndex = Math.max(lines.length - 1, 0);
      const currentIndex = Math.min(Math.max(gameState.cutsceneIndex || 0, 0), maxIndex);
      if (currentIndex >= maxIndex) {
        gameState.showCutscene = false;
        gameState.cutsceneIndex = 0;
        gameState.showTutorialModal = true;
        gameState.tutorialIndex = 0;
      } else {
        gameState.cutsceneIndex = currentIndex + 1;
      }
      renderGame(gameState);
      syncBirdsAmbience(gameState);
    }

    if (target.dataset.action === "close-tutorial") {
      gameState.showTutorialModal = false;
      renderGame(gameState);
      syncBirdsAmbience(gameState);
    }

    if (target.id === "tutorial-prev") {
      gameState.tutorialIndex = Math.max(0, (gameState.tutorialIndex || 0) - 1);
      renderGame(gameState);
    }

    if (target.id === "tutorial-next") {
      const maxIndex = 4;
      gameState.tutorialIndex = Math.min(maxIndex, (gameState.tutorialIndex || 0) + 1);
      renderGame(gameState);
    }

    if (target.id === "ending-cutscene-next") {
      const lines = gameState.endingCutsceneLines || [];
      const maxIndex = Math.max(lines.length - 1, 0);
      const currentIndex = Math.min(Math.max(gameState.endingCutsceneIndex || 0, 0), maxIndex);
      if (currentIndex >= maxIndex) {
        gameState.showEndingCutscene = false;
        gameState.endingCutsceneIndex = 0;
        gameState.phase = "gameover";
        gameState.gameOverReason = gameState.pendingGameOverReason || "win";
      } else {
        gameState.endingCutsceneIndex = currentIndex + 1;
      }
      renderGame(gameState);
      syncBirdsAmbience(gameState);
    }

    if (target.id === "conversation-next") {
      const step = gameState.conversationStep || initConversationStep(gameState);
      if (!step) return;
      const isFailure = step.section === "failure";
      const isSuccess = step.section === "success";
      const blocks = isFailure
        ? gameState.failureNarratives
        : isSuccess
          ? gameState.successNarratives
          : gameState.conversations;
      const block = blocks[step.blockIndex];
      if (!block) {
        gameState.showConversationModal = false;
        gameState.conversationStep = null;
        renderGame(gameState);
        syncBirdsAmbience(gameState);
        return;
      }
      const maxLineIndex = Math.max((block.lines?.length || 0) - 1, 0);
      if (step.lineIndex < maxLineIndex) {
        step.lineIndex += 1;
      } else {
        const nextBlockIndex = step.blockIndex + 1;
        if (nextBlockIndex < blocks.length) {
          step.blockIndex = nextBlockIndex;
          step.lineIndex = 0;
        } else {
          if (step.section === "camp") {
            if (gameState.successNarratives?.length) {
              step.section = "success";
              step.blockIndex = 0;
              step.lineIndex = 0;
            } else if (gameState.failureNarratives?.length) {
              step.section = "failure";
              step.blockIndex = 0;
              step.lineIndex = 0;
            } else {
              gameState.showConversationModal = false;
              gameState.conversationStep = null;
              renderGame(gameState);
              syncBirdsAmbience(gameState);
              return;
            }
          } else if (step.section === "success") {
            if (gameState.failureNarratives?.length) {
              step.section = "failure";
              step.blockIndex = 0;
              step.lineIndex = 0;
            } else {
              gameState.showConversationModal = false;
              gameState.conversationStep = null;
              renderGame(gameState);
              syncBirdsAmbience(gameState);
              return;
            }
          } else {
            gameState.showConversationModal = false;
            gameState.conversationStep = null;
            renderGame(gameState);
            syncBirdsAmbience(gameState);
            return;
          }
        }
      }
      gameState.conversationStep = step;
      renderGame(gameState);
      syncBirdsAmbience(gameState);
      return;
    }

    if (target.id === "toggle-log") {
      gameState.logVisible = !gameState.logVisible;
      renderGame(gameState);
      syncBirdsAmbience(gameState);
      return;
    }

    const moonAvatar = target.closest(".moon-avatar");
    if (moonAvatar && moonAvatar.dataset.npcId) {
      const npcId = moonAvatar.dataset.npcId;
      if (gameState.soundOn) {
        try {
          const audio = new Audio("./sounds/clothes.mp3");
          audio.volume = 1;
          audio.play().catch(() => {});
        } catch (err) {
          console.warn("NPC click sound failed", err);
        }
      }
      gameState.showNpcProfile = true;
      gameState.npcProfileId = npcId;
      renderGame(gameState);
      return;
    }

    const npcCard = target.closest(".npc-card");
    if (npcCard && npcCard.dataset.npcId) {
      const npcId = npcCard.dataset.npcId;
      if (gameState.soundOn) {
        try {
          const audio = new Audio("./sounds/clothes.mp3");
          audio.volume = 1;
          audio.play().catch(() => {});
        } catch (err) {
          console.warn("NPC click sound failed", err);
        }
      }
      gameState.showNpcProfile = true;
      gameState.npcProfileId = npcId;
      renderGame(gameState);
    }
  });

  document.addEventListener("mousemove", (evt) => {
    const target = evt.target;
    if (!(target instanceof HTMLElement)) return;
    if (!target.classList.contains("moon-line")) return;
    const tooltip = moonTooltip();
    if (!tooltip) return;
    const rel = target.dataset.rel || "";
    tooltip.innerHTML = rel.replace(/\n/g, "<br>");
    tooltip.style.display = "block";
    tooltip.style.left = `${evt.clientX + 12}px`;
    tooltip.style.top = `${evt.clientY - 24}px`;
  });

  document.addEventListener("mouseover", (evt) => {
    const target = evt.target;
    if (!(target instanceof HTMLElement)) return;
    if (!target.classList.contains("moon-line")) return;
    const tooltip = moonTooltip();
    if (!tooltip) return;
    const rel = target.dataset.rel || "";
    tooltip.innerHTML = rel.replace(/\n/g, "<br>");
    tooltip.style.display = "block";
  });

  document.addEventListener("mouseout", (evt) => {
    const target = evt.target;
    if (!(target instanceof HTMLElement)) return;
    if (!target.classList.contains("moon-line")) return;
    const tooltip = moonTooltip();
    if (!tooltip) return;
    tooltip.style.display = "none";
  });

  document.addEventListener("dragstart", (evt) => {
    const dragNode = evt.target.closest("[data-npc-id]");
    if (!dragNode) return;
    const npcId = dragNode.dataset.npcId;
    const npc = gameState.npcs.find((n) => n.id === npcId);
    if (!npc) return;
    if (gameState.phase !== "assign" || npc.isDead) {
      evt.preventDefault();
      return;
    }
    if (gameState.soundOn) {
      try {
        const audio = new Audio("./sounds/cardpick.mp3");
        audio.volume = 1;
        audio.play().catch(() => {});
      } catch (err) {
        console.warn("Card pick sound failed", err);
      }
    }
    evt.dataTransfer.setData("text/plain", npcId);
    evt.dataTransfer.effectAllowed = "move";
  });

  document.addEventListener("dragover", (evt) => {
    const target = evt.target.closest(".drop-target, .task-card[data-task-id]");
    if (target && gameState.phase === "assign") {
      evt.preventDefault();
      target.classList.add("hover");
    }
  });

  document.addEventListener("dragleave", (evt) => {
    const target = evt.target.closest(".drop-target, .task-card[data-task-id]");
    if (target) {
      target.classList.remove("hover");
    }
  });

  document.addEventListener("drop", (evt) => {
    const dropTarget = evt.target.closest(".drop-target, .task-card[data-task-id]");
    if (!dropTarget || gameState.phase !== "assign") return;
    evt.preventDefault();
    dropTarget.classList.remove("hover");
    const npcId = evt.dataTransfer.getData("text/plain");
    if (!npcId) return;
    const npc = gameState.npcs.find((n) => n.id === npcId);
    if (!npc || npc.isDead) return;

    // Clear previous assignment
    gameState.tasksToday.forEach((t) => {
      t.assignedNpcIds = t.assignedNpcIds.filter((id) => id !== npcId);
    });

    if (dropTarget.dataset.dropTarget === "pool") {
      if (gameState.soundOn) {
        try {
          const audio = new Audio("./sounds/carddeal.mp3");
          audio.volume = 1;
          audio.play().catch(() => {});
        } catch (err) {
          console.warn("Card deal sound failed", err);
        }
      }
      renderGame(gameState);
      return;
    }

    const taskId = dropTarget.dataset.taskId;
    const task = gameState.tasksToday.find((t) => t.id === taskId);
    if (!task) return;
    if (task.id === "rest" && task.assignedNpcIds.length >= 2) {
      renderGame(gameState);
      return;
    }
    if (task.id !== "rest" && task.assignedNpcIds.length >= 2) {
      renderGame(gameState);
      return;
    }
    task.assignedNpcIds.push(npcId);
    if (gameState.soundOn) {
      try {
        const audio = new Audio("./sounds/cardflip.mp3");
        audio.volume = 1;
        audio.play().catch(() => {});
      } catch (err) {
        console.warn("Card deal sound failed", err);
      }
    }
    renderGame(gameState);
  });

  document.addEventListener("input", (evt) => {
    const target = evt.target;
    if (!(target instanceof HTMLInputElement)) return;
    const field = target.dataset.debugField;
    const npcId = target.dataset.npcId;
    const value = Number(target.value);
    if (Number.isNaN(value)) return;
    if (!field) return;
    if (field === "day") gameState.day = Math.max(1, Math.min(99, value));
    if (field === "distance") gameState.distanceTraveled = Math.max(0, Math.min(20, value));
    if (field === "winter") gameState.blueMarkerPos = Math.max(0, Math.min(20, value));
    if (npcId) {
      const npc = gameState.npcs.find((n) => n.id === npcId);
      if (!npc) return;
      if (field === "health") npc.state.health = Math.max(0, Math.min(5, value));
      if (field === "stamina") npc.state.stamina = Math.max(0, Math.min(5, value));
      if (field === "morale") npc.state.morale = Math.max(0, Math.min(10, value));
    }
    renderGame(gameState);
  });

  document.addEventListener("change", (evt) => {
    const target = evt.target;
    if (!(target instanceof HTMLSelectElement)) return;
    const field = target.dataset.debugField;
    if (!field) return;
    renderGame(gameState);
  });
}

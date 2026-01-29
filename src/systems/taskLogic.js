import { taskTemplates } from "../data/taskTemplates.js";
import { handleNpcDeath, checkStaminaDeaths } from "./npcLogic.js";
import { fetchTasksFromOpenAI } from "../api/openai.js";

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const getTemplateById = (id) => taskTemplates.find((t) => t.id === id);

function createTalkTask(gameState) {
  const isJa = gameState?.language === "ja";
  return {
    id: "talk",
    name: isJa ? "語り合い" : "Talk",
    description: isJa
      ? "静かに言葉を交わし、恐れを和らげ、絆を深めよう。"
      : "Share words quietly, ease the fear, and deepen the bond.",
    requiredSkills: {
      physique: 0,
      intellect: 0,
      charisma: 0
    },
    staminaCost: -1,
    assignedNpcIds: [],
    penalty: 0,
    penaltyTaker: "assigned",
    alwaysSuccess: true
  };
}

function createRestTask(gameState) {
  const isJa = gameState?.language === "ja";
  return {
    id: "rest",
    name: isJa ? "休息" : "Rest",
    description: isJa
      ? "火のそばで眠り、命を1回復する。"
      : "Sleep close to the fire and recover 1 heart.",
    requiredSkills: {
      physique: 0,
      intellect: 0,
      charisma: 0
    },
    staminaCost: -1,
    rewards: {},
    penalties: {},
    difficulty: 1,
    dangerLevel: 0,
    assignedNpcIds: [],
    penalty: 0,
    penaltyTaker: "assigned",
    alwaysSuccess: true
  };
}

function maybeReplaceWithSpecialTask(tasks, plannedTravel, gameState) {
  if (plannedTravel === 0 || tasks.length === 0) return tasks;
  if (Math.random() >= 0.25) return tasks;
  const idx = Math.floor(Math.random() * tasks.length);
  const replacement = Math.random() < 0.40 ? createTalkTask(gameState) : createRestTask(gameState);
  const next = [...tasks];
  next[idx] = replacement;
  return next;
}

function pickPool(plannedTravel) {
  if (plannedTravel <= 1) {
    return ["collect_wood", "guard_camp", "hunt_food"];
  }
  if (plannedTravel <= 3) {
    return ["collect_wood", "guard_camp", "hunt_food", "navigate_swamp"];
  }
  return ["collect_wood", "guard_camp", "hunt_food", "navigate_swamp", "fight_wolves", "fight_wolves"];
}

function cloneTemplate(template) {
  return {
    ...template,
    assignedNpcIds: [],
    penalty: template.penalty || 0,
    penaltyTaker: template.penaltyTaker || "assigned"
  };
}

function adjustTaskForDistance(task, progress) {
  // progress: 0 (start) to 1 (goal)
  const bump = progress >= 0.75 ? 2 : progress >= 0.5 ? 1 : 0;
  const dangerBump = progress >= 0.75 ? 1 : progress >= 0.5 ? 0 : 0;
  return {
    ...task,
    difficulty: clamp(task.difficulty + bump, 1, 5),
    dangerLevel: clamp(task.dangerLevel + dangerBump, 0, 3),
    staminaCost: 1,
    penalty: task.penalty || 0,
    penaltyTaker: task.penaltyTaker || "assigned"
  };
}

function getSynergyBonus(npcs) {
  if (npcs.length < 2) return 0;
  let sum = 0;
  let count = 0;
  for (let i = 0; i < npcs.length; i += 1) {
    for (let j = i + 1; j < npcs.length; j += 1) {
      const npcA = npcs[i];
      const npcB = npcs[j];
      const intensityA = Number(npcA.relationships?.[npcB.id]?.intensity || 0);
      const intensityB = Number(npcB.relationships?.[npcA.id]?.intensity || 0);
      sum += intensityA + intensityB;
      count += 1;
    }
  }
  if (count === 0) return 0;
  const avgCombined = sum / count;
  return clamp((avgCombined / 6) * 0.2, -0.2, 0.2);
}

function generateTasksLocal(gameState) {
  if (gameState.plannedTravelToday === 0) {
    return [createTalkTask(gameState), createRestTask(gameState)];
  }
  const poolIds = pickPool(gameState.plannedTravelToday);
  const uniquePool = [...new Set(poolIds)];
  const tasks = [];
  const count = Math.max(0, Math.round(gameState.plannedTravelToday));
  const candidates = uniquePool
    .map(getTemplateById)
    .filter(Boolean)
    .sort(() => Math.random() - 0.5);

  while (tasks.length < count && candidates.length > 0) {
    const chosen = candidates.pop();
    tasks.push(cloneTemplate(chosen));
  }

  // If we still need more tasks (because of duplicate weighting), pull from full pool randomly.
  while (tasks.length < count) {
    const id = poolIds[Math.floor(Math.random() * poolIds.length)];
    const template = getTemplateById(id);
    tasks.push(cloneTemplate(template));
  }

  const progress = Math.max(0, Math.min(1, gameState.plannedTravelToday / 10));
  const adjusted = tasks.map((t) => adjustTaskForDistance(t, progress));
  return maybeReplaceWithSpecialTask(adjusted, gameState.plannedTravelToday, gameState);
}

export async function generateTasks(gameState) {
  const desiredCount = Math.max(0, Math.round(gameState.plannedTravelToday));
  if (desiredCount === 0) return [createTalkTask(gameState), createRestTask(gameState)];
  try {
    const aiTasks = await fetchTasksFromOpenAI(gameState);
    if (aiTasks && aiTasks.length) {
      const progress = Math.max(0, Math.min(1, gameState.plannedTravelToday / 10));
      const adjusted = aiTasks.map((t) =>
        adjustTaskForDistance({ ...t, assignedNpcIds: t.assignedNpcIds || [] }, progress)
      );
      if (adjusted.length >= desiredCount) {
        return maybeReplaceWithSpecialTask(adjusted.slice(0, desiredCount), gameState.plannedTravelToday, gameState);
      }

      const needed = desiredCount - adjusted.length;
      const poolIds = pickPool(gameState.plannedTravelToday);
      const uniquePool = [...new Set(poolIds)];
      const candidates = uniquePool
        .map(getTemplateById)
        .filter(Boolean)
        .sort(() => Math.random() - 0.5);

      while (adjusted.length < desiredCount && candidates.length > 0) {
        const chosen = candidates.pop();
        adjusted.push(adjustTaskForDistance(cloneTemplate(chosen), progress));
      }

      while (adjusted.length < desiredCount) {
        const id = poolIds[Math.floor(Math.random() * poolIds.length)];
        const template = getTemplateById(id);
        adjusted.push(adjustTaskForDistance(cloneTemplate(template), progress));
      }

      return maybeReplaceWithSpecialTask(adjusted, gameState.plannedTravelToday, gameState);
    }
  } catch (err) {
    console.warn("OpenAI task generation failed, falling back to templates:", err);
  }
  return generateTasksLocal(gameState);
}

export function resolveTask(task, npcs) {
  const totals = { physique: 0, intellect: 0, charisma: 0 };
  const moraleTotal = npcs.reduce((sum, npc) => sum + (npc.state.morale || 0), 0);
  npcs.forEach((npc) => {
    totals.physique += npc.skills.physique || 0;
    totals.intellect += npc.skills.intellect || 0;
    totals.charisma += npc.skills.charisma || 0;
  });

  if (npcs.length === 0) {
    return { success: false, skillMatch: totals, baseChance: 0, moraleBonus: 0, synergyBonus: 0, successChance: 0 };
  }

  if (task.id === "talk" && npcs.length < 2) {
    return { success: false, skillMatch: totals, baseChance: 0, moraleBonus: 0, synergyBonus: 0, successChance: 0 };
  }

  if (task.alwaysSuccess) {
    const moraleBonus = (moraleTotal / (10 * npcs.length) - 0.7) * 0.5;
    const synergyBonus = getSynergyBonus(npcs);
    const finalChance = clamp(1 + moraleBonus + synergyBonus, 0, 1);
    return {
      success: true,
      skillMatch: totals,
      baseChance: 1,
      moraleBonus,
      synergyBonus,
      successChance: Number(finalChance.toFixed(2))
    };
  }

  // Start at 100% and subtract 10% for every unmet requirement point.
  const unmet = ["physique", "intellect", "charisma"].reduce((sum, key) => {
    const req = task.requiredSkills[key] || 0;
    const have = totals[key] || 0;
    return sum + Math.max(0, req - have);
  }, 0);

  const baseChance = clamp(1 - unmet * 0.1, 0, 1);
  const moraleBonus = (moraleTotal / (10 * npcs.length) - 0.7) * 0.5;
  const synergyBonus = getSynergyBonus(npcs);
  const successChance = clamp(baseChance + moraleBonus + synergyBonus, 0, 1);

  const roll = Math.random();
  const success = roll < successChance;
  return {
    success,
    skillMatch: totals,
    baseChance: Number(baseChance.toFixed(2)),
    moraleBonus: Number(moraleBonus.toFixed(2)),
    synergyBonus: Number(synergyBonus.toFixed(2)),
    successChance: Number(successChance.toFixed(2))
  };
}

function changeMorale(npc, amount) {
  npc.state.morale = clamp(npc.state.morale + amount, 0, 10);
}

function updateRelationshipIntensity(assignedNpcs, delta) {
  if (assignedNpcs.length < 2) return;
  assignedNpcs.forEach((npcA) => {
    assignedNpcs.forEach((npcB) => {
      if (npcA === npcB) return;
      npcA.relationships = npcA.relationships || {};
      npcA.relationships[npcB.id] = npcA.relationships[npcB.id] || {
        label: "custom",
        intensity: 0,
        notes: ""
      };
      const current = Number(npcA.relationships[npcB.id].intensity || 0);
      npcA.relationships[npcB.id].intensity = clamp(current + delta, -3, 3);
    });
  });
}

export function applyTaskConsequences(task, assignedNpcs, result, gameState) {
  const stateLog = [];
  const staminaBase = task.staminaCost;
  const staminaFailExtra = result.success ? 0 : (task.extraStaminaOnFail || 0);
  const playDamageSound = () => {
    if (!gameState.soundOn) return;
    try {
      const audio = new Audio("./sounds/damage.mp3");
      audio.volume = 0.15;
      audio.play().catch(() => {});
    } catch (err) {
      console.warn("Damage sound failed", err);
    }
  };

  // Track outcome on the task for UI
  task.lastOutcome = result.success ? "success" : "fail";

  assignedNpcs.forEach((npc) => {
    npc.state.stamina = clamp(npc.state.stamina - (staminaBase + staminaFailExtra), 0, 5);

    const injuryChance = clamp(task.dangerLevel * 0.12 + (result.success ? 0 : 0.15), 0, 0.8);
    if (task.dangerLevel > 0 && Math.random() < injuryChance) {
      const damage = Math.max(1, task.dangerLevel - (result.success ? 1 : 0));
      npc.state.health = clamp(npc.state.health - damage, 0, 5);
      playDamageSound();
      npc.damageFlashAt = Date.now();
      if (npc.state.health <= 0 && !npc.isDead) {
        npc.isDead = true;
        handleNpcDeath(npc, gameState);
      }
    }

    changeMorale(npc, result.success ? 2 : -2);
    if (result.success && task.id === "rest") {
      npc.state.health = clamp((npc.state.health || 0) + 1, 0, 5);
      stateLog.push(`${npc.name} recovered 1 health.`);
    }
  });

  updateRelationshipIntensity(assignedNpcs, result.success ? 1 : -1);

  if (!result.success && task.penalty > 0) {
    const targets =
      task.penaltyTaker === "all"
        ? gameState.npcs.filter((n) => !n.isDead)
        : assignedNpcs;

    targets.forEach((npc) => {
      npc.state.health = clamp(npc.state.health - task.penalty, 0, 5);
      playDamageSound();
      npc.damageFlashAt = Date.now();
      if (npc.state.health <= 0 && !npc.isDead) {
        npc.isDead = true;
        handleNpcDeath(npc, gameState);
      }
    });
  }

  const assignedNames = assignedNpcs.map((n) => n.name).join(", ") || "no one";
  const outcome = result.success ? "succeeded" : "failed";
  const toPercent = (value) => `${Math.round(Number(value) * 100)}%`;
  const baseChance = toPercent(result.baseChance ?? 0);
  const moraleBonus = toPercent(result.moraleBonus ?? 0);
  const synergyBonus = toPercent(result.synergyBonus ?? 0);
  const finalChance = toPercent(result.successChance ?? 0);
  const logEntry = `Day ${gameState.day} - ${task.name} (${assignedNames}) ${outcome} (base ${baseChance}, moraleBonus ${moraleBonus}, synergyBonus ${synergyBonus}, final ${finalChance}).`;
  gameState.log.push(logEntry);
  stateLog.forEach((line) => gameState.log.push(`Day ${gameState.day} - ${line}`));
}

export function runTasksForDay(gameState) {
  gameState.tasksToday.forEach((task) => {
    const assignedNpcs = task.assignedNpcIds
      .map((id) => gameState.npcs.find((npc) => npc.id === id))
      .filter((npc) => npc && !npc.isDead);

    const result = resolveTask(task, assignedNpcs);
    applyTaskConsequences(task, assignedNpcs, result, gameState);

    const unassignedNpcs = gameState.npcs.filter(
      (npc) => !npc.isDead && !task.assignedNpcIds.includes(npc.id)
    );
    unassignedNpcs.forEach((npc) => {
      changeMorale(npc, result.success ? 1 : -1);
    });
  });

  // Recover stamina for NPCs who were not assigned
  const assignedIds = new Set(gameState.tasksToday.flatMap((t) => t.assignedNpcIds));
  gameState.npcs.forEach((npc) => {
    if (npc.isDead) return;
    if (!assignedIds.has(npc.id)) {
      npc.state.stamina = clamp((npc.state.stamina || 0) + 1, 0, 5);
    }
  });

  checkStaminaDeaths(gameState);
}

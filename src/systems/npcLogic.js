const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export function handleNpcDeath(deadNpc, gameState) {
  gameState.log.push(`Day ${gameState.day} - ${deadNpc.name} died.`);

  gameState.npcs.forEach((npc) => {
    if (npc.id === deadNpc.id || npc.isDead) return;
    const moraleHit = -2;
    npc.state.morale = clamp(npc.state.morale + moraleHit, 0, 10);
    if (npc.state.morale <= 2 && !npc.state.statusFlags.includes("shaken")) {
      npc.state.statusFlags.push("shaken");
    }
  });
}

export function getNpcMoodDescription(npc) {
  const { stamina, morale } = npc.state;
  if (morale <= 2) return "quietly despairing";
  if (stamina >= 7 && morale >= 7) return "focused";
  if (stamina <= 3 && morale >= 6) return "exhausted but determined";
  if (stamina <= 3) return "spent and wavering";
  if (morale <= 4) return "uneasy";
  if (morale >= 8) return "hopeful";
  return "watchful";
}

export function checkStaminaDeaths(gameState) {
  gameState.npcs.forEach((npc) => {
    if (npc.isDead) return;
    if ((npc.state.stamina || 0) <= 0) {
      npc.isDead = true;
      npc.state.health = 0;
      if (gameState.soundOn) {
        try {
          const audio = new Audio("./sounds/damage.mp3");
          audio.volume = 0.15;
          audio.play().catch(() => {});
        } catch (err) {
          console.warn("Damage sound failed", err);
        }
      }
      handleNpcDeath(npc, gameState);
    }
  });
}

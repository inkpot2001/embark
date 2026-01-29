import { createInitialGameState, setGameState } from "./gameState.js";
import { initialNpcs } from "./data/npcs.js";
import { renderGame } from "./ui/render.js";
import { attachEventHandlers } from "./ui/events.js";

function cloneNpcs(npcs) {
  return npcs.map((npc) => JSON.parse(JSON.stringify(npc)));
}

function init() {
  const state = createInitialGameState();
  state.npcs = cloneNpcs(initialNpcs);
  setGameState(state);
  attachEventHandlers(state);
  renderGame(state);
}

init();

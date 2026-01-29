export function startNewDay(gameState) {
  gameState.day += 1;
  gameState.plannedTravelToday = 2;
  gameState.tasksToday = [];
  gameState.phase = "morning";
  gameState.isLoadingTasks = false;
  gameState.showConversationModal = false;
  gameState.conversations = [];
  gameState.successNarratives = [];
  gameState.failureNarratives = [];
  gameState.showSettingsModal = false;
  gameState.showDebugModal = false;
  gameState.showNpcProfile = false;
  gameState.npcProfileId = null;
  gameState.showEndingCutscene = false;
  gameState.endingCutsceneIndex = 0;
  gameState.endingCutsceneLines = [];
  gameState.pendingGameOverReason = null;
  gameState.showTutorialModal = false;
  gameState.tutorialIndex = 0;
  gameState.taskAnimationPending = false;
}

export function finalizeDay(gameState) {
  gameState.distanceTraveled += gameState.plannedTravelToday;
  checkGameOver(gameState);
}

export function checkGameOver(gameState) {
  const allDead = gameState.npcs.every((npc) => npc.isDead);
  if (allDead) {
    gameState.phase = "gameover";
    gameState.gameOverReason = "lose";
    return;
  }
  if (gameState.distanceTraveled >= 20) {
    gameState.pendingGameOverReason = "win";
  }
}

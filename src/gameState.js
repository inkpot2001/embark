export function createInitialGameState() {
  return {
    day: 1,
    distanceTraveled: 0,
    plannedTravelToday: 2,
    npcs: [],
    tasksToday: [],
    log: [],
    diaryEntries: [
      {
        day: 1,
        title: "Day 1",
        body: "We step into the forest before dawn, carrying what little we can. The path is colder than the stories."
      }
    ],
    blueMarkerPos: 0,
    phase: "morning",
    gameOverReason: null,
    npcSortKey: "name",
    language: "en",
    logVisible: false,
    showConversationModal: false,
    conversations: [],
    successNarratives: [],
    failureNarratives: [],
    conversationStep: null,
    isLoadingTasks: false,
    showSettingsModal: false,
    showDebugModal: false,
    debugRelA: null,
    debugRelB: null,
    showDiaryModal: false,
    showMoonModal: false,
    showNpcProfile: false,
    npcProfileId: null,
    showIntroModal: true,
    showCutscene: false,
    cutsceneIndex: 0,
    showEndingCutscene: false,
    endingCutsceneIndex: 0,
    endingCutsceneLines: [],
    pendingGameOverReason: null,
    showTutorialModal: false,
    tutorialIndex: 0,
    soundOn: true,
    taskAnimationPending: false
  };
}

export let gameState = null;

export function setGameState(state) {
  gameState = state;
}

const OPENAI_ENDPOINT = "https://api.openai.com/v1/chat/completions";
const OPENAI_MODEL = "gpt-3.5-turbo";
const OPENAI_API_KEY_PLACEHOLDER = "sk-proj-NGnAeUoaoDcpsaV4aiG_R7WvSKVRCM85gsteD8wYN2szJA0bMKhHhPssF46WWF8PpmDqLfJURbT3BlbkFJo9KHPInAzgDkYTmfNasHfU6JVkCG_RDLH0iSZh4mC6qrCOeOLS3pm5KzbQgFVuLM-KIB3fd8UAY";

function getApiKey() {
  if (typeof window === "undefined") return null;
  return (
    window.OPENAI_API_KEY ||
    localStorage.getItem("openai_api_key") ||
    OPENAI_API_KEY_PLACEHOLDER ||
    null
  );
}

function buildNpcSummary(npcs) {
  return npcs.map((n) => {
    return `${n.name} (P${n.skills.physique}/I${n.skills.intellect}/C${n.skills.charisma}, Health ${n.state.health}/5, Stamina ${n.state.stamina}/5, Morale ${n.state.morale}/10)`;
  }).join("; ");
}

function buildNpcConversationContext(npcs, language) {
  const useJapanese = language === "ja";
  return npcs.map((n) => {
    const tags = n.personality?.tags?.join(", ") || "unknown";
    const tone = useJapanese ? (n.personality?.toneJa || "n/a") : (n.personality?.tone || "n/a");
    const rels = n.relationships
      ? Object.entries(n.relationships)
          .map(([id, rel]) => {
            const label = useJapanese ? (rel.labelJa || rel.label || "n/a") : (rel.label || "n/a");
            const notes = useJapanese ? rel.notesJa || rel.notes : rel.notes;
            const notesText = notes ? ` (${notes})` : "";
            return `${id}: ${label}${notesText}`;
          })
          .join("; ")
      : "";
    const backstory = useJapanese ? (n.backstoryJa || n.backstory || "n/a") : (n.backstory || "n/a");
    return `${n.name}: tags [${tags}]; tone: ${tone}; backstory: ${backstory}; relationships: ${rels || "none listed"}`;
  }).join("\n");
}

function extractFirstJsonObject(raw) {
  const text = raw.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  let depth = 0;
  let start = -1;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (ch === "{") {
      if (depth === 0) start = i;
      depth += 1;
    } else if (ch === "}") {
      depth -= 1;
      if (depth === 0 && start !== -1) {
        return text.slice(start, i + 1);
      }
    }
  }
  return text;
}

function extractFirstJsonArray(raw) {
  const text = raw.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  let depth = 0;
  let start = -1;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (ch === "[") {
      if (depth === 0) start = i;
      depth += 1;
    } else if (ch === "]") {
      depth -= 1;
      if (depth === 0 && start !== -1) {
        return text.slice(start, i + 1);
      }
    }
  }
  return text;
}

export async function fetchTasksFromOpenAI(gameState) {
  const apiKey = getApiKey();
  if (!apiKey) return null;

  const npcSummary = buildNpcSummary(gameState.npcs);
  const travelProgress = Math.max(0, Math.min(1, gameState.plannedTravelToday / 10));
  const prompt = gameState.language === "ja"
    ? `
暗く危険な森を進む仲間たちに降りかかる、現実的なサバイバル任務を生成する。

ルール:
- JSON配列のみで、${Math.max(0, Math.round(gameState.plannedTravelToday))} 件の「タスク」を返す（前置き・説明文・コードフェンス禁止）。
- 各タスクに必須の項目: id (kebab-case), name(短く), description(1-2文), requiredSkills {physique,intellect,charisma} 整数0-20, penalty(0-2), penaltyTaker("assigned" もしくは "all")。
- 森で発生しうることについてクリエイティブに考える。野生動物との遭遇なども。
- 非現実的な存在は不可（森の精霊など）。
- nameとdescriptionは必ず日本語で。
- descriptionは必ず30文字以上、50文字以内。雰囲気を伝えるためのフレーバーテキストを添える。
- そのタスクの難しさについて考える。成功するためには、どれだけのskill(physique/intellect/charisma)が必要だろうか？
- 補足：charismaは、例えば動物の心理を読んだり、問題に対する意外な解決策を思いつくのに必要。
- 難易度に応じてrequiredSkillsを調整。0-5: ほぼ不要。6-14: 中程度。15-20: 非常に高い要求レベル。
- requiredSkillsの合計値（physique+intellect+charisma）は10〜25の範囲に収める。
- そのタスクに失敗するとどうなるか考え、penaltyとpenaltyTakerを設定。

同行者: ${npcSummary}

JSONのみで、必ずこの例のようなフォーマットに従って返す:
[{"id":"repel-bugs","name":"毒虫の撃退","description":"...","requiredSkills":{"physique":7,"intellect":10,"charisma":3}, "penalty":"1", "penaltyTaker":"assigned"}]
`.trim()
    : `
You are generating realistic survival tasks for a small expedition navigating a dark, dangerous forest.

Rules:
- Return exactly ${Math.max(0, Math.round(gameState.plannedTravelToday))} tasks as JSON only (no prose), array of objects.
- Each task must have: id (kebab-case), name (short), description (1-2 sentences), requiredSkills {physique,intellect,charisma} integers 0-20, penalty(0-2), penaltyTaker ("assigned" or "all").
- Be creative. Most unexpected things can happen in the woods, including animal encounters.
- Keep things realistic. No "forest spirits".
- Description should sound somewhat poetic. No more than 120 characters in total.
- Think about the difficulty of the task. How much skill (physique/intellect/charisma) would the task demand?
- note: examples for situations requiring charisma: dealing with animals or coming up with unexpected solutions for unexpected incidents.
- Scale requiredSkills so it matches the quality of the task. 0-5: the skill is barely required. 6-14: the skill is moderately required. 15-20: the skill is absolutely required at a very high standard.
- Keep the total sum of requiredSkills (physique+intellect+charisma) between 10 and 25.
- Scale penalty and penaltyTaker based on the quality of the task. Imagine who might get hurt from failing the task, and how much damage they should take.

Companions: ${npcSummary}

Return JSON only, like:
[{"id":"repel-bugs","name":"Repel poisonous insects","description":"...","requiredSkills":{"physique":7,"intellect":10,"charisma":3}, "penalty":"1", "penaltyTaker":"assigned"]
`.trim();

  const body = {
    model: OPENAI_MODEL,
    messages: [
      { role: "system", content: "You are a terse task generator for a survival strategy game. Only output JSON arrays of tasks." },
      { role: "user", content: prompt }
    ],
    temperature: 0.8,
    max_tokens: 800
  };

  const resp = await fetch(OPENAI_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify(body)
  });

  if (!resp.ok) {
    console.warn("OpenAI response not ok", resp.status, await resp.text());
    return null;
  }

  const data = await resp.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) return null;

  let parsed;
  try {
    const normalized = extractFirstJsonArray(content)
      .replace(/，/g, ",")
      .replace(/：/g, ":");
    parsed = JSON.parse(normalized);
  } catch (err) {
    console.warn("Failed to parse OpenAI tasks JSON", err, content);
    return null;
  }

  if (!Array.isArray(parsed)) return null;

  return parsed
    .map((t, idx) => ({
      id: String(t.id || `ai-task-${idx + 1}`).toLowerCase().replace(/\s+/g, "-"),
      name: t.name || "Unknown Task",
      description: t.description || "An uncertain task awaits.",
      requiredSkills: {
        physique: Number(t.requiredSkills?.physique) || 1,
        intellect: Number(t.requiredSkills?.intellect) || 1,
        charisma: Number(t.requiredSkills?.charisma) || 1
      },
      difficulty: Number(t.difficulty) || 1,
      dangerLevel: Number(t.dangerLevel) || 0,
      penalty: Number(t.penalty) || 0,
      penaltyTaker: t.penaltyTaker === "all" ? "all" : "assigned",
      staminaCost: 1,
      assignedNpcIds: []
    }))
    .slice(0, 4);
}

export async function fetchTaskConversation(task, npcs, gameState) {
  const apiKey = getApiKey();
  if (!apiKey) return null;

  const speakerList = npcs
    .map((n) => `${n.name} (P${n.skills.physique}/I${n.skills.intellect}/C${n.skills.charisma}, health ${n.state.health}/5, morale ${n.state.morale}/10)`)
    .join("; ");
  const moraleSummary = npcs
    .map((n) => `${n.name}: morale ${n.state.morale}/10`)
    .join("; ");
  const moraleValues = npcs.map((n) => Number(n.state.morale || 0));
  const avgMorale = moraleValues.length
    ? moraleValues.reduce((sum, val) => sum + val, 0) / moraleValues.length
    : 0;
  const minMorale = moraleValues.length ? Math.min(...moraleValues) : 0;
  const totalMorale = moraleValues.reduce((sum, val) => sum + val, 0);
  const moraleBonus = moraleValues.length ? totalMorale / (10 * moraleValues.length) - 0.5 : -0.5;
  const synergyDirection = moraleBonus >= 0 ? "positive, cooperative, friendly" : "negative, incooperative, blunt, rude";
  const synergyDirectionJa = moraleBonus >= 0 ? "前向き、協力的、友好的" : "険悪、非協力的、挑発的";
  const personaContext = buildNpcConversationContext(gameState.npcs, gameState.language);
  const allowedNames = npcs.map((n) => n.name);
  const allowedNamesText = allowedNames.join(", ");
  const prompt = gameState.language === "ja"
    ? `
サバイバル任務中の仲間たちの短い会話を書く。
必ずJSONのみでこのように返す: {"lines":["Name: line", ...4-5文...]}。各行は必ず発言者の名前で始める。例：「ヤビ: セリフ」
Task: ${task.name} — ${task.description}
Day: ${gameState.day}, planned travel ${gameState.plannedTravelToday}/10.
Speakers: ${speakerList}
*重要* SpeakersにいるNPCだけがその場にいるので、発言できるのはSpeakersにいるNPCのみ。次の名前以外で発言を始めてはいけない: ${allowedNamesText}。
その場にいないNPCについて話題にしてもよい。
例（その場にいないNPCについて言及しているが、発言者はSpeakersのみ）:
ヤビ: コブ、もっとたくさん運べるだろ！
コブ: 頑張ってるけど… 僕はナユカじゃないんだよ。
ヤビ: あいつは確かに強いが、お前はお前でいい。お前なりに強くなれ。

moraleが3以下のNPCは、必ず他のNPCに対して非常にネガティブもしくは攻撃的な発言をする。
moraleが8以上のNPCは、必ず他のNPCに対して非常にポジティブもしくは元気付けるような発言をする。
${moraleSummary}
士気ボーナス: ${moraleBonus.toFixed(2)}（${synergyDirectionJa}）。この方向に会話の雰囲気を寄せる。
性格・背景・関係性を考慮:
${personaContext}
toneJaに合わせて語彙や口調を調整する。
状況や性格の相性によっては対立や口論することも可。
`.trim()
    : `
You write short in-camp dialogue between assigned companions during a survival task.
Return JSON ONLY in this shape: {"lines":["Name: line", ...4-5 short dialogue lines...]}. Each line must start with the speaker name followed by a colon and their speech.
Task: ${task.name} — ${task.description}
Day: ${gameState.day}, planned travel ${gameState.plannedTravelToday}/10.
Speakers: ${speakerList}
*important* ONLY NPCs listed in Speakers may talk, because they are the only ones there. Do NOT start any line with a name outside this list: ${allowedNamesText}.
They may mention or talk about other NPCs who are not there.
Example (mentioning an unassigned NPC by name, but only assigned NPCs speak):
Yabi: Come on Kobu, you can carry more!
Kobu: I'm trying, but I'm not Nayuka!
Yabi: She is indeed strong, but you don't need to be "like" her. You can still be you and be tough.

If an NPC's morale <= 3, they must say something very blunt/negative against another NPC.
If an NPC's morale >= 8, they must say something very encouraging/positive to another NPC.
${moraleSummary}
Morale bonus: ${moraleBonus.toFixed(2)} (${synergyDirection}). Match the conversation tone to this direction.
Consider their personality, backstory, and relationships:
${personaContext}
Use each speaker's tone to shape word choice and rhythm.
NPCs may disagree or even argue with each other, depending on their personalities and the stressfulness of the situation.
`.trim();

  const body = {
    model: OPENAI_MODEL,
    messages: [
      { role: "system", content: "You are a terse dialog writer for a survival strategy game. Only output JSON arrays of dialogue lines." },
      { role: "user", content: prompt }
    ],
    temperature: 0.8,
    max_tokens: 400
  };

  const resp = await fetch(OPENAI_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify(body)
  });

  if (!resp.ok) {
    console.warn("OpenAI conversation response not ok", resp.status, await resp.text());
    return null;
  }

  const data = await resp.json();
  let content = data?.choices?.[0]?.message?.content;
  if (!content) return null;

  content = extractFirstJsonObject(content)
    .replace(/,\s*([}\]])/g, "$1");
  try {
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed)) {
      return { lines: parsed.map((line) => String(line)) };
    }
    if (!parsed || !Array.isArray(parsed.lines)) return null;
    const allowedSet = new Set(allowedNames);
    return {
      lines: parsed.lines
        .map((line) => String(line))
        .filter((line) => {
          const speaker = line.split(":")[0].trim();
          return allowedSet.has(speaker);
        })
    };
  } catch (err) {
    console.warn("Failed to parse OpenAI conversation JSON", err, content);
    return null;
  }
}

export async function fetchTaskFailureNarrative(task, npcs, gameState) {
  const apiKey = getApiKey();
  if (!apiKey) return null;

  const speakerList = npcs
    .map((n) => `${n.name} (P${n.skills.physique}/I${n.skills.intellect}/C${n.skills.charisma}, health ${n.state.health}/5, morale ${n.state.morale}/10)`)
    .join("; ");
  const personaContext = buildNpcConversationContext(npcs, gameState.language);
  const prompt = gameState.language === "ja"
    ? `
任務失敗時の短い会話を書く。
JSONのみ（コードフェンス不要）: {"lines":["Name: line", ...1-3行...]}。各行は必ず発言者の名前で始める。例：「ヤビ: セリフ」
そのタスクに一人しかいないのであれば、独り言でもよい。
必ず日本語で。
Task: ${task.name} — ${task.description}
Day: ${gameState.day}, planned travel ${gameState.plannedTravelToday}/10.
Assigned: ${speakerList}
性格・背景・関係性を考慮:
${personaContext}
失敗の理由や反応は具体的に。
`.trim()
    : `
You write a short in-camp exchange that descrives the situation, or NPCs' reaction to the failure.
Return JSON ONLY without code fences, in this shape: {"lines":["Name: line", ...1-3 short dialogue lines...]}. Each line must start with the speaker name followed by a colon and their speech.
If only one NPC is assigned, they may react with a self-talk.
Task: ${task.name} — ${task.description}
Day: ${gameState.day}, planned travel ${gameState.plannedTravelToday}/10.
Assigned: ${speakerList}
Consider their personality, backstory, and relationships:
${personaContext}
Use their personality and backstory to explain the failure.
Keep it grounded and concrete.
`.trim();

  const body = {
    model: OPENAI_MODEL,
    messages: [
      { role: "system", content: "You are a terse narrator of task failures. Only output JSON objects with a lines array." },
      { role: "user", content: prompt }
    ],
    temperature: 0.8,
    max_tokens: 400
  };

  const resp = await fetch(OPENAI_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify(body)
  });

  if (!resp.ok) {
    console.warn("OpenAI failure narrative response not ok", resp.status, await resp.text());
    return null;
  }

  const data = await resp.json();
  let content = data?.choices?.[0]?.message?.content;
  if (!content) return null;

  content = extractFirstJsonObject(content);
  try {
    const parsed = JSON.parse(content);
    if (!parsed || !Array.isArray(parsed.lines)) return null;
    return {
      lines: parsed.lines.map((line) => String(line))
    };
  } catch (err) {
    console.warn("Failed to parse OpenAI failure narrative JSON", err, content);
    return null;
  }
}

export async function fetchTaskSuccessNarrative(task, npcs, gameState) {
  const apiKey = getApiKey();
  if (!apiKey) return null;

  const speakerList = npcs
    .map((n) => `${n.name} (P${n.skills.physique}/I${n.skills.intellect}/C${n.skills.charisma}, health ${n.state.health}/5, morale ${n.state.morale}/10)`)
    .join("; ");
  const personaContext = buildNpcConversationContext(npcs, gameState.language);
  const prompt = gameState.language === "ja"
    ? `
任務成功時の短い会話を書く。
JSONのみ（コードフェンス不要）: {"lines":["Name: line", ...1-3行...]}。各行は必ず発言者の名前で始める。例：「ヤビ: セリフ」
そのタスクに一人しかいないのであれば、独り言でもよい。
必ず日本語で。
Task: ${task.name} — ${task.description}
Day: ${gameState.day}, planned travel ${gameState.plannedTravelToday}/10.
Assigned: ${speakerList}
性格・背景・関係性を考慮:
${personaContext}
成功の理由や反応は具体的に。
`.trim()
    : `
You write a short in-camp exchange that describes the situation or NPCs' reaction to the success.
Return JSON ONLY without code fences, in this shape: {"lines":["Name: line", ...1-3 short dialogue lines...]}. Each line must start with the speaker name followed by a colon and their speech.
If only one NPC is assigned, they may react with a self-talk.
Task: ${task.name} — ${task.description}
Day: ${gameState.day}, planned travel ${gameState.plannedTravelToday}/10.
Assigned: ${speakerList}
Consider their personality, backstory, and relationships:
${personaContext}
Explain the success in concrete terms.
`.trim();

  const body = {
    model: OPENAI_MODEL,
    messages: [
      { role: "system", content: "You are a terse narrator of task successes. Only output JSON objects with a lines array." },
      { role: "user", content: prompt }
    ],
    temperature: 0.8,
    max_tokens: 400
  };

  const resp = await fetch(OPENAI_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify(body)
  });

  if (!resp.ok) {
    console.warn("OpenAI success narrative response not ok", resp.status, await resp.text());
    return null;
  }

  const data = await resp.json();
  let content = data?.choices?.[0]?.message?.content;
  if (!content) return null;

  content = extractFirstJsonObject(content);
  try {
    const parsed = JSON.parse(content);
    if (!parsed || !Array.isArray(parsed.lines)) return null;
    return {
      lines: parsed.lines.map((line) => String(line))
    };
  } catch (err) {
    console.warn("Failed to parse OpenAI success narrative JSON", err, content);
    return null;
  }
}

export async function fetchRelationshipUpdate(npcA, npcB, task, outcome, gameState) {
  const apiKey = getApiKey();
  if (!apiKey) return null;

  const relA = npcA.relationships?.[npcB.id] || {};
  const relB = npcB.relationships?.[npcA.id] || {};
  const historyA = Array.isArray(relA.history) ? relA.history : [];
  const historyB = Array.isArray(relB.history) ? relB.history : [];
  const formatHistory = (history, isJa) => {
    if (!history.length) return isJa ? "履歴なし" : "No history";
    const take = history.slice(-3);
    return take
      .map((entry) => {
        const label = isJa ? entry.labelJa || entry.label : entry.label || entry.labelJa;
        const notes = isJa ? entry.notesJa || entry.notes : entry.notes || entry.notesJa;
        const labelText = label ? `label: ${label}` : "label: n/a";
        const notesText = notes ? `notes: ${notes}` : "notes: n/a";
        return `Day ${entry.day} (${entry.outcome}) ${labelText} / ${notesText}`;
      })
      .join("\n");
  };
  const prompt = gameState.language === "ja"
    ? `
任務の結果を受けて、2人の関係性を更新する。2人が持ち得る関係性とその変化を、創造的に想像し、表現する。
必ずJSONのみで返す: {"aToB":{"labelJa":"...","notesJa":"..."}, "bToA":{"labelJa":"...","notesJa":"..."}}。
短いラベルと、1-2文の説明にする。日本語のみ。

Task: ${task.name} — ${task.description}
Outcome: ${outcome}

NPC A: ${npcA.name}
Backstory: ${npcA.backstoryJa || npcA.backstory}
A→B 現在: ${relA.labelJa || relA.label || "n/a"} / ${relA.notesJa || relA.notes || "n/a"}
Intensity(A→B): ${Number(relA.intensity || 0)}
過去の更新履歴:
${formatHistory(historyA, true)}

NPC B: ${npcB.name}
Backstory: ${npcB.backstoryJa || npcB.backstory}
B→A 現在: ${relB.labelJa || relB.label || "n/a"} / ${relB.notesJa || relB.notes || "n/a"}
Intensity(B→A): ${Number(relB.intensity || 0)}
過去の更新履歴:
${formatHistory(historyB, true)}

任務の結果と現在の関係性を踏まえ、少し変化した表現にする。
`.trim()
    : `
Update the relationship between two NPCs based on a task outcome. Be creative and imagine what kind of relationship they have, and they may have in the future.
Return JSON ONLY: {"aToB":{"label":"...","notes":"..."}, "bToA":{"label":"...","notes":"..."}}.
Use a short label and 1-2 sentence notes. English only.

Task: ${task.name} — ${task.description}
Outcome: ${outcome}

Use the previous relationship history to keep tone consistent.
NPC A: ${npcA.name}
Backstory: ${npcA.backstory}
A->B current: ${relA.label || "n/a"} / ${relA.notes || "n/a"}
Intensity(A->B): ${Number(relA.intensity || 0)}
History:
${formatHistory(historyA, false)}

NPC B: ${npcB.name}
Backstory: ${npcB.backstory}
B->A current: ${relB.label || "n/a"} / ${relB.notes || "n/a"}
Intensity(B->A): ${Number(relB.intensity || 0)}
History:
${formatHistory(historyB, false)}

Reflect the outcome and slightly evolve the relationship text.
`.trim();

  const body = {
    model: OPENAI_MODEL,
    messages: [
      { role: "system", content: "You update short NPC relationship descriptors. Only output JSON objects." },
      { role: "user", content: prompt }
    ],
    temperature: 0.7,
    max_tokens: 220
  };

  const resp = await fetch(OPENAI_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify(body)
  });

  if (!resp.ok) {
    console.warn("OpenAI relationship update not ok", resp.status, await resp.text());
    return null;
  }

  const data = await resp.json();
  let content = data?.choices?.[0]?.message?.content;
  if (!content) return null;

  content = extractFirstJsonObject(content);
  try {
    const parsed = JSON.parse(content);
    if (!parsed || !parsed.aToB || !parsed.bToA) return null;
    return parsed;
  } catch (err) {
    console.warn("Failed to parse OpenAI relationship JSON", err, content);
    return null;
  }
}

export async function fetchDiaryEntry(gameState) {
  const apiKey = getApiKey();
  if (!apiKey) return null;

  const npcSummary = buildNpcSummary(gameState.npcs);
  const moraleSnapshot = gameState.npcs
    .map((n) => `${n.name}: morale ${n.state.morale}/10, stamina ${n.state.stamina}/5, health ${n.state.health}/5`)
    .join("; ");
  const taskSummary = (gameState.tasksToday || [])
    .map((task) => {
      const assignedNames = (task.assignedNpcIds || [])
        .map((id) => gameState.npcs.find((npc) => npc.id === id)?.name)
        .filter(Boolean)
        .join(", ");
      const outcome = task.lastOutcome || "unknown";
      return `${task.name}: ${outcome} (${assignedNames || "no one"})`;
    })
    .join("; ");
  const relationshipHistory = gameState.npcs
    .flatMap((npc) =>
      Object.entries(npc.relationships || {}).map(([otherId, rel]) => {
        const history = Array.isArray(rel.history) ? rel.history : [];
        if (!history.length) return null;
        const otherName = gameState.npcs.find((n) => n.id === otherId)?.name || otherId;
        const recent = history.slice(-2).map((entry) => {
          const label = gameState.language === "ja" ? entry.labelJa || entry.label : entry.label || entry.labelJa;
          const notes = gameState.language === "ja" ? entry.notesJa || entry.notes : entry.notes || entry.notesJa;
          const labelText = label ? `label: ${label}` : "label: n/a";
          const notesText = notes ? `notes: ${notes}` : "notes: n/a";
          return `Day ${entry.day} (${entry.outcome}) ${labelText} / ${notesText}`;
        }).join(" | ");
        return `${npc.name}→${otherName}: ${recent}`;
      })
    )
    .filter(Boolean)
    .join("; ");
  const prompt = gameState.language === "ja"
    ? `
サバイバル中の一日分の日記を書く。
JSONのみで返す: {"title":"Day X","body":"..."}。
今日の出来事と一行程、仲間の状態を反映する。2〜4文、簡潔で雰囲気のある文体。必ず日本語で。
Day: ${gameState.day}
Distance traveled: ${gameState.distanceTraveled}/20
Planned travel today: ${gameState.plannedTravelToday}/10
NPCs: ${npcSummary}
Vitals: ${moraleSnapshot}
Tasks: ${taskSummary || "なし"}
Relationship history: ${relationshipHistory || "なし"}
`.trim()
    : `
You are writing a single diary entry for a survival expedition.
Return JSON ONLY in this shape: {"title":"Day X","body":"..."}.
The entry should reflect today’s events and the group’s condition.
Keep it grounded, concise, and atmospheric. 2-4 sentences.
Day: ${gameState.day}
Distance traveled: ${gameState.distanceTraveled}/20
Planned travel today: ${gameState.plannedTravelToday}/10
NPCs: ${npcSummary}
Vitals: ${moraleSnapshot}
Tasks: ${taskSummary || "none"}
Relationship history: ${relationshipHistory || "none"}
`.trim();

  const body = {
    model: OPENAI_MODEL,
    messages: [
      { role: "system", content: "You write short diary entries for a survival strategy game. Only output JSON." },
      { role: "user", content: prompt }
    ],
    temperature: 0.7,
    max_tokens: 400
  };

  const resp = await fetch(OPENAI_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify(body)
  });

  if (!resp.ok) {
    console.warn("OpenAI diary response not ok", resp.status, await resp.text());
    return null;
  }

  const data = await resp.json();
  let content = data?.choices?.[0]?.message?.content;
  if (!content) return null;

  content = extractFirstJsonObject(content);
  try {
    const parsed = JSON.parse(content);
    if (!parsed || typeof parsed !== "object") return null;
    return {
      title: String(parsed.title || `Day ${gameState.day}`),
      body: String(parsed.body || "")
    };
  } catch (err) {
    console.warn("Failed to parse OpenAI diary JSON", err, content);
    return null;
  }
}

export async function fetchEndingCutscene(gameState, aliveNpcs, deadNpcs) {
  const apiKey = getApiKey();
  if (!apiKey) return null;

  const survivors = (aliveNpcs || []).map((n) => n.name).join(", ") || "none";
  const fallen = (deadNpcs || []).map((n) => n.name).join(", ") || "none";
  const relationshipSummary = (aliveNpcs || [])
    .flatMap((npc) =>
      Object.entries(npc.relationships || {}).map(([otherId, rel]) => {
        const otherName = (aliveNpcs || []).find((n) => n.id === otherId)?.name || otherId;
        const label = gameState.language === "ja" ? rel.labelJa || rel.label : rel.label || rel.labelJa;
        const notes = gameState.language === "ja" ? rel.notesJa || rel.notes : rel.notes || rel.notesJa;
        const labelText = label ? `label: ${label}` : "label: n/a";
        const notesText = notes ? `notes: ${notes}` : "notes: n/a";
        return `${npc.name}→${otherName}: ${labelText} / ${notesText}`;
      })
    )
    .join("; ");
  const relationshipHistory = (aliveNpcs || [])
    .flatMap((npc) =>
      Object.entries(npc.relationships || {}).map(([otherId, rel]) => {
        const history = Array.isArray(rel.history) ? rel.history : [];
        if (!history.length) return null;
        const otherName = (aliveNpcs || []).find((n) => n.id === otherId)?.name || otherId;
        const recent = history.slice(-2).map((entry) => {
          const label = gameState.language === "ja" ? entry.labelJa || entry.label : entry.label || entry.labelJa;
          const notes = gameState.language === "ja" ? entry.notesJa || entry.notes : entry.notes || entry.notesJa;
          const labelText = label ? `label: ${label}` : "label: n/a";
          const notesText = notes ? `notes: ${notes}` : "notes: n/a";
          return `Day ${entry.day} (${entry.outcome}) ${labelText} / ${notesText}`;
        }).join(" | ");
        return `${npc.name}→${otherName}: ${recent}`;
      })
    )
    .filter(Boolean)
    .join("; ");
  const prompt = gameState.language === "ja"
    ? `
ギシュテに到達した瞬間の短い会話を書く。
必ずJSONのみで返す: {"lines":["Name: line", ...4-6行...]}。各行は必ず発言者の名前で始める。例：「ヤビ: セリフ」
生存者のみが話す。お互いの努力と苦労を讃えあう。
もし死亡した仲間がいれば、必ず彼らについての言及や追悼を含める。
生存者: ${survivors}
死亡した仲間: ${fallen}
状況: 長い旅の末にギシュテへ到着した。疲弊と安堵が混じる。
関係性の現在: ${relationshipSummary || "なし"}
関係性の履歴: ${relationshipHistory || "なし"}
旅路の中で関係がどう変わったかを振り返る。
必ず日本語で。
`.trim()
    : `
Write a short conversation at the moment they finally reach Gishute.
Return JSON ONLY: {"lines":["Name: line", ...4-6 lines...]}. Each line must start with the speaker name followed by a colon.
Only survivors speak. They praise each other's effort and hardship. 
If there are any fallen companions, they must mention and mourn them.
Survivors: ${survivors}
Fallen: ${fallen}
Context: After a long journey, they arrive at Gishute, exhausted and relieved.
Current relationships: ${relationshipSummary || "none"}
Relationship history: ${relationshipHistory || "none"}
Have the NPCs reflect on their journey and how their relationships changed.
`.trim();

  const body = {
    model: OPENAI_MODEL,
    messages: [
      { role: "system", content: "You write short ending cutscenes for a survival strategy game. Only output JSON." },
      { role: "user", content: prompt }
    ],
    temperature: 0.8,
    max_tokens: 600
  };

  const resp = await fetch(OPENAI_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify(body)
  });

  if (!resp.ok) {
    console.warn("OpenAI ending cutscene response not ok", resp.status, await resp.text());
    return null;
  }

  const data = await resp.json();
  let content = data?.choices?.[0]?.message?.content;
  if (!content) return null;

  content = extractFirstJsonObject(content);
  try {
    const parsed = JSON.parse(content);
    if (!parsed || !Array.isArray(parsed.lines)) return null;
    return { lines: parsed.lines.map((line) => String(line)) };
  } catch (err) {
    console.warn("Failed to parse OpenAI ending cutscene JSON", err, content);
    return null;
  }
}

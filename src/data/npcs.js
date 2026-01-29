export const initialNpcs = [
  {
    id: "yabi",
    name: "Yabi",
    age: 55,
    gender: "male",
    state: {
      health: 4,
      stamina: 4,
      morale: 6,
      statusFlags: []
    },
    skills: {
      physique: 4,
      intellect: 8,
      charisma: 3
    },
    personality: {
      tags: ["harsh", "disciplined", "guarded", "enduring", "quietly compassionate"],
      tone: "terse, guarded, authoritative",
      toneJa: "厳格で、警戒心が強い。賢者のような口調"
    },
    backstory: "Yabi has carried Palumite through years of loss, and the plague only hardened his view that mercy invites tragedy.",
    backstoryJa: "ヤビは疫病に侵されたパルミテを長年背負ってきた。そして、情けは悲劇を招くという信念をさらに強めた。",
    relationships: {
      cubiri: {
        label: "stern protector",
        labelJa: "厳格な保護者",
        intensity: 0,
        notes: "He treats her sternly, believing protection is best delivered through strictness.",
        notesJa: "彼女に厳しくすることこそが守りだと信じ、厳格に接している。"
      },
      nayuka: {
        label: "quiet reliance",
        labelJa: "無言の信頼",
        intensity: 2,
        notes: "He recognizes her strength and relies on her without needing to say so.",
        notesJa: "強さを認め、言葉にせず頼りにしている。"
      },
      hishor: {
        label: "wary of youth",
        labelJa: "若さに対する警戒",
        intensity: -2,
        notes: "He sees Hishor as emotionally immature and dangerous, but admits his potential.",
        notesJa: "ヒショルは精神的に未熟で危険だと考えているが、潜在能力の高さは認めている。"
      },
      kobu: {
        label: "harsh mentor",
        labelJa: "厳しい師",
        intensity: 1,
        notes: "He is especially harsh on Kobu, precisely because he wants him to survive.",
        notesJa: "生き残ってほしいからこそ特に厳しい。"
      }
    },
    isDead: false
  },
  {
    id: "hishor",
    name: "Hishor",
    age: 26,
    gender: "male",
    state: {
      health: 4,
      stamina: 5,
      morale: 3,
      statusFlags: []
    },
    skills: {
      physique: 7,
      intellect: 4,
      charisma: 4
    },
    personality: {
      tags: ["fierce", "loyal", "impulsive", "emotionally young", "protective"],
      tone: "blunt, impulsive, proud",
      toneJa: "ぶっきらぼうで衝動的、誇り高い。やや攻撃的で若者らしい口調"
    },
    backstory: "Hishor grew up fighting. As the plague has taken away many of his friends, he grew raw, proud, and quick to bristle at authority.",
    backstoryJa: "ヒショルは戦いの中で育った。仲間が次々と疫病に倒れる中生き残った彼は、荒々しく誇り高く、権威に反発しやすい性格になった。",
    relationships: {
      yabi: {
        label: "seeks respect",
        labelJa: "尊敬を求める",
        intensity: -3,
        notes: "He despises Yabi and thinks he is too old and stubborn to lead. But at the same time, Hishor wishes Yabi respected him more.",
        notesJa: "ヤビは指揮を取るには頑固すぎ、また年老いすぎていると考え、軽蔑している。しかし同時に、ヤビに尊敬されたいとも思っている。"
      },
      nayuka: {
        label: "rivalry",
        labelJa: "ライバル視",
        intensity: -1,
        notes: "Hishor trusts her strength even when it frustrates him. He hopes to be stronger than her soon.",
        notesJa: "ナユカのことが気に食わなくても、彼女の力を信用じている。ナユカよりも強くなれる日を心待ちにしている。"
      },
      cubiri: {
        label: "careful protector",
        labelJa: "慎重な守り手",
        intensity: 1,
        notes: "He is careful around her, afraid his world might taint hers.",
        notesJa: "自分の荒々しさが彼女を傷つけてしまうのを恐れて慎重になっている。"
      },
      kobu: {
        label: "sees himself",
        labelJa: "自分を重ねる",
        intensity: 1,
        notes: "He sees his younger, weaker self in Kobu and feels an unspoken obligation.",
        notesJa: "コブに対して幼く弱かった頃の自分を重ね、言葉にならない責任を感じている。"
      }
    },
    isDead: false
  },
  {
    id: "nayuka",
    name: "Nayuka",
    age: 35,
    gender: "female",
    state: {
      health: 5,
      stamina: 5,
      morale: 4,
      statusFlags: []
    },
    skills: {
      physique: 8,
      intellect: 3,
      charisma: 4
    },
    personality: {
      tags: ["confident", "composed", "authoritative", "resilient", "pragmatic"],
      tone: "calm, direct, pragmatic",
      toneJa: "落ち着いていて率直、実務的。女性らしくも強さのある口調"
    },
    backstory: "Nayuka learned early that hesitation kills, and in Palumite’s collapse she became the voice of calm decisions.",
    backstoryJa: "ナユカは躊躇が命取りになることを早くから学び、パルミテの崩壊の中で冷静な決断の軸となった。",
    relationships: {
      yabi: {
        label: "respects authority",
        labelJa: "権威への尊敬",
        intensity: 2,
        notes: "Nayuka respects Yabi for being the eldest and the most experienced.",
        notesJa: "最年長かつ最も熟練したヤビを尊敬している。"
      },
      cubiri: {
        label: "feels sisterhood",
        labelJa: "姉妹のような絆",
        intensity: 1,
        notes: "She treats Cubiri like her younger sister and allows her room to be naive.",
        notesJa: "クビリを妹のように想い、甘えを許している。"
      },
      hishor: {
        label: "trusts but challenges",
        labelJa: "信頼しつつ指導",
        intensity: 1,
        notes: "She trusts his combat instincts but challenges his emotional impulsiveness.",
        notesJa: "ヒショルの戦闘の勘は信頼しているが、衝動性は抑るように指導したいと思っている。"
      },
      kobu: {
        label: "flustrated by weakness",
        labelJa: "弱さに苛立つ",
        intensity: -2,
        notes: "She hates to see weakness in a boy, and expects more from Kobu.",
        notesJa: "弱い男子を見るのが嫌いで、コブはもっと頑張るべきだと考えている。"
      }
    },
    isDead: false
  },
  {
    id: "cubiri",
    name: "Cubiri",
    age: 22,
    gender: "female",
    state: {
      health: 5,
      stamina: 4,
      morale: 7,
      statusFlags: []
    },
    skills: {
      physique: 3,
      intellect: 5,
      charisma: 7
    },
    personality: {
      tags: ["bright", "naive", "optimistic", "emotionally open", "curious"],
      tone: "warm, hopeful",
      toneJa: "温かく前向き。女性らしさがあり、柔らかい口調"
    },
    backstory: "Cubiri was raised by the most loving people of Palumite and believes in the power of kindness even when the situation is dire.",
    backstoryJa: "クビリはパルミテの最も愛情ある人々に囲まれて育ち、辛い環境においても優しさがもたらす希望の力を信じている。",
    relationships: {
      yabi: {
        label: "intimidated but respects",
        labelJa: "畏れと尊敬",
        intensity: 1,
        notes: "She is intimidated by his severity but senses kindness beneath it.",
        notesJa: "厳しさに怯えつつ、内側の優しさを感じる。"
      },
      nayuka: {
        label: "aspiring toward",
        labelJa: "憧れ",
        intensity: 3,
        notes: "She looks up to Nayuka as a model of who she might become.",
        notesJa: "ナユカのように強くなりたいと思い、憧れている。"
      },
      hishor: {
        label: "curious",
        labelJa: "好奇心",
        intensity: 0,
        notes: "She is scared of Hishor, but also intrigued by his raw attitude.",
        notesJa: "ヒショルのことを怖いと感じながらも、その荒々しい態度に心惹かれている。"
      },
      kobu: {
        label: "protective",
        labelJa: "保護本能",
        intensity: 2,
        notes: "She feels instinctively protective of him, as if guarding lost innocence.",
        notesJa: "失われた純真さを守るように庇いたくなる。"
      }
    },
    isDead: false
  },
  {
    id: "kobu",
    name: "Kobu",
    age: 13,
    gender: "male",
    state: {
      health: 3,
      stamina: 3,
      morale: 4,
      statusFlags: []
    },
    skills: {
      physique: 3,
      intellect: 6,
      charisma: 6
    },
    personality: {
      tags: ["gentle", "observant", "melancholic", "sincere", "quietly brave"],
      tone: "soft-spoken, hesitant, observant",
      toneJa: "優しく、柔らかく、謙虚。子供らしさを感じる口調だが、敬語を使う"
    },
    backstory: "Kobu is the youngest survivor of Palumite and carries a quiet grief he struggles to name. He is silently angered by his lack of power more than anyone.",
    backstoryJa: "コブはパルミテの最年少の生存者で、言葉にならない悲しみを胸に抱えている。そして、自分の無力さに誰よりも怒りを静かに感じている。",
    relationships: {
      yabi: {
        label: "fears but understands",
        labelJa: "恐れと理解",
        intensity: -1,
        notes: "He fears Yabi but understands his intentions more than others do.",
        notesJa: "ヤビの厳しさが怖いが、誰よりも意図を理解している。"
      },
      cubiri: {
        label: "lighter around",
        labelJa: "心が軽くなる",
        intensity: 3,
        notes: "He feels lighter around Cubiri, as if allowed to be a child again.",
        notesJa: "クビリの側にいると、子どもであることを許されている気がして心が軽くなる。"
      },
      nayuka: {
        label: "senses disappointment",
        labelJa: "失望されているのを感じる",
        intensity: -1,
        notes: "He knows that Nayuka has little respect for him, but hopes to prove himself soon.",
        notesJa: "ナユカに尊敬されていないことに気づいているが、いつか自分の力を証明したいと思っている。"
      },
      hishor: {
        label: "admires strength",
        labelJa: "強さへの憧れ",
        intensity: 2,
        notes: "He admires Hishor's strength and hopes to be like him.",
        notesJa: "ヒショルの強さに憧れ、彼のようになりたいと思っている。"
      }
    },
    isDead: false
  }
];

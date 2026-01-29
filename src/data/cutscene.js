export function getCutsceneLines(gameState) {
  if (gameState.language === "ja") {
    return [
      "ナユカ: また仲間が死んだ… この村で生きているのはもう私たち五人だけね。",
      "ヒショル: ああ… パルミテは… 俺たちの故郷はもう、だめなのか。",
      "クビリ: だけど、私たちはまだ生きてるんだよ！何かできることがあるはず！",
      "コブ: たった五人で村を復興させるなんて無茶だよ。もうおしまいなんだ。",
      "ヤビ: 希望を捨てるな！ 近傍のギシュテは疫病を克服したそうだ。ギシュテに行けば、我々はまだ生き延びられる。",
      "ナユカ: ギシュテ！あそこなら… だけど、長く険しい旅になるわね。",
      "ヒショル: そうだな… それに、じきに冬が来る。それまでに俺たちは辿り着けるのか？",
      "クビリ: でも、そうするしかないよ！みんな一緒なら、きっとなんとかなる！",
      "コブ: うん… パルミテを去るのは辛いけど、ぐずぐずしてる暇はない。",
      "ヤビ: 荷物をまとめろ。全員で、生きてギシュテまで辿り着くぞ。"
    ];
  }

  return [
    "Nayuka: Another death… That leaves our tribe with only the five of us.",
    "Hishor: It seems so… Is this really the end of Palumite, our home?",
    "Cubiri: But we’re still alive! There has to be something we can do!",
    "Kobu: Keeping Palumite alive with only the five of us is impossible. It’s over.",
    "Yabi: Don’t throw away hope! I heard Gishute, a neighbouring tribe, has overcame the plague. If we reach there, we may still survive.",
    "Nayuka: Gishute! If we can get there… But it will be a long, harsh journey.",
    "Hishor: That's right… and winter is coming, too. Will we make it in time?",
    "Cubiri: Still, we don’t have a choice! If we stick together, I'm sure we can make it!",
    "Kobu: Yeah… It hurts to leave Palumite, but we can’t afford to hesitate.",
    "Yabi: Pack up. We'll all reach Gishute alive."
  ];
}

/**
 * Complete Letter Journey data for all 26 letters (A–Z).
 * Every letter includes:
 *   - upper / lower case forms
 *   - correct English phonics sound (IPA + TTS-friendly phrase — NOT alphabet names)
 *   - 4 vocabulary picture cards (word + emoji)
 *   - listening game distractor letters
 *   - word recognition distractor cards
 *   - build-the-word target
 *   - accepted spoken tokens for mic validation
 *
 * The `tts` phrase is what the browser speaks: the phoneme + example word
 * (e.g., "aaa, apple") so children hear the phonics sound, never the letter name.
 */
export const LETTER_LESSONS = {
  A: { upper: "A", lower: "a", ipa: "/æ/",  tts: "aaa, apple",
       vocab: [
         { word: "Apple",     emoji: "🍎" },
         { word: "Ant",       emoji: "🐜" },
         { word: "Axe",       emoji: "🪓" },
         { word: "Alligator", emoji: "🐊" },
       ],
       target: "APPLE",
       listeningDistractors: ["S", "T"],
       accept: ["apple", "ant", "a", "aa", "ah", "ae", "aaa"] },

  B: { upper: "B", lower: "b", ipa: "/b/",  tts: "buh, ball",
       vocab: [
         { word: "Ball",   emoji: "⚽" },
         { word: "Bear",   emoji: "🐻" },
         { word: "Bat",    emoji: "🦇" },
         { word: "Banana", emoji: "🍌" },
       ],
       target: "BALL",
       listeningDistractors: ["M", "D"],
       accept: ["ball", "bear", "b", "buh"] },

  C: { upper: "C", lower: "c", ipa: "/k/",  tts: "kuh, cat",
       vocab: [
         { word: "Cat",  emoji: "🐱" },
         { word: "Car",  emoji: "🚗" },
         { word: "Cake", emoji: "🎂" },
         { word: "Cup",  emoji: "☕" },
       ],
       target: "CAT",
       listeningDistractors: ["G", "P"],
       accept: ["cat", "car", "c", "k", "kuh"] },

  D: { upper: "D", lower: "d", ipa: "/d/",  tts: "duh, dog",
       vocab: [
         { word: "Dog",   emoji: "🐶" },
         { word: "Duck",  emoji: "🦆" },
         { word: "Drum",  emoji: "🥁" },
         { word: "Donut", emoji: "🍩" },
       ],
       target: "DOG",
       listeningDistractors: ["B", "P"],
       accept: ["dog", "duck", "d", "duh"] },

  E: { upper: "E", lower: "e", ipa: "/e/",  tts: "eh, elephant",
       vocab: [
         { word: "Elephant", emoji: "🐘" },
         { word: "Egg",      emoji: "🥚" },
         { word: "Eagle",    emoji: "🦅" },
         { word: "Engine",   emoji: "🚂" },
       ],
       target: "EGG",
       listeningDistractors: ["A", "I"],
       accept: ["elephant", "egg", "eagle", "e", "eh"] },

  F: { upper: "F", lower: "f", ipa: "/f/",  tts: "fff, fish",
       vocab: [
         { word: "Fish",   emoji: "🐟" },
         { word: "Fox",    emoji: "🦊" },
         { word: "Frog",   emoji: "🐸" },
         { word: "Flower", emoji: "🌸" },
       ],
       target: "FISH",
       listeningDistractors: ["V", "S"],
       accept: ["fish", "fox", "f", "ff", "fff"] },

  G: { upper: "G", lower: "g", ipa: "/g/",  tts: "guh, goat",
       vocab: [
         { word: "Goat",   emoji: "🐐" },
         { word: "Grapes", emoji: "🍇" },
         { word: "Guitar", emoji: "🎸" },
         { word: "Gift",   emoji: "🎁" },
       ],
       target: "GOAT",
       listeningDistractors: ["K", "D"],
       accept: ["goat", "grapes", "g", "guh"] },

  H: { upper: "H", lower: "h", ipa: "/h/",  tts: "huh, hat",
       vocab: [
         { word: "Hat",   emoji: "👒" },
         { word: "Horse", emoji: "🐴" },
         { word: "House", emoji: "🏠" },
         { word: "Hen",   emoji: "🐔" },
       ],
       target: "HAT",
       listeningDistractors: ["N", "R"],
       accept: ["hat", "horse", "h", "huh"] },

  I: { upper: "I", lower: "i", ipa: "/ɪ/",  tts: "ih, igloo",
       vocab: [
         { word: "Igloo",  emoji: "🧊" },
         { word: "Insect", emoji: "🐛" },
         { word: "Ink",    emoji: "🖋️" },
         { word: "Iguana", emoji: "🦎" },
       ],
       target: "INK",
       listeningDistractors: ["E", "A"],
       accept: ["igloo", "insect", "ink", "i", "ih"] },

  J: { upper: "J", lower: "j", ipa: "/dʒ/", tts: "juh, jam",
       vocab: [
         { word: "Jam",   emoji: "🍯" },
         { word: "Juice", emoji: "🧃" },
         { word: "Jet",   emoji: "🛩️" },
         { word: "Jelly", emoji: "🪼" },
       ],
       target: "JAM",
       listeningDistractors: ["G", "Y"],
       accept: ["jam", "juice", "j", "juh"] },

  K: { upper: "K", lower: "k", ipa: "/k/",  tts: "kuh, kite",
       vocab: [
         { word: "Kite",      emoji: "🪁" },
         { word: "Key",       emoji: "🔑" },
         { word: "King",      emoji: "🤴" },
         { word: "Kangaroo",  emoji: "🦘" },
       ],
       target: "KITE",
       listeningDistractors: ["C", "T"],
       accept: ["kite", "key", "k", "kuh"] },

  L: { upper: "L", lower: "l", ipa: "/l/",  tts: "lll, lion",
       vocab: [
         { word: "Lion",  emoji: "🦁" },
         { word: "Leaf",  emoji: "🍃" },
         { word: "Lamp",  emoji: "💡" },
         { word: "Lemon", emoji: "🍋" },
       ],
       target: "LION",
       listeningDistractors: ["R", "N"],
       accept: ["lion", "leaf", "l", "ll", "lll"] },

  M: { upper: "M", lower: "m", ipa: "/m/",  tts: "mmm, monkey",
       vocab: [
         { word: "Monkey", emoji: "🐵" },
         { word: "Moon",   emoji: "🌙" },
         { word: "Milk",   emoji: "🥛" },
         { word: "Mango",  emoji: "🥭" },
       ],
       target: "MOON",
       listeningDistractors: ["N", "B"],
       accept: ["monkey", "moon", "m", "mmm"] },

  N: { upper: "N", lower: "n", ipa: "/n/",  tts: "nnn, nest",
       vocab: [
         { word: "Nest", emoji: "🪺" },
         { word: "Nut",  emoji: "🥜" },
         { word: "Nose", emoji: "👃" },
         { word: "Net",  emoji: "🥅" },
       ],
       target: "NEST",
       listeningDistractors: ["M", "L"],
       accept: ["nest", "nut", "n", "nnn"] },

  O: { upper: "O", lower: "o", ipa: "/ɒ/",  tts: "ah, orange",
       vocab: [
         { word: "Orange",  emoji: "🍊" },
         { word: "Owl",     emoji: "🦉" },
         { word: "Ox",      emoji: "🐂" },
         { word: "Octopus", emoji: "🐙" },
       ],
       target: "OWL",
       listeningDistractors: ["U", "A"],
       accept: ["orange", "owl", "o", "ah", "ahh"] },

  P: { upper: "P", lower: "p", ipa: "/p/",  tts: "puh, pig",
       vocab: [
         { word: "Pig",   emoji: "🐷" },
         { word: "Pen",   emoji: "🖊️" },
         { word: "Panda", emoji: "🐼" },
         { word: "Pizza", emoji: "🍕" },
       ],
       target: "PIG",
       listeningDistractors: ["B", "D"],
       accept: ["pig", "pen", "p", "puh"] },

  Q: { upper: "Q", lower: "q", ipa: "/kw/", tts: "kwuh, queen",
       vocab: [
         { word: "Queen",    emoji: "👸" },
         { word: "Quilt",    emoji: "🛏️" },
         { word: "Question", emoji: "❓" },
         { word: "Quail",    emoji: "🐦" },
       ],
       target: "QUEEN",
       listeningDistractors: ["K", "X"],
       accept: ["queen", "quilt", "q", "kwuh", "kw"] },

  R: { upper: "R", lower: "r", ipa: "/r/",  tts: "rrr, rabbit",
       vocab: [
         { word: "Rabbit", emoji: "🐰" },
         { word: "Robot",  emoji: "🤖" },
         { word: "Rose",   emoji: "🌹" },
         { word: "Ring",   emoji: "💍" },
       ],
       target: "ROBOT",
       listeningDistractors: ["L", "W"],
       accept: ["rabbit", "robot", "r", "rr", "rrr"] },

  S: { upper: "S", lower: "s", ipa: "/s/",  tts: "sss, sun",
       vocab: [
         { word: "Sun",   emoji: "☀️" },
         { word: "Snake", emoji: "🐍" },
         { word: "Star",  emoji: "⭐" },
         { word: "Ship",  emoji: "🚢" },
       ],
       target: "SUN",
       listeningDistractors: ["F", "Z"],
       accept: ["sun", "snake", "s", "ss", "sss"] },

  T: { upper: "T", lower: "t", ipa: "/t/",  tts: "tuh, tap",
       vocab: [
         { word: "Tiger",  emoji: "🐯" },
         { word: "Tree",   emoji: "🌳" },
         { word: "Turtle", emoji: "🐢" },
         { word: "Tomato", emoji: "🍅" },
       ],
       target: "TREE",
       listeningDistractors: ["D", "P"],
       accept: ["tiger", "tree", "tap", "t", "tuh"] },

  U: { upper: "U", lower: "u", ipa: "/ʌ/",  tts: "uh, umbrella",
       vocab: [
         { word: "Umbrella", emoji: "☂️" },
         { word: "Unicorn",  emoji: "🦄" },
         { word: "Uniform",  emoji: "👕" },
         { word: "Up",       emoji: "⬆️" },
       ],
       target: "UMBRELLA",
       listeningDistractors: ["O", "I"],
       accept: ["umbrella", "unicorn", "u", "uh"] },

  V: { upper: "V", lower: "v", ipa: "/v/",  tts: "vvv, van",
       vocab: [
         { word: "Van",     emoji: "🚐" },
         { word: "Violin",  emoji: "🎻" },
         { word: "Volcano", emoji: "🌋" },
         { word: "Vase",    emoji: "🏺" },
       ],
       target: "VAN",
       listeningDistractors: ["F", "W"],
       accept: ["van", "violin", "v", "vv", "vvv"] },

  W: { upper: "W", lower: "w", ipa: "/w/",  tts: "wuh, water",
       vocab: [
         { word: "Water",  emoji: "💧" },
         { word: "Whale",  emoji: "🐳" },
         { word: "Watch",  emoji: "⌚" },
         { word: "Melon",  emoji: "🍉" },
       ],
       target: "WATER",
       listeningDistractors: ["V", "Y"],
       accept: ["water", "whale", "w", "wuh"] },

  X: { upper: "X", lower: "x", ipa: "/ks/", tts: "ks, box",
       vocab: [
         { word: "Box",       emoji: "📦" },
         { word: "Xylophone", emoji: "🎼" },
         { word: "Fox",       emoji: "🦊" },
         { word: "Ox",        emoji: "🐂" },
       ],
       target: "BOX",
       listeningDistractors: ["S", "Z"],
       accept: ["box", "fox", "x", "ks"] },

  Y: { upper: "Y", lower: "y", ipa: "/j/",  tts: "yuh, yellow",
       vocab: [
         { word: "Yellow", emoji: "🟡" },
         { word: "Yo-yo",  emoji: "🪀" },
         { word: "Yak",    emoji: "🐃" },
         { word: "Yolk",   emoji: "🍳" },
       ],
       target: "YAK",
       listeningDistractors: ["J", "W"],
       accept: ["yellow", "yak", "y", "yuh"] },

  Z: { upper: "Z", lower: "z", ipa: "/z/",  tts: "zzz, zebra",
       vocab: [
         { word: "Zebra",  emoji: "🦓" },
         { word: "Zoo",    emoji: "🐘" },
         { word: "Zero",   emoji: "0️⃣" },
         { word: "Zipper", emoji: "🤐" },
       ],
       target: "ZEBRA",
       listeningDistractors: ["S", "X"],
       accept: ["zebra", "zoo", "z", "zz", "zzz"] },
};

export const LETTER_ORDER = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

/** Build listening trio: [correct, distractor1, distractor2] shuffled. */
export function buildListeningOptions(letter) {
  const spec = LETTER_LESSONS[letter];
  const trio = [letter, ...spec.listeningDistractors];
  return trio.sort(() => Math.random() - 0.5);
}

/** Build word-recognition options: 1 correct + 2 distractor words from other letters. */
export function buildWordRecOptions(letter) {
  const spec = LETTER_LESSONS[letter];
  const correct = spec.vocab[0];
  const pool = [];
  for (const L of LETTER_ORDER) {
    if (L === letter) continue;
    pool.push(LETTER_LESSONS[L].vocab[0]);
  }
  const distractors = pool.sort(() => Math.random() - 0.5).slice(0, 2);
  return [correct, ...distractors].sort(() => Math.random() - 0.5);
}

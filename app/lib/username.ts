const adjectives = [
  "Brave",
  "Swift",
  "Mighty",
  "Clever",
  "Fierce",
  "Gentle",
  "Wild",
  "Wise",
  "Bright",
  "Bold",
  "Calm",
  "Dark",
  "Epic",
  "Fair",
  "Grand",
  "Kind",
  "Noble",
  "Quick",
  "Royal",
  "Sharp",
  "Sleek",
  "Smart",
  "Solid",
  "Warm",
];

const nouns = [
  "Wolf",
  "Eagle",
  "Tiger",
  "Dragon",
  "Phoenix",
  "Bear",
  "Lion",
  "Hawk",
  "Falcon",
  "Deer",
  "Fox",
  "Owl",
  "Panda",
  "Shark",
  "Snake",
  "Star",
  "Moon",
  "Sun",
  "Storm",
  "Cloud",
  "River",
  "Ocean",
  "Mountain",
  "Forest",
];

export function generateUsername(): string {
  const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  return `${adjective}-${noun}`;
}

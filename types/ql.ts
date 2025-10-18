export type Action = (typeof actions)[number];

export type State =
  `${(typeof topics)[number]}-${(typeof difficulties)[number]}`;

const actions = [
  "increase_difficulty",
  "decrease_difficulty",
  "stay_same",
  "change_topic",
];
const topics = [
  "addition",
  "subtraction",
  // "multiplication",
  // "division",
  // "fractions",
  // "number recognition",
  // "decimals",
] as const;

const difficulties = ["easy", "medium", "hard"] as const;

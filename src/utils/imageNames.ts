const ADJECTIVES = [
  'amber', 'bold', 'bright', 'calm', 'crisp', 'deep', 'dusk', 'eager',
  'fair', 'firm', 'free', 'gilt', 'glad', 'grand', 'gray', 'jade',
  'keen', 'kind', 'late', 'lean', 'lone', 'mild', 'mint', 'mist',
  'neat', 'pale', 'pine', 'pure', 'quiet', 'red', 'rich', 'rosy',
  'safe', 'sage', 'sharp', 'slim', 'soft', 'stark', 'still', 'swift',
  'tall', 'tame', 'teal', 'true', 'vivid', 'warm', 'wide', 'wild',
  'young', 'zeal',
];

const NOUNS = [
  'arch', 'bay', 'brook', 'canal', 'cape', 'castle', 'cave', 'cliff',
  'cloud', 'cove', 'creek', 'dale', 'delta', 'dune', 'fern', 'field',
  'fjord', 'ford', 'glen', 'grove', 'gulf', 'hill', 'island', 'lake',
  'leaf', 'marsh', 'mesa', 'moor', 'moss', 'mountain', 'peak', 'pine',
  'plain', 'pond', 'reef', 'ridge', 'river', 'rock', 'shore', 'slope',
  'spring', 'stone', 'stream', 'tide', 'vale', 'valley', 'wave', 'wood',
  'ford', 'crest',
];

const CHARS = 'abcdefghijklmnopqrstuvwxyz0123456789';

export function generateImageName(): string {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  const suffix = Array.from({ length: 3 }, () =>
    CHARS[Math.floor(Math.random() * CHARS.length)]
  ).join('');
  return `${adj}-${noun}-${suffix}`;
}

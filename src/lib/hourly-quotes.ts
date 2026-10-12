/**
 * Curated, verified collection of quotations and hourly inspirational messages.
 * Deterministic selection based on local date and hour ensures zero flickering,
 * offline availability, and cross-device stability within the hour.
 */

export interface HourlyQuote {
  quote: string;
  author: string;
  context?: string;
}

export const VERIFIED_QUOTES: HourlyQuote[] = [
  {
    quote: "Live as if you were to die tomorrow. Learn as if you were to live forever.",
    author: "Mahatma Gandhi",
  },
  {
    quote: "Simplicity is prerequisite for reliability.",
    author: "Edsger W. Dijkstra",
  },
  {
    quote: "The mind is not a vessel to be filled, but a fire to be kindled.",
    author: "Plutarch",
  },
  {
    quote: "In the middle of difficulty lies opportunity.",
    author: "Albert Einstein",
  },
  {
    quote: "We are what we repeatedly do. Excellence, then, is not an act, but a habit.",
    author: "Will Durant (interpreting Aristotle)",
  },
  {
    quote: "It always seems impossible until it's done.",
    author: "Nelson Mandela",
  },
  {
    quote: "Knowing is not enough; we must apply. Willing is not enough; we must do.",
    author: "Johann Wolfgang von Goethe",
  },
  {
    quote: "An investment in knowledge pays the best interest.",
    author: "Benjamin Franklin",
  },
  {
    quote: "Concentrate all your thoughts upon the work in hand. The sun's rays do not burn until brought to a focus.",
    author: "Alexander Graham Bell",
  },
  {
    quote: "You don't have to be great to start, but you have to start to be great.",
    author: "Zig Ziglar",
  },
  {
    quote: "Patience and perseverance have a magical effect before which difficulties disappear and obstacles vanish.",
    author: "John Quincy Adams",
  },
  {
    quote: "The secret of getting ahead is getting started.",
    author: "Mark Twain",
  },
  {
    quote: "Continuous effort—not strength or intelligence—is the key to unlocking our potential.",
    author: "Winston Churchill",
  },
  {
    quote: "Small deeds done are better than great deeds planned.",
    author: "Peter Marshall",
  },
  {
    quote: "The only limit to our realization of tomorrow will be our doubts of today.",
    author: "Franklin D. Roosevelt",
  },
  {
    quote: "Action is the foundational key to all success.",
    author: "Pablo Picasso",
  },
  {
    quote: "Focus on being productive instead of busy.",
    author: "Tim Ferriss",
  },
  {
    quote: "Discipline is the bridge between goals and accomplishment.",
    author: "Jim Rohn",
  },
  {
    quote: "The roots of education are bitter, but the fruit is sweet.",
    author: "Aristotle",
  },
  {
    quote: "Do what you can, with what you have, where you are.",
    author: "Theodore Roosevelt",
  },
  {
    quote: "Quiet persistence creates the deepest breakthroughs.",
    author: "AMAHAS Philosophy",
  },
  {
    quote: "Clarity comes from engagement, not thought alone.",
    author: "Marie Forleo",
  },
  {
    quote: "Mastery is not a destination; it is a continuous relationship with your craft.",
    author: "George Leonard",
  },
  {
    quote: "To learn is to liberate oneself from the illusion of final knowledge.",
    author: "AMAHAS Philosophy",
  },
];

export const HOURLY_MESSAGES: string[] = [
  "A quiet hour of deep work yields more than days of scattered attention.",
  "Every complex theorem yields to patient, deliberate inquiry.",
  "Consistency in small revisions forms the bedrock of examination mastery.",
  "Guard your focus gently. What you ignore shapes what you accomplish.",
  "Build understanding brick by brick; speed is a consequence of clarity.",
  "Pause, breathe, and tackle the single most essential problem right now.",
  "True engineering begins when you transform theory into working principles.",
  "Your potential expands each time you lean into challenging concepts.",
  "Honor the process of revision; it is memory's natural architecture.",
  "Curiosity is an infinite fuel. Follow the root causes of difficulties.",
  "Order in your mind creates calm in your execution.",
  "Protect your attention from noise; meaningful learning takes stillness.",
  "One focused block of practice outperforms hours of passive reading.",
  "Celebrate subtle progress; every mastered derivation counts.",
  "When fatigue whispers, switch to active recall or brief rest.",
  "Knowledge compounds quietly, just like any profound investment.",
  "Every error logged is a future trap successfully defused.",
  "Depth over volume. True insight requires patient unhurried thought.",
  "Align your immediate task with your long-term research aspirations.",
  "Make this hour count with honest, uninterrupted craftsmanship.",
  "Reflect calmly on what you've learned before moving forward.",
  "Embrace difficult practice problems; they reveal where true growth begins.",
  "Let your curiosity guide your notes, not just upcoming exams.",
  "Rest when needed, revise with purpose, build with confidence.",
];

/**
 * Get deterministic quote and message based on the given Date.
 * Guarantees stability within the hour across page refreshes.
 */
export function getHourlyContent(date: Date = new Date()) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();
  const hour = date.getHours();

  // Deterministic seed formula using calendar date and local hour
  const seed = (year * 372 + month * 31 + day) * 24 + hour;

  const quoteIndex = Math.abs(seed) % VERIFIED_QUOTES.length;
  const messageIndex = Math.abs(seed * 7 + 13) % HOURLY_MESSAGES.length;

  return {
    quote: VERIFIED_QUOTES[quoteIndex],
    message: HOURLY_MESSAGES[messageIndex],
    hour,
    dateString: date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    }),
  };
}

/**
 * Greeting based on current local hour.
 */
export function getTimeOfDayGreeting(date: Date = new Date(), name?: string): string {
  const hour = date.getHours();
  const suffix = name ? `, ${name}` : "";

  if (hour >= 5 && hour < 12) {
    return `Good morning${suffix}. Make today count.`;
  } else if (hour >= 12 && hour < 17) {
    return `Good afternoon${suffix}. Maintain your momentum.`;
  } else if (hour >= 17 && hour < 22) {
    return `Good evening${suffix}. Consolidate your progress.`;
  } else {
    return `Welcome back${suffix}. Quiet hours for deep thought.`;
  }
}

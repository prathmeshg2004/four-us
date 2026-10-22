// ============================================================
// Know Me — 10 Curated Relationship Prompts (4 options each)
// ============================================================

export interface KnowMePrompt {
  id: string;
  promptText: string;
  options: [string, string, string, string];
}

export const KNOW_ME_PROMPTS: KnowMePrompt[] = [
  {
    id: 'km-001',
    promptText: 'If you could only eat one cuisine for an entire month, which would you pick?',
    options: [
      'Italian (pizza, pasta, gelato)',
      'Mexican (tacos, guacamole, burritos)',
      'Japanese (sushi, ramen, teriyaki)',
      'Indian (curry, naan, samosas)',
    ],
  },
  {
    id: 'km-002',
    promptText: 'What is your ideal way to spend a lazy Sunday morning?',
    options: [
      'Sleeping in and having breakfast in bed',
      'Waking up early for a peaceful walk or run',
      'Brewing fresh coffee and reading on the couch',
      'Cooking an elaborate hot brunch together',
    ],
  },
  {
    id: 'km-003',
    promptText: 'If you won an all-expenses-paid trip tomorrow, where are we heading first?',
    options: [
      'A tropical private beach bungalow in Bora Bora',
      'A cozy mountain cabin in the Swiss Alps',
      'A vibrant cultural exploration in Tokyo or Seoul',
      'A historic European road trip across Italy & France',
    ],
  },
  {
    id: 'km-004',
    promptText: 'If you could have one superpower in daily life, which would you choose?',
    options: [
      'Teleporting anywhere in the world instantly',
      'Reading minds whenever you want',
      'Turning invisible at will',
      'Freezing time to take a breather',
    ],
  },
  {
    id: 'km-005',
    promptText: "What is your go-to way to unwind after a stressful, exhausting day?",
    options: [
      'Binge-watching a comfort series or movie',
      'Listening to favorite music or a chill podcast',
      'Taking a long relaxing hot shower or bath',
      'Going for a walk or working out',
    ],
  },
  {
    id: 'km-006',
    promptText: 'If you could master any skill overnight with zero effort, which would it be?',
    options: [
      'Speaking every language fluently',
      'Playing any musical instrument like a maestro',
      'Cooking five-star restaurant gourmet meals',
      'Becoming an elite world-class coder / hacker',
    ],
  },
  {
    id: 'km-007',
    promptText: 'What genre of movie are you always in the mood to watch on movie night?',
    options: [
      'Feel-good comedy or romantic comedy',
      'Mind-bending sci-fi or mystery thriller',
      'High-adrenaline action or adventure',
      'Animated classic or studio masterpiece',
    ],
  },
  {
    id: 'km-008',
    promptText: 'Which season brings you the most genuine joy throughout the year?',
    options: [
      'Spring (blooming flowers, fresh breeze)',
      'Summer (warm sunshine, pool & beach days)',
      'Autumn (crisp air, sweaters, changing leaves)',
      'Winter (holiday cheer, cozy blankets, cocoa)',
    ],
  },
  {
    id: 'km-009',
    promptText: 'If you had an unexpected free afternoon with zero responsibilities, what do you do?',
    options: [
      'Take a long, uninterrupted nap',
      'Dive deep into video games or personal hobbies',
      'Go on a spontaneous cafe or shopping spree',
      'Call a loved one and catch up for hours',
    ],
  },
  {
    id: 'km-010',
    promptText: 'When traveling, which travel style describes you best?',
    options: [
      'The Planner: Every hour scheduled and booked ahead',
      'The Wanderer: Go with the flow, discover spots randomly',
      'The Foodie: Travel itinerary completely revolving around meals',
      'The Resorter: Maximum luxury, lounging, and pure relaxation',
    ],
  },
];

export function getKnowMeForDay(dayNumber: number): KnowMePrompt {
  const index = Math.max(0, Math.min(KNOW_ME_PROMPTS.length - 1, (dayNumber - 1) % KNOW_ME_PROMPTS.length));
  return KNOW_ME_PROMPTS[index];
}

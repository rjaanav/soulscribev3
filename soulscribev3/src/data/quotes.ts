interface Quote {
  text: string;
  author: string;
  category: 'wellness' | 'mental-health' | 'mindfulness' | 'growth' | 'self-care' | 'healing' | 'resilience';
}

export const quotes: Quote[] = [
  {
    text: "Your mind is a garden, your thoughts are the seeds. You can grow flowers or you can grow weeds.",
    author: "Anonymous",
    category: "mindfulness"
  },
  {
    text: "Self-care is not self-indulgence, it is self-preservation.",
    author: "Audre Lorde",
    category: "wellness"
  },
  {
    text: "You don't have to control your thoughts; you just have to stop letting them control you.",
    author: "Dan Millman",
    category: "mindfulness"
  },
  {
    text: "Your present circumstances don't determine where you go; they merely determine where you start.",
    author: "Nido Qubein",
    category: "growth"
  },
  {
    text: "Feelings come and go like clouds in a windy sky. Conscious breathing is my anchor.",
    author: "Thich Nhat Hanh",
    category: "mindfulness"
  },
  {
    text: "Your mental health is a priority. Your happiness is essential. Your self-care is a necessity.",
    author: "Unknown",
    category: "mental-health"
  },
  {
    text: "You are not your illness. You have an individual story to tell. You have a name, a history, a personality.",
    author: "Julian Seifter",
    category: "mental-health"
  },
  {
    text: "Self-compassion is simply giving the same kindness to ourselves that we would give to others.",
    author: "Christopher Germer",
    category: "self-care"
  },
  {
    text: "Almost everything will work again if you unplug it for a few minutes, including you.",
    author: "Anne Lamott",
    category: "wellness"
  },
  {
    text: "There is no standard normal. Normal is subjective. There are seven billion versions of normal on this planet.",
    author: "Matt Haig",
    category: "mental-health"
  }
];
   
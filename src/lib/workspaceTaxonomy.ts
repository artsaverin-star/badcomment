export type WorkspaceDomain = {
  slug: string;
  nameRu: string;
  nameEn: string;
  categories: string[];
};

// Product taxonomy for the private workspace. Every published review category
// belongs to exactly one domain; the contract test guards against omissions and
// duplicates when the catalogue grows.
export const WORKSPACE_DOMAINS: WorkspaceDomain[] = [
  {
    slug: "health-wellness",
    nameRu: "Здоровье и самочувствие",
    nameEn: "Health & wellness",
    categories: [
      "yoga", "white-noise-sleep-sounds", "weight-tracker", "blood-pressure-log",
      "step-counter", "intermittent-fasting", "run-tracking", "sobriety",
      "water-hydration", "meditation-mindfulness", "journaling-mood", "nutrition-calories",
      "sleep-tracking", "workout-fitness",
    ],
  },
  {
    slug: "family-relationships",
    nameRu: "Семья и отношения",
    nameEn: "Family & relationships",
    categories: ["couples-relationship", "pregnancy-tracker", "baby-tracking", "period-cycle", "pet-care"],
  },
  {
    slug: "work-productivity",
    nameRu: "Работа и продуктивность",
    nameEn: "Work & productivity",
    categories: [
      "resume-builder", "invoice-maker", "mind-mapping", "calendars-tasks",
      "focus-productivity", "habit-tracking", "notes-pkm",
    ],
  },
  {
    slug: "learning-reference",
    nameRu: "Обучение и справочники",
    nameEn: "Learning & reference",
    categories: [
      "ai-species-identifier", "ai-homework-solver", "guitar-tuner-learn",
      "astronomy-stargazing", "driving-test-prep", "flashcards", "translator",
      "language-learning",
    ],
  },
  {
    slug: "creative-tools",
    nameRu: "Фото, видео и контент",
    nameEn: "Photo, video & content",
    categories: [
      "ai-photo-restore", "teleprompter-captions", "wallpapers-widgets",
      "ai-image-generation", "ai-avatars-headshots", "ai-writing", "photo-editing",
    ],
  },
  {
    slug: "money-commerce",
    nameRu: "Деньги и покупки",
    nameEn: "Money & shopping",
    categories: ["stock-investing", "crypto-investing", "personal-finance", "shopping-ecommerce"],
  },
  {
    slug: "home-daily-life",
    nameRu: "Дом и повседневные дела",
    nameEn: "Home & daily life",
    categories: [
      "cosmetics-ingredient-checker", "interior-design", "car-maintenance",
      "wardrobe-outfit", "meal-prep-grocery", "plant-care", "recipes-meal-planning",
      "weather-apps", "travel-planning", "food-delivery",
    ],
  },
  {
    slug: "transport-outdoors",
    nameRu: "Транспорт и активный отдых",
    nameEn: "Transport & outdoors",
    categories: ["cycling", "fishing", "hiking-trails", "ride-hailing"],
  },
  {
    slug: "social-media",
    nameRu: "Общение и развлечения",
    nameEn: "Social & entertainment",
    categories: [
      "faith-prayer-bible", "tarot-reading", "ai-companion-roleplay", "ai-chatbot",
      "dating-apps", "messaging-apps", "music-streaming", "video-streaming",
    ],
  },
  {
    slug: "utilities",
    nameRu: "Инструменты",
    nameEn: "Utilities",
    categories: ["scanner-pdf", "voice-recorder", "qr-scanner", "password-manager"],
  },
];

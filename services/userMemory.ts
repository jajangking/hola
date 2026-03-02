import AsyncStorage from '@react-native-async-storage/async-storage';

export interface UserMemory {
  // Personal facts about the user
  personalFacts: PersonalFact[];
  
  // User preferences (language, tone, topics, etc.)
  preferences: UserPreferences;
  
  // Conversation history summary (not full history, but key points)
  conversationSummary: ConversationSummary;
  
  // Personality traits the bot has learned about the user
  personalityTraits: PersonalityTrait[];
  
  // Important dates/events
  importantDates: ImportantDate[];
  
  // Last updated timestamp
  lastUpdated: number;
}

export interface PersonalFact {
  id: string;
  fact: string;
  category: 'name' | 'location' | 'work' | 'hobby' | 'family' | 'friend' | 'skill' | 'other';
  confidence: number; // 0-1, how confident the AI is about this fact
  source: string; // The original user message that led to this fact
  createdAt: number;
}

export interface UserPreferences {
  language: string; // e.g., 'id', 'en', 'jp'
  tone: 'casual' | 'formal' | 'friendly' | 'professional';
  responseLength: 'short' | 'medium' | 'long';
  favoriteTopics: string[];
  avoidedTopics: string[];
  emojiUsage: 'none' | 'minimal' | 'normal' | 'abundant';
}

export interface ConversationSummary {
  totalConversations: number;
  lastConversationAt: number;
  commonTopics: string[];
  recentInteractions: RecentInteraction[];
}

export interface RecentInteraction {
  id: string;
  date: number;
  topic: string;
  sentiment: 'positive' | 'neutral' | 'negative';
  summary: string;
}

export interface PersonalityTrait {
  id: string;
  trait: string;
  evidence: string;
  confidence: number;
  createdAt: number;
}

export interface ImportantDate {
  id: string;
  type: 'birthday' | 'anniversary' | 'event' | 'reminder';
  date: string; // ISO date or description like "every Monday"
  description: string;
  createdAt: number;
}

const STORAGE_KEY = '@mochibot_user_memory';

const DEFAULT_MEMORY: UserMemory = {
  personalFacts: [],
  preferences: {
    language: 'id',
    tone: 'friendly',
    responseLength: 'medium',
    favoriteTopics: [],
    avoidedTopics: [],
    emojiUsage: 'normal',
  },
  conversationSummary: {
    totalConversations: 0,
    lastConversationAt: 0,
    commonTopics: [],
    recentInteractions: [],
  },
  personalityTraits: [],
  importantDates: [],
  lastUpdated: Date.now(),
};

/**
 * Load user memory from storage
 */
export async function loadUserMemory(): Promise<UserMemory> {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as UserMemory;
      return { ...DEFAULT_MEMORY, ...parsed };
    }
  } catch (error) {
    console.error('[UserMemory] Error loading memory:', error);
  }
  return DEFAULT_MEMORY;
}

/**
 * Save user memory to storage
 */
export async function saveUserMemory(memory: Partial<UserMemory>): Promise<UserMemory> {
  try {
    const current = await loadUserMemory();
    const updated: UserMemory = {
      ...current,
      ...memory,
      lastUpdated: Date.now(),
    };
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch (error) {
    console.error('[UserMemory] Error saving memory:', error);
    return DEFAULT_MEMORY;
  }
}

/**
 * Add a personal fact about the user
 */
export async function addPersonalFact(
  fact: string,
  category: PersonalFact['category'],
  source: string,
  confidence: number = 0.8
): Promise<UserMemory> {
  const memory = await loadUserMemory();
  
  // Check for duplicates (case-insensitive)
  const exists = memory.personalFacts.some(
    f => f.fact.toLowerCase() === fact.toLowerCase() && f.category === category
  );
  
  if (exists) {
    console.log('[UserMemory] Fact already exists, skipping:', fact);
    return memory;
  }
  
  const newFact: PersonalFact = {
    id: `fact_${Date.now()}`,
    fact,
    category,
    confidence,
    source,
    createdAt: Date.now(),
  };
  
  memory.personalFacts.push(newFact);
  console.log('[UserMemory] Adding fact:', newFact);
  
  const result = await saveUserMemory({ personalFacts: memory.personalFacts });
  console.log('[UserMemory] Memory saved, total facts:', result.personalFacts.length);
  return result;
}

/**
 * Remove a personal fact
 */
export async function removePersonalFact(factId: string): Promise<UserMemory> {
  const memory = await loadUserMemory();
  memory.personalFacts = memory.personalFacts.filter(f => f.id !== factId);
  return saveUserMemory({ personalFacts: memory.personalFacts });
}

/**
 * Update user preferences
 */
export async function updatePreferences(
  prefs: Partial<UserPreferences>
): Promise<UserMemory> {
  const memory = await loadUserMemory();
  memory.preferences = { ...memory.preferences, ...prefs };
  return saveUserMemory({ preferences: memory.preferences });
}

/**
 * Add a conversation summary entry
 */
export async function addConversationSummary(
  topic: string,
  sentiment: RecentInteraction['sentiment'],
  summary: string
): Promise<UserMemory> {
  const memory = await loadUserMemory();
  
  const newInteraction: RecentInteraction = {
    id: `conv_${Date.now()}`,
    date: Date.now(),
    topic,
    sentiment,
    summary,
  };
  
  // Keep only last 10 interactions
  const recentInteractions = [newInteraction, ...memory.conversationSummary.recentInteractions].slice(0, 10);
  
  // Update common topics
  const topicExists = memory.conversationSummary.commonTopics.some(
    t => t.toLowerCase() === topic.toLowerCase()
  );
  const commonTopics = topicExists
    ? memory.conversationSummary.commonTopics
    : [...memory.conversationSummary.commonTopics, topic].slice(0, 20);
  
  return saveUserMemory({
    conversationSummary: {
      totalConversations: memory.conversationSummary.totalConversations + 1,
      lastConversationAt: Date.now(),
      commonTopics,
      recentInteractions,
    },
  });
}

/**
 * Add a personality trait observation
 */
export async function addPersonalityTrait(
  trait: string,
  evidence: string,
  confidence: number = 0.7
): Promise<UserMemory> {
  const memory = await loadUserMemory();
  
  const newTrait: PersonalityTrait = {
    id: `trait_${Date.now()}`,
    trait,
    evidence,
    confidence,
    createdAt: Date.now(),
  };
  
  // Avoid duplicates
  const exists = memory.personalityTraits.some(
    t => t.trait.toLowerCase() === trait.toLowerCase()
  );
  
  if (!exists) {
    memory.personalityTraits.push(newTrait);
    return saveUserMemory({ personalityTraits: memory.personalityTraits });
  }
  
  return memory;
}

/**
 * Add an important date
 */
export async function addImportantDate(
  type: ImportantDate['type'],
  date: string,
  description: string
): Promise<UserMemory> {
  const memory = await loadUserMemory();
  
  const newDate: ImportantDate = {
    id: `date_${Date.now()}`,
    type,
    date,
    description,
    createdAt: Date.now(),
  };
  
  memory.importantDates.push(newDate);
  return saveUserMemory({ importantDates: memory.importantDates });
}

/**
 * Clear all user memory (privacy)
 */
export async function clearUserMemory(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('[UserMemory] Error clearing memory:', error);
    throw error;
  }
}

/**
 * Export user memory as JSON (for backup/privacy)
 */
export async function exportUserMemory(): Promise<string> {
  const memory = await loadUserMemory();
  return JSON.stringify(memory, null, 2);
}

/**
 * Get memory context for AI prompt
 * Returns a formatted string to include in system prompt
 */
export async function getMemoryContext(): Promise<string> {
  const memory = await loadUserMemory();
  
  const parts: string[] = [];
  
  // Personal facts
  if (memory.personalFacts.length > 0) {
    const facts = memory.personalFacts.map(f => `- ${f.fact}`).join('\n');
    parts.push(`**About the User**:\n${facts}`);
  }
  
  // Preferences
  const prefs = memory.preferences;
  parts.push(`**Preferences**:\n- Language: ${prefs.language}\n- Tone: ${prefs.tone}\n- Response Length: ${prefs.responseLength}\n- Emoji Usage: ${prefs.emojiUsage}`);
  
  if (prefs.favoriteTopics.length > 0) {
    parts.push(`- Favorite Topics: ${prefs.favoriteTopics.join(', ')}`);
  }
  
  if (prefs.avoidedTopics.length > 0) {
    parts.push(`- Avoid Topics: ${prefs.avoidedTopics.join(', ')}`);
  }
  
  // Personality traits
  if (memory.personalityTraits.length > 0) {
    const traits = memory.personalityTraits.map(t => `- ${t.trait}`).join('\n');
    parts.push(`**Personality Traits**:\n${traits}`);
  }
  
  // Important dates
  if (memory.importantDates.length > 0) {
    const dates = memory.importantDates.map(d => `- ${d.type}: ${d.date} (${d.description})`).join('\n');
    parts.push(`**Important Dates**:\n${dates}`);
  }
  
  // Conversation summary
  if (memory.conversationSummary.commonTopics.length > 0) {
    parts.push(`**Common Topics**:\n${memory.conversationSummary.commonTopics.slice(0, 5).join(', ')}`);
  }
  
  return parts.length > 0 ? parts.join('\n\n') : '';
}

/**
 * Analyze user message and extract potential memory updates
 * This is the "learning" function
 */
export async function analyzeAndLearn(
  userMessage: string,
  botResponse: string
): Promise<void> {
  const lowerMsg = userMessage.toLowerCase();
  let learned = false;

  console.log('[UserMemory] === Analyzing message ===');
  console.log('[UserMemory] Message:', userMessage);
  console.log('[UserMemory] Lower:', lowerMsg);

  // Extract name (Indonesian & English patterns) - MORE AGGRESSIVE
  const namePatterns = [
    // Indonesian - most common patterns
    { pattern: /nama (saya|aku|gue|gw|ku|gua) (adalah|saya|aku|gue|gw)?\s*(\w+)/i, group: 3 },
    { pattern: /nama (saya|aku|gue|gw|ku|gua)\s*(\w+)/i, group: 2 },
    { pattern: /(saya|aku|gue|gw|gua) dipanggil? (?:dengan)?\s*(\w+)/i, group: 2 },
    { pattern: /(saya|aku|gue|gw|gua) namanya? (\w+)/i, group: 2 },
    { pattern: /panggil (saya|aku|gue|gw|gua) (\w+)/i, group: 2 },
    { pattern: /aku (\w+)/i, group: 1 }, // Simple: "aku Budi"
    // English
    { pattern: /call me\s+(\w+)/i, group: 1 },
    { pattern: /i'm\s+(\w+)/i, group: 1 },
    { pattern: /my name is\s+(\w+)/i, group: 1 },
    { pattern: /i am\s+(\w+)/i, group: 1 },
  ];

  for (const { pattern, group } of namePatterns) {
    const match = userMessage.match(pattern);
    if (match) {
      const name = match[group];
      console.log('[UserMemory] ✓ Pattern matched:', pattern.toString());
      console.log('[UserMemory] ✓ Found name:', name);
      if (name && name.length > 1 && name.length < 20 && !name.match(/^(saya|aku|gue|gw|nama|adalah|dipanggil|panggil|i'm|call|me|my|is|am)$/i)) {
        await addPersonalFact(name, 'name', userMessage, 0.95);
        learned = true;
        console.log('[UserMemory] ✓✓✓ SAVED NAME:', name);
        break;
      }
    }
  }
  
  if (!learned) {
    console.log('[UserMemory] No name pattern matched');
  }
  
  // Extract location (Indonesian & English)
  const locationPatterns = [
    // Indonesian
    /saya|aku|gue|gw|gua (tinggal|berasal|datang|dari)\s+(?:di|dari)?\s*([\w\s]+?)(?:\s*(di|sana|situ)|[.!?,]|$)/i,
    /rumah (saya|aku|gue|gw|gua) (di|ada di|berada di)\s*([\w\s]+?)(?:[.!?,]|$)/i,
    /kota (saya|aku|gue|gw|gua) (adalah|yaitu|di)\s*([\w\s]+?)(?:[.!?,]|$)/i,
    // English
    /i (live|reside|stay)\s+(?:in|at)\s+([\w\s]+?)(?:[.!?,]|$)/i,
    /i am from\s+([\w\s]+?)(?:[.!?,]|$)/i,
    /my (hometown|city) is\s+([\w\s]+?)(?:[.!?,]|$)/i,
  ];
  
  for (const pattern of locationPatterns) {
    const match = userMessage.match(pattern);
    if (match && match[2]) {
      const location = match[2].trim();
      if (location.length > 2 && location.length < 50) {
        await addPersonalFact(location, 'location', userMessage, 0.85);
        break;
      }
    }
  }
  
  // Extract hobbies/interests (Indonesian & English)
  const hobbyPatterns = [
    // Indonesian
    /hobi (saya|aku|gue|gw|gua) (adalah|yaitu|suka|gemar)\s+([\w\s]+?)(?:[.!?,]|$)/i,
    /(saya|aku|gue|gw|gua) suka\s+([\w\s]+?)(?:[.!?,]|$)/i,
    /(saya|aku|gue|gw|gua) gemar\s+([\w\s]+?)(?:[.!?,]|$)/i,
    /(saya|aku|gue|gw|gua) senang\s+([\w\s]+?)(?:[.!?,]|$)/i,
    /(saya|aku|gue|gw|gua) hobby (suka|gemar)\s+([\w\s]+?)(?:[.!?,]|$)/i,
    /kesukaan (saya|aku|gue|gw|gua) (adalah|yaitu)\s+([\w\s]+?)(?:[.!?,]|$)/i,
    // English
    /i (like|love|enjoy|am into|am fond of)\s+([\w\s]+?)(?:[.!?,]|$)/i,
    /my hobby is\s+([\w\s]+?)(?:[.!?,]|$)/i,
    /i'm interested in\s+([\w\s]+?)(?:[.!?,]|$)/i,
  ];
  
  for (const pattern of hobbyPatterns) {
    const match = userMessage.match(pattern);
    if (match && match[2]) {
      const hobby = match[2].trim();
      if (hobby.length > 2 && hobby.length < 50) {
        await addPersonalFact(hobby, 'hobby', userMessage, 0.75);
        
        // Also add to preferences
        const memory = await loadUserMemory();
        const hobbyLower = hobby.toLowerCase();
        if (!memory.preferences.favoriteTopics.includes(hobbyLower)) {
          await updatePreferences({
            favoriteTopics: [...memory.preferences.favoriteTopics, hobbyLower].slice(0, 10),
          });
        }
        break;
      }
    }
  }
  
  // Extract work/occupation (Indonesian & English)
  const workPatterns = [
    // Indonesian
    /(saya|aku|gue|gw|gua) (bekerja|kerja|profesi|pekerjaan) (sebagai|di|adalah)\s+([\w\s]+?)(?:[.!?,]|$)/i,
    /(saya|aku|gue|gw|gua) (adalah|yaitu|seorang)\s+(?:mahasiswa|pelajar|guru|dokter|programmer|engineer|designer|penulis|pengusaha|wiraswasta|karyawan)/i,
    // English
    /i work (as|at)\s+([\w\s]+?)(?:[.!?,]|$)/i,
    /i am a\s+([\w\s]+?)(?:[.!?,]|$)/i,
    /my job is\s+([\w\s]+?)(?:[.!?,]|$)/i,
    /i'm a\s+([\w\s]+?)(?:[.!?,]|$)/i,
  ];
  
  for (const pattern of workPatterns) {
    const match = userMessage.match(pattern);
    if (match) {
      const work = match[4] || match[3] || match[2];
      if (work && work.length > 2 && work.length < 50) {
        await addPersonalFact(work.trim(), 'work', userMessage, 0.8);
        break;
      }
    }
  }
  
  // Extract skills (Indonesian & English)
  const skillPatterns = [
    // Indonesian
    /(saya|aku|gue|gw|gua) bisa\s+([\w\s]+?)(?:[.!?,]|$)/i,
    /(saya|aku|gue|gw|gua) ahli (dalam|di)\s+([\w\s]+?)(?:[.!?,]|$)/i,
    /(saya|aku|gue|gw|gua) pandai (dalam|di)\s+([\w\s]+?)(?:[.!?,]|$)/i,
    // English
    /i can\s+([\w\s]+?)(?:[.!?,]|$)/i,
    /i'm good at\s+([\w\s]+?)(?:[.!?,]|$)/i,
    /i'm skilled in\s+([\w\s]+?)(?:[.!?,]|$)/i,
  ];
  
  for (const pattern of skillPatterns) {
    const match = userMessage.match(pattern);
    if (match && match[2]) {
      const skill = match[2].trim();
      if (skill.length > 2 && skill.length < 50) {
        await addPersonalFact(skill, 'skill', userMessage, 0.7);
        break;
      }
    }
  }
  
  // Extract important dates (birthdays, etc.) - Indonesian & English
  const datePatterns = [
    // Indonesian
    /ulang tahun (saya|aku|gue|gw|gua) (adalah|tanggal|tiap|setiap)\s+([\d\w\s]+?)(?:[.!?,]|$)/i,
    /hari lahir (saya|aku|gue|gw|gua)\s+([\d\w\s]+?)(?:[.!?,]|$)/i,
    // English
    /my birthday is\s+([\w\s]+?)(?:[.!?,]|$)/i,
    /i was born on\s+([\w\s]+?)(?:[.!?,]|$)/i,
  ];
  
  for (const pattern of datePatterns) {
    const match = userMessage.match(pattern);
    if (match && match[3]) {
      await addImportantDate('birthday', match[3].trim(), 'User birthday');
      break;
    }
  }
  
  // Extract family/friends (Indonesian & English)
  const familyPatterns = [
    // Indonesian
    /(saya|aku|gue|gw|gua) punya\s+(?:seorang)?\s*(istri|suami|pacar|teman|saudara|kakak|adik|orang tua|ibu|bapak|ayah|ibu|anak)\s+(?:yang)?\s*(?:bernama|namanya)?\s*(\w+)/i,
    // English
    /i have a\s+(wife|husband|girlfriend|boyfriend|friend|sister|brother|parent)\s+(?:named)?\s*(\w+)/i,
  ];
  
  for (const pattern of familyPatterns) {
    const match = userMessage.match(pattern);
    if (match) {
      const relation = match[2] || match[1];
      const name = match[3] || match[2];
      if (name && name.length > 1) {
        await addPersonalFact(`${relation}: ${name}`, 'family', userMessage, 0.8);
        break;
      }
    }
  }
  
  // Detect tone preference (Indonesian & English)
  if (lowerMsg.includes('formal') || lowerMsg.includes('sopan') || lowerMsg.includes('resmi')) {
    await updatePreferences({ tone: 'formal' });
  } else if (lowerMsg.includes('santai') || lowerMsg.includes('casual') || lowerMsg.includes('akrab') || lowerMsg.includes('santai aja')) {
    await updatePreferences({ tone: 'casual' });
  } else if (lowerMsg.includes('friendly') || lowerMsg.includes('ramah') || lowerMsg.includes('hangat')) {
    await updatePreferences({ tone: 'friendly' });
  }
  
  // Detect language preference (Indonesian & English)
  if (lowerMsg.includes('bahasa indonesia') || lowerMsg.includes('pake bahasa indonesia') || lowerMsg.includes('pakai bahasa indonesia') || lowerMsg.includes('indonesia aja')) {
    await updatePreferences({ language: 'id' });
  } else if (lowerMsg.includes('english') || lowerMsg.includes('bahasa inggris') || lowerMsg.includes('inggris aja')) {
    await updatePreferences({ language: 'en' });
  }
  
  // Detect response length preference
  if (lowerMsg.includes('singkat') || lowerMsg.includes('short') || lowerMsg.includes('cepat') || lowerMsg.includes('to the point')) {
    await updatePreferences({ responseLength: 'short' });
  } else if (lowerMsg.includes('panjang') || lowerMsg.includes('detailed') || lowerMsg.includes('detail') || lowerMsg.includes('lengkap')) {
    await updatePreferences({ responseLength: 'long' });
  }
  
  // Detect emoji preference
  if (lowerMsg.includes('tanpa emoji') || lowerMsg.includes('no emoji') || lowerMsg.includes('jangan pakai emoji')) {
    await updatePreferences({ emojiUsage: 'none' });
  } else if (lowerMsg.includes('banyak emoji') || lowerMsg.includes('lots of emoji') || lowerMsg.includes('pake banyak emoji')) {
    await updatePreferences({ emojiUsage: 'abundant' });
  }
  
  // Add conversation summary
  const sentiment: RecentInteraction['sentiment'] = 
    lowerMsg.includes('terima kasih') || lowerMsg.includes('makasih') || lowerMsg.includes('thanks') || lowerMsg.includes('great') || lowerMsg.includes('awesome') || lowerMsg.includes('bagus') || lowerMsg.includes('keren')
      ? 'positive'
      : lowerMsg.includes('marah') || lowerMsg.includes('kesal') || lowerMsg.includes('bad') || lowerMsg.includes('jelek') || lowerMsg.includes('buruk') || lowerMsg.includes('kecewa')
        ? 'negative'
        : 'neutral';
  
  await addConversationSummary(
    'general',
    sentiment,
    `User: "${userMessage.substring(0, 50)}${userMessage.length > 50 ? '...' : ''}"`
  );
}

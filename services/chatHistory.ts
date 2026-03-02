import AsyncStorage from '@react-native-async-storage/async-storage';

export interface ChatSession {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: ChatMessage[];
}

export interface ChatMessage {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: number;
}

const SESSIONS_KEY = '@mochibot_chat_sessions';
const CURRENT_SESSION_KEY = '@mochibot_current_session_id';

/**
 * Generate unique ID for chat session
 */
function generateId(): string {
  return `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Generate chat title from first message with topic detection
 */
function generateTitle(firstMessage: string, conversation?: ChatMessage[]): string {
  const trimmed = firstMessage.trim();
  
  // If we have more context, use it to generate better title
  if (conversation && conversation.length > 0) {
    // Look for topic indicators in first few messages
    const earlyMessages = conversation.slice(0, 3).map(m => m.text.toLowerCase()).join(' ');
    
    // Detect topic from keywords
    const topicPatterns: Record<string, RegExp> = {
      'Coding': /code|program|javascript|python|react|node|api|database|bug|error/i,
      'Curhat': /sedih|marah|kecewa|stress|tired|sad|angry|frustrated/i,
      'Belajar': /belajar|study|learn|school|university|kursus|kelas/i,
      'Kerja': /kerja|work|project|meeting|deadline|boss|kantor/i,
      'Hobi': /hobi|suka|gemar|music|film|game|olahraga|sport/i,
      'Keluarga': /keluarga|family|ibu|bapak|ayah|ibu|kakak|adik|suami|istri/i,
      'Tempat': /tinggal|kota|jakarta|bandung|surabaya|indonesia|travel|liburan/i,
      'Makanan': /makan|food|restoran|masak|recipe|lapar|hungry/i,
      'Kesehatan': /sakit|health|doctor|obat|pusing|demam|flu|wellness/i,
      'Relationship': /pacar|cinta|love|relationship|couple|breakup|marriage/i,
    };
    
    for (const [topic, pattern] of Object.entries(topicPatterns)) {
      if (pattern.test(earlyMessages)) {
        const preview = trimmed.length <= 25 ? trimmed : trimmed.substring(0, 25) + '...';
        return `${topic} | ${preview}`;
      }
    }
  }
  
  // Default: use first message with length limit
  if (trimmed.length <= 35) return trimmed;
  return trimmed.substring(0, 35) + '...';
}

/**
 * Get all chat sessions
 */
export async function getAllSessions(): Promise<ChatSession[]> {
  try {
    const stored = await AsyncStorage.getItem(SESSIONS_KEY);
    if (stored) {
      const sessions = JSON.parse(stored) as ChatSession[];
      return sessions.sort((a, b) => b.updatedAt - a.updatedAt);
    }
  } catch (error) {
    console.error('[ChatHistory] Error loading sessions:', error);
  }
  return [];
}

/**
 * Get current session ID
 */
export async function getCurrentSessionId(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(CURRENT_SESSION_KEY);
  } catch (error) {
    console.error('[ChatHistory] Error loading current session:', error);
  }
  return null;
}

/**
 * Get a specific session by ID
 */
export async function getSessionById(id: string): Promise<ChatSession | null> {
  try {
    const sessions = await getAllSessions();
    return sessions.find(s => s.id === id) || null;
  } catch (error) {
    console.error('[ChatHistory] Error loading session:', error);
  }
  return null;
}

/**
 * Create a new chat session
 */
export async function createSession(firstMessage?: string): Promise<ChatSession> {
  const sessions = await getAllSessions();

  const newSession: ChatSession = {
    id: generateId(),
    title: firstMessage ? generateTitle(firstMessage) : 'New Chat',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    messages: [],
  };

  sessions.unshift(newSession);
  await AsyncStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
  await AsyncStorage.setItem(CURRENT_SESSION_KEY, newSession.id);

  return newSession;
}

/**
 * Save messages to current session with auto-title generation
 */
export async function saveSessionMessages(
  sessionId: string,
  messages: ChatMessage[]
): Promise<void> {
  try {
    const sessions = await getAllSessions();
    const sessionIndex = sessions.findIndex(s => s.id === sessionId);

    if (sessionIndex !== -1) {
      // Update title intelligently based on conversation content
      if (messages.length > 0) {
        const firstUserMessage = messages.find(m => m.sender === 'user');
        if (firstUserMessage) {
          // Generate smart title with conversation context
          sessions[sessionIndex].title = generateTitle(firstUserMessage.text, messages);
        }
      }

      sessions[sessionIndex].messages = messages;
      sessions[sessionIndex].updatedAt = Date.now();
      
      // Move to top
      const updatedSession = sessions.splice(sessionIndex, 1)[0];
      sessions.unshift(updatedSession);
      
      await AsyncStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
    }
  } catch (error) {
    console.error('[ChatHistory] Error saving messages:', error);
  }
}

/**
 * Delete a session
 */
export async function deleteSession(id: string): Promise<void> {
  try {
    const sessions = await getAllSessions();
    const filtered = sessions.filter(s => s.id !== id);
    await AsyncStorage.setItem(SESSIONS_KEY, JSON.stringify(filtered));
    
    // If deleted session was current, clear current
    const currentId = await getCurrentSessionId();
    if (currentId === id) {
      await AsyncStorage.removeItem(CURRENT_SESSION_KEY);
    }
  } catch (error) {
    console.error('[ChatHistory] Error deleting session:', error);
  }
}

/**
 * Update session title
 */
export async function updateSessionTitle(
  id: string,
  newTitle: string
): Promise<void> {
  try {
    const sessions = await getAllSessions();
    const sessionIndex = sessions.findIndex(s => s.id === id);

    if (sessionIndex !== -1) {
      sessions[sessionIndex].title = newTitle;
      await AsyncStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
    }
  } catch (error) {
    console.error('[ChatHistory] Error updating title:', error);
  }
}

/**
 * Regenerate session title from conversation content
 */
export async function regenerateSessionTitle(id: string): Promise<void> {
  try {
    const sessions = await getAllSessions();
    const sessionIndex = sessions.findIndex(s => s.id === id);

    if (sessionIndex !== -1) {
      const session = sessions[sessionIndex];
      if (session.messages.length > 0) {
        const firstUserMessage = session.messages.find(m => m.sender === 'user');
        if (firstUserMessage) {
          sessions[sessionIndex].title = generateTitle(firstUserMessage.text, session.messages);
          await AsyncStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
        }
      }
    }
  } catch (error) {
    console.error('[ChatHistory] Error regenerating title:', error);
  }
}

/**
 * Clear all sessions
 */
export async function clearAllSessions(): Promise<void> {
  try {
    await AsyncStorage.removeItem(SESSIONS_KEY);
    await AsyncStorage.removeItem(CURRENT_SESSION_KEY);
  } catch (error) {
    console.error('[ChatHistory] Error clearing all sessions:', error);
  }
}

/**
 * Get conversation context as string for AI
 * Returns formatted conversation history
 */
export function getConversationContext(
  messages: ChatMessage[],
  maxMessages: number = 50
): string {
  const recentMessages = messages.slice(-maxMessages);
  
  return recentMessages
    .map((msg) => `${msg.sender === 'user' ? 'User' : 'Assistant'}: ${msg.text}`)
    .join('\n');
}

/**
 * Export chat session as text
 */
export function exportSessionAsText(session: ChatSession): string {
  const lines = [
    `Chat: ${session.title}`,
    `Created: ${new Date(session.createdAt).toLocaleString()}`,
    `Updated: ${new Date(session.updatedAt).toLocaleString()}`,
    `Messages: ${session.messages.length}`,
    '',
    '---',
    '',
  ];
  
  session.messages.forEach((msg) => {
    const prefix = msg.sender === 'user' ? '👤 You' : '🤖 Mochibot';
    const time = new Date(msg.timestamp).toLocaleTimeString();
    lines.push(`[${time}] ${prefix}: ${msg.text}`);
    lines.push('');
  });
  
  return lines.join('\n');
}

/**
 * Get session statistics
 */
export function getSessionStats(sessions: ChatSession[]): {
  totalSessions: number;
  totalMessages: number;
  avgMessagesPerSession: number;
  lastActiveAt: number | null;
} {
  const totalMessages = sessions.reduce(
    (sum, s) => sum + s.messages.length,
    0
  );
  
  const lastActiveAt =
    sessions.length > 0 ? sessions[0].updatedAt : null;
  
  return {
    totalSessions: sessions.length,
    totalMessages,
    avgMessagesPerSession:
      sessions.length > 0 ? Math.round(totalMessages / sessions.length) : 0,
    lastActiveAt,
  };
}

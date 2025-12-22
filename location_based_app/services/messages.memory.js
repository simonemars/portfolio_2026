// In-memory message service for development/fallback

const store = {
  threads: new Map(),
  messages: new Map(),
  userThreads: new Map(), // userId -> Set of threadIds
};

function emitAsync(cb, v) {
  setTimeout(() => cb(v), 0);
}

function generateId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export const service = {
  async createOrGetDM(userA, userB) {
    const id = [userA, userB].sort().join('__');
    
    if (!store.threads.has(id)) {
      const thread = {
        id,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      store.threads.set(id, thread);
      
      // Add to user threads
      if (!store.userThreads.has(userA)) {
        store.userThreads.set(userA, new Set());
      }
      if (!store.userThreads.has(userB)) {
        store.userThreads.set(userB, new Set());
      }
      store.userThreads.get(userA).add(id);
      store.userThreads.get(userB).add(id);
      
      // Initialize messages array
      store.messages.set(id, []);
    }
    
    return id;
  },

  watchThreads(userId, cb) {
    // Return threads for this user
    const userThreadSet = store.userThreads.get(userId) || new Set();
    const threads = Array.from(userThreadSet).map(threadId => {
      const thread = store.threads.get(threadId);
      const messages = store.messages.get(threadId) || [];
      const lastMsg = messages[messages.length - 1];
      
      // Determine other user
      const [userA, userB] = threadId.split('__');
      const otherUserId = userA === userId ? userB : userA;
      
      return {
        id: threadId,
        lastText: lastMsg?.text || '',
        lastAt: lastMsg?.createdAt || thread.updatedAt,
        otherUser: {
          id: otherUserId,
          name: `User ${otherUserId.slice(0, 4)}`, // Mock name
        },
        unreadCount: 0, // Simplified for now
      };
    }).sort((a, b) => (b.lastAt || 0) - (a.lastAt || 0));
    
    emitAsync(cb, threads);
    
    // Return unsubscribe function
    return () => {};
  },

  watchMessages(threadId, cb) {
    const messages = store.messages.get(threadId) || [];
    emitAsync(cb, messages);
    
    // Return unsubscribe function
    return () => {};
  },

  async sendMessage(threadId, msg) {
    const messages = store.messages.get(threadId) || [];
    const message = {
      id: generateId(),
      threadId,
      senderId: msg.senderId,
      text: msg.text,
      createdAt: Date.now(),
    };
    
    messages.push(message);
    store.messages.set(threadId, messages);
    
    // Update thread
    const thread = store.threads.get(threadId);
    if (thread) {
      thread.updatedAt = Date.now();
    }
    
    // Trigger updates (in real implementation, this would be handled by Firestore listeners)
    // For now, we'll need to manually refresh
  },

  async markRead(threadId, userId) {
    // Simplified - in real implementation would update lastReadAt
  },
};



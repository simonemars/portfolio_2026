// Firestore message service implementation

import { db } from './firebase';
import {
  collection,
  doc,
  setDoc,
  getDoc,
  addDoc,
  onSnapshot,
  serverTimestamp,
  query,
  orderBy,
  limit,
  updateDoc,
} from 'firebase/firestore';

function threadRef(id) {
  return doc(db, 'threads', id);
}

function msgsCol(threadId) {
  return collection(db, 'threads', threadId, 'messages');
}

function userThreadsCol(userId) {
  return collection(db, 'userThreads', userId, 'threads');
}

export const service = {
  async createOrGetDM(userA, userB) {
    const id = [userA, userB].sort().join('__');
    const t = await getDoc(threadRef(id));
    
    if (!t.exists()) {
      await setDoc(threadRef(id), {
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      
      // Create user thread references
      await setDoc(doc(userThreadsCol(userA), id), {
        threadId: id,
        updatedAt: serverTimestamp(),
        otherUser: { id: userB, name: `User ${userB.slice(0, 4)}` },
        unreadCount: 0,
      });
      
      await setDoc(doc(userThreadsCol(userB), id), {
        threadId: id,
        updatedAt: serverTimestamp(),
        otherUser: { id: userA, name: `User ${userA.slice(0, 4)}` },
        unreadCount: 0,
      });
    }
    
    return id;
  },

  watchThreads(userId, cb) {
    const q = query(
      userThreadsCol(userId),
      orderBy('updatedAt', 'desc'),
      limit(50)
    );
    
    return onSnapshot(q, (snap) => {
      const threads = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          lastText: data.lastText || '',
          lastAt: data.updatedAt?.toMillis?.() || Date.now(),
          otherUser: data.otherUser || { id: '', name: 'Unknown' },
          unreadCount: data.unreadCount || 0,
        };
      });
      cb(threads);
    });
  },

  watchMessages(threadId, cb) {
    const q = query(
      msgsCol(threadId),
      orderBy('createdAt', 'asc'),
      limit(200)
    );
    
    return onSnapshot(q, (snap) => {
      const messages = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          threadId,
          senderId: data.senderId,
          text: data.text,
          createdAt: data.createdAt?.toMillis?.() || Date.now(),
        };
      });
      cb(messages);
    });
  },

  async sendMessage(threadId, msg) {
    await addDoc(msgsCol(threadId), {
      senderId: msg.senderId,
      text: msg.text,
      createdAt: serverTimestamp(),
      status: 'sent',
    });
    
    await updateDoc(threadRef(threadId), {
      updatedAt: serverTimestamp(),
    });
    
    // Update user thread references with last message
    // This would ideally be done via a cloud function, but for now we'll do it client-side
    // Note: This requires knowing both participants - simplified for now
  },

  async markRead(threadId, userId) {
    const userThreadRef = doc(userThreadsCol(userId), threadId);
    await updateDoc(userThreadRef, {
      unreadCount: 0,
      lastReadAt: serverTimestamp(),
    });
  },
};



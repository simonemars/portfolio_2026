export const FRIENDS = [
  { 
    id: "1", 
    name: "Simon", 
    bio: "Long walks and cocktail bars.", 
    isFriend: true,
    distanceKm: 1.5,
    inRange: true
  },
  { 
    id: "2", 
    name: "John", 
    bio: "Museums, live jazz, open to hikes.", 
    isFriend: true,
    distanceKm: 3.2,
    inRange: true
  },
  { 
    id: "3", 
    name: "Mark", 
    bio: "Coffee snob & board games.", 
    isFriend: true,
    distanceKm: 7.8,
    inRange: false
  }
];

// Mock coordinates (never exposed to UI - only for distance calculations)
// In production, these would come from server with computed distance/inRange
export const NEARBY = [
  { 
    id: "4", 
    name: "Ava", 
    bio: "Down for rooftop sunsets.", 
    isFriend: false,
    // Mock: coords would be stored server-side only
    distanceKm: 2.3,
    inRange: true
  },
  { 
    id: "5", 
    name: "Leo", 
    bio: "Urban hikes + tacos.", 
    isFriend: false,
    distanceKm: 6.7,
    inRange: false
  }
];

export const FRIEND_REQUESTS = [
  { id: "r1", name: "Maya", bio: "hey! saw you're nearby—want to grab tea?" },
  { id: "r2", name: "Sam", bio: "Coffee enthusiast, always up for a chat." },
  { id: "r3", name: "Alex", bio: "Love hiking and photography." }
];

export const FRIEND_REQUESTS_COUNT = FRIEND_REQUESTS.length;

export const MSG_FRIENDS = [
  { 
    id: "m1", 
    name: "Simo", 
    preview: "Urban hike tomorrow? 6pm works…", 
    time: "2h",
    unreadCount: 2,
    isUnread: true
  },
  { 
    id: "m2", 
    name: "John", 
    preview: "Bucktown bar has a new menu!", 
    time: "1d",
    unreadCount: 0,
    isUnread: false
  }
];

export const MSG_REQUESTS = [
  { 
    id: "r1", 
    name: "Maya", 
    preview: "hey! saw you're nearby—want to grab tea?", 
    time: "3h",
    unreadCount: 1,
    isUnread: true
  }
];


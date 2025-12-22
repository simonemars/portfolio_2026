export interface User {
  uid: string;
  email: string;
  displayName: string | null;
  role: "user" | "admin";
  createdAt: Date;
}

export interface Report {
  id: string;
  userId: string;
  description: string;
  photoUrls: string[];
  location: {
    latitude: number;
    longitude: number;
  };
  addressText: string;
  isPublic: boolean;
  voteCount: number;
  urgencyScore: number;
  status: "new" | "in_progress" | "resolved";
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateReportData {
  description: string;
  photoUrls: string[];
  location: {
    latitude: number;
    longitude: number;
  };
  addressText: string;
  isPublic: boolean;
}

export interface VoteData {
  reportId: string;
  userId: string;
}

export interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
}

export interface ReportFormData {
  description: string;
  isPublic: boolean;
  photos: string[];
} 
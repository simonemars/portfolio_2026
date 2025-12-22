import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  doc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  Timestamp,
  GeoPoint
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { httpsCallable } from "firebase/functions";
import { db, storage, functions } from "./firebase";
import { Report, CreateReportData } from "../types";
import AsyncStorage from '@react-native-async-storage/async-storage';

// Storage key for reports
const REPORTS_STORAGE_KEY = 'municipality_reports';

// Load reports from AsyncStorage
const loadReportsFromStorage = async (): Promise<Report[]> => {
  try {
    const storedReports = await AsyncStorage.getItem(REPORTS_STORAGE_KEY);
    if (storedReports) {
      const reports = JSON.parse(storedReports);
      // Convert date strings back to Date objects
      return reports.map((report: any) => ({
        ...report,
        createdAt: new Date(report.createdAt),
        updatedAt: new Date(report.updatedAt)
      }));
    }
    return [];
  } catch (error) {
    console.error('Error loading reports from storage:', error);
    return [];
  }
};

// Save reports to AsyncStorage
const saveReportsToStorage = async (reports: Report[]): Promise<void> => {
  try {
    await AsyncStorage.setItem(REPORTS_STORAGE_KEY, JSON.stringify(reports));
  } catch (error) {
    console.error('Error saving reports to storage:', error);
  }
};

// Get current reports from storage
const getCurrentReports = async (): Promise<Report[]> => {
  return await loadReportsFromStorage();
};

// Mock votes data
const mockVotes = new Map<string, Set<string>>();

export const createReport = async (reportData: Omit<Report, 'id' | 'status' | 'urgencyScore' | 'voteCount' | 'createdAt' | 'updatedAt'>, userId: string): Promise<string> => {
  try {
    const newReport: Report = {
      id: `report-${Date.now()}`,
      ...reportData,
      status: 'new',
      urgencyScore: Math.random() * 10, // Mock urgency score
      voteCount: 0,
      userId,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    // Load existing reports and add the new one
    const existingReports = await getCurrentReports();
    const updatedReports = [...existingReports, newReport];
    await saveReportsToStorage(updatedReports);
    
    console.log('Creating report with data:', {
      addressText: reportData.addressText,
      description: reportData.description,
      isPublic: reportData.isPublic,
      location: reportData.location,
      userId
    });
    console.log('Report created with ID:', newReport.id);
    
    return newReport.id;
  } catch (error) {
    throw error;
  }
};

export const uploadImage = async (imageUri: string, reportId: string, index: number): Promise<string> => {
  try {
    // Mock image upload - for now, return the local URI since we're in development
    // In production, this would upload to Firebase Storage and return the download URL
    return imageUri;
  } catch (error) {
    throw error;
  }
};

export const getPublicReports = async (): Promise<Report[]> => {
  try {
    const reports = await getCurrentReports();
    // Return public reports sorted by creation date
    return reports
      .filter(report => report.isPublic)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  } catch (error) {
    throw error;
  }
};

export const getUserReports = async (userId: string): Promise<Report[]> => {
  try {
    const reports = await getCurrentReports();
    // Return user's reports sorted by creation date
    return reports
      .filter(report => report.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  } catch (error) {
    throw error;
  }
};

export const getReport = async (reportId: string): Promise<Report> => {
  try {
    const reports = await getCurrentReports();
    const report = reports.find(r => r.id === reportId);
    if (!report) {
      throw new Error('Report not found');
    }
    return report;
  } catch (error) {
    throw error;
  }
};

export const voteReport = async (reportId: string, userId: string): Promise<void> => {
  try {
    // Check if user already voted
    if (!mockVotes.has(reportId)) {
      mockVotes.set(reportId, new Set());
    }
    
    const reportVotes = mockVotes.get(reportId)!;
    if (reportVotes.has(userId)) {
      throw new Error('You have already voted on this report');
    }
    
    // Add vote
    reportVotes.add(userId);
    
    // Update vote count in storage
    const reports = await getCurrentReports();
    const reportIndex = reports.findIndex(r => r.id === reportId);
    if (reportIndex !== -1) {
      reports[reportIndex].voteCount = reportVotes.size;
      await saveReportsToStorage(reports);
    }
  } catch (error) {
    throw error;
  }
};

export const updateReportStatus = async (reportId: string, status: Report['status']): Promise<void> => {
  try {
    const reports = await getCurrentReports();
    const reportIndex = reports.findIndex(r => r.id === reportId);
    if (reportIndex !== -1) {
      reports[reportIndex].status = status;
      reports[reportIndex].updatedAt = new Date();
      await saveReportsToStorage(reports);
    }
  } catch (error) {
    throw error;
  }
};

export const updateReportPhotos = async (reportId: string, photoUrls: string[]): Promise<void> => {
  try {
    const reports = await getCurrentReports();
    const reportIndex = reports.findIndex(r => r.id === reportId);
    if (reportIndex !== -1) {
      reports[reportIndex].photoUrls = photoUrls;
      reports[reportIndex].updatedAt = new Date();
      await saveReportsToStorage(reports);
      console.log('Report updated with photo URLs');
    }
  } catch (error) {
    throw error;
  }
};

export const subscribeToReports = (
  callback: (reports: Report[]) => void,
  isPublic: boolean = true
) => {
  const q = query(
    collection(db, "reports"),
    where("isPublic", "==", isPublic),
    orderBy("createdAt", "desc")
  );
  
  return onSnapshot(q, (querySnapshot) => {
    const reports = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt.toDate(),
      updatedAt: doc.data().updatedAt.toDate()
    })) as Report[];
    
    callback(reports);
  });
}; 
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { httpsCallable } from "firebase/functions";
import { functions } from "./firebase";

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export const registerForPushNotifications = async (): Promise<string | null> => {
  try {
    // Request permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      console.log('Failed to get push token for push notification!');
      return null;
    }
    
    // Get the token - commented out until we have a real Expo project ID
    // const token = (await Notifications.getExpoPushTokenAsync({
    //   projectId: 'your-expo-project-id', // Replace with your Expo project ID
    // })).data;
    
    // console.log('Push token:', token);
    // return token;
    
    // For now, return null since we don't have a real Expo project ID
    console.log('Push notifications not configured - need real Expo project ID');
    return null;
  } catch (error) {
    console.error('Error getting push token:', error);
    return null;
  }
};

export const savePushToken = async (userId: string, token: string): Promise<void> => {
  try {
    const saveTokenFunction = httpsCallable(functions, 'savePushToken');
    await saveTokenFunction({ userId, token });
  } catch (error) {
    console.error('Error saving push token:', error);
  }
};

export const addNotificationReceivedListener = (
  listener: (notification: Notifications.Notification) => void
) => {
  return Notifications.addNotificationReceivedListener(listener);
};

export const addNotificationResponseReceivedListener = (
  listener: (response: Notifications.NotificationResponse) => void
) => {
  return Notifications.addNotificationResponseReceivedListener(listener);
};

export const scheduleLocalNotification = async (
  title: string,
  body: string,
  data?: any
) => {
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data,
    },
    trigger: null, // Send immediately
  });
}; 
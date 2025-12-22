import React from 'react';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '../hooks/useAuth';
import { theme } from '../theme';

// Auth Screens
import LoginScreen from '../screens/Auth/LoginScreen';
import RegisterScreen from '../screens/Auth/RegisterScreen';

// Main Screens
import HomeScreen from '../screens/HomeScreen';
import MyReportsScreen from '../screens/MyReportsScreen';
import NewReportScreen from '../screens/NewReportScreen';
import ReportDetailScreen from '../screens/ReportDetailScreen';
import SettingsScreen from '../screens/SettingsScreen';
import AdminDashboardScreen from '../screens/Admin/AdminDashboardScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const navigationTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: theme.colors.background,
    card: theme.colors.secondary,
    text: theme.colors.onBackground,
    border: theme.colors.outline,
    notification: theme.colors.notification,
  },
};

const commonScreenOptions = {
  headerStyle: {
    backgroundColor: theme.colors.background,
  },
  headerTintColor: theme.colors.onBackground,
  headerShadowVisible: false, // Remove default shadow for cleaner look
};

const AuthStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false, ...commonScreenOptions }}>
    <Stack.Screen name="Login" component={LoginScreen} />
    <Stack.Screen name="Register" component={RegisterScreen} />
  </Stack.Navigator>
);

const MainTabs = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      tabBarIcon: ({ focused, color, size }) => {
        let iconName: keyof typeof Ionicons.glyphMap;

        if (route.name === 'Home') {
          iconName = focused ? 'home' : 'home-outline';
        } else if (route.name === 'My Reports') {
          iconName = focused ? 'document-text' : 'document-text-outline';
        } else if (route.name === 'Settings') {
          iconName = focused ? 'settings' : 'settings-outline';
        } else {
          iconName = 'help-outline';
        }

        return <Ionicons name={iconName} size={size} color={color} />;
      },
      tabBarActiveTintColor: theme.colors.onPrimary,
      tabBarInactiveTintColor: 'rgba(255, 255, 255, 0.4)',
      tabBarStyle: {
        backgroundColor: theme.colors.secondary,
        borderTopColor: 'rgba(255, 255, 255, 0.05)',
        borderTopWidth: 1,
      },
      headerStyle: {
        backgroundColor: theme.colors.background,
      },
      headerTintColor: theme.colors.onBackground,
      headerShadowVisible: false,
    })}
  >
    <Tab.Screen name="Home" component={HomeScreen} />
    <Tab.Screen name="My Reports" component={MyReportsScreen} />
    <Tab.Screen name="Settings" component={SettingsScreen} />
  </Tab.Navigator>
);

const AdminTabs = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      tabBarIcon: ({ focused, color, size }) => {
        let iconName: keyof typeof Ionicons.glyphMap;

        if (route.name === 'Home') {
          iconName = focused ? 'home' : 'home-outline';
        } else if (route.name === 'My Reports') {
          iconName = focused ? 'document-text' : 'document-text-outline';
        } else if (route.name === 'Admin') {
          iconName = focused ? 'shield' : 'shield-outline';
        } else if (route.name === 'Settings') {
          iconName = focused ? 'settings' : 'settings-outline';
        } else {
          iconName = 'help-outline';
        }

        return <Ionicons name={iconName} size={size} color={color} />;
      },
      tabBarActiveTintColor: theme.colors.onPrimary,
      tabBarInactiveTintColor: 'rgba(255, 255, 255, 0.4)',
      tabBarStyle: {
        backgroundColor: theme.colors.secondary,
        borderTopColor: 'rgba(255, 255, 255, 0.05)',
        borderTopWidth: 1,
      },
      headerStyle: {
        backgroundColor: theme.colors.background,
      },
      headerTintColor: theme.colors.onBackground,
      headerShadowVisible: false,
    })}
  >
    <Tab.Screen name="Home" component={HomeScreen} />
    <Tab.Screen name="My Reports" component={MyReportsScreen} />
    <Tab.Screen name="Admin" component={AdminDashboardScreen} />
    <Tab.Screen name="Settings" component={SettingsScreen} />
  </Tab.Navigator>
);

const MainStack = () => (
  <Stack.Navigator screenOptions={commonScreenOptions}>
    <Stack.Screen 
      name="MainTabs" 
      component={MainTabs} 
      options={{ headerShown: false }}
    />
    <Stack.Screen 
      name="New Report" 
      component={NewReportScreen}
      options={{ title: 'Report an Issue' }}
    />
    <Stack.Screen 
      name="ReportDetail" 
      component={ReportDetailScreen}
      options={{ title: 'Report Details' }}
    />
  </Stack.Navigator>
);

const AdminStack = () => (
  <Stack.Navigator screenOptions={commonScreenOptions}>
    <Stack.Screen 
      name="AdminTabs" 
      component={AdminTabs} 
      options={{ headerShown: false }}
    />
    <Stack.Screen 
      name="New Report" 
      component={NewReportScreen}
      options={{ title: 'Report an Issue' }}
    />
    <Stack.Screen 
      name="ReportDetail" 
      component={ReportDetailScreen}
      options={{ title: 'Report Details' }}
    />
  </Stack.Navigator>
);

export const Navigation = () => {
  const { isAuthenticated, isAdmin, loading } = useAuth();

  if (loading) {
    // You can add a loading screen here
    return null;
  }

  return (
    <NavigationContainer theme={navigationTheme}>
      {!isAuthenticated ? (
        <AuthStack />
      ) : isAdmin() ? (
        <AdminStack />
      ) : (
        <MainStack />
      )}
    </NavigationContainer>
  );
}; 
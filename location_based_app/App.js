import React, { useState, useEffect } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useFonts, CrimsonPro_600SemiBold, CrimsonPro_700Bold } from "@expo-google-fonts/crimson-pro";
import { Inter_400Regular, Inter_500Medium } from "@expo-google-fonts/inter";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";
import { FiltersProvider } from "./context/FiltersContext";
import { ThemeProvider, useTheme } from "./theme/ThemeContext";
import { supabase } from "./services/supabase";
import { setAuthToken, clearAuthToken } from "./services/api";
import PeopleNearbyScreen from "./screens/PeopleNearbyScreen";
import MessagesScreen from "./screens/MessagesScreen";
import ChatScreen from "./screens/ChatScreen";
import ThreadScreen from "./screens/ThreadScreen";
import ProfileScreen from "./screens/ProfileScreen";
import SettingsScreen from "./screens/SettingsScreen";
import AuthScreen from "./screens/AuthScreen";

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function MessagesStack() {
  const { theme } = useTheme();
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: theme.colors.bg },
        headerTintColor: theme.colors.textPrimary,
        headerTitleStyle: { fontFamily: theme.fonts.serifBold, fontSize: 20 },
        contentStyle: { backgroundColor: theme.colors.bg },
        headerBackTitle: "Messages",
      }}
    >
      <Stack.Screen
        name="MessagesHome"
        component={MessagesScreen}
        options={{ title: "Messages", headerShown: false }}
      />
      <Stack.Screen
        name="Chat"
        component={ChatScreen}
        options={({ route }) => ({
          title: route.params?.title || "Chat",
          headerBackTitle: "Messages",
        })}
      />
      <Stack.Screen
        name="Thread"
        component={ThreadScreen}
        options={({ route }) => ({ title: route.params?.name || "Thread" })}
      />
    </Stack.Navigator>
  );
}

function ProfileStack() {
  const { theme } = useTheme();
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: theme.colors.bg },
        headerTintColor: theme.colors.textPrimary,
        headerTitleStyle: { fontFamily: theme.fonts.serifBold, fontSize: 20 },
        contentStyle: { backgroundColor: theme.colors.bg },
      }}
    >
      <Stack.Screen name="ProfileHome" component={ProfileScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: "Settings" }} />
    </Stack.Navigator>
  );
}

function TabNavigator() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const tabBarHeight = 60 + insets.bottom;

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          backgroundColor: theme.colors.bg2,
          borderTopColor: theme.colors.border,
          height: tabBarHeight,
          paddingTop: 8,
          paddingBottom: Math.max(insets.bottom, 8),
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textSecondary,
        tabBarIcon: ({ color, focused }) => {
          let icon;
          if (route.name === "Home") {
            icon = focused ? "home" : "home-outline";
          } else if (route.name === "Messages") {
            icon = focused ? "chatbubble" : "chatbubble-outline";
          } else if (route.name === "Profile") {
            icon = focused ? "person" : "person-outline";
          } else {
            icon = "ellipse";
          }
          return <Ionicons name={icon} size={28} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={PeopleNearbyScreen} options={{ title: "Home" }} />
      <Tab.Screen name="Messages" component={MessagesStack} options={{ headerShown: false }} />
      <Tab.Screen name="Profile" component={ProfileStack} options={{ headerShown: false }} />
    </Tab.Navigator>
  );
}

function ThemedStatusBar() {
  const { theme } = useTheme();
  return (
    <StatusBar
      style={theme.colors.statusBar === "light" ? "light" : "dark"}
      backgroundColor="transparent"
      translucent
    />
  );
}

function LoadingScreen() {
  const { theme } = useTheme();
  return (
    <View style={[loadingStyles.container, { backgroundColor: theme.colors.bg }]}>
      <ActivityIndicator size="large" color={theme.colors.accent} />
    </View>
  );
}

const loadingStyles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center" },
});

export default function App() {
  const [session, setSession] = useState(null);
  const [authReady, setAuthReady] = useState(false);

  const [loaded] = useFonts({
    CrimsonPro_600SemiBold,
    CrimsonPro_700Bold,
    Inter_400Regular,
    Inter_500Medium,
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      if (s?.access_token) setAuthToken(s.access_token);
      setAuthReady(true);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, s) => {
        setSession(s);
        if (s?.access_token) {
          setAuthToken(s.access_token);
        } else {
          clearAuthToken();
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  if (!loaded || !authReady) return null;

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <ThemedStatusBar />
        {session ? (
          <FiltersProvider>
            <NavigationContainerWrapper>
              <TabNavigator />
            </NavigationContainerWrapper>
          </FiltersProvider>
        ) : (
          <NavigationContainerWrapper>
            <AuthScreen />
          </NavigationContainerWrapper>
        )}
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

function NavigationContainerWrapper({ children }) {
  const { theme } = useTheme();
  const navTheme = {
    ...DefaultTheme,
    colors: { ...DefaultTheme.colors, background: theme.colors.bg },
  };
  return <NavigationContainer theme={navTheme}>{children}</NavigationContainer>;
}

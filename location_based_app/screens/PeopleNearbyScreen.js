import React, { useState, useEffect, useCallback } from "react";
import { View, FlatList, StyleSheet, Text, ActivityIndicator } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from "@react-navigation/native";
import ScreenHeader from "../components/ScreenHeader";
import PillTabs from "../components/PillTabs";
import PersonCard from "../components/PersonCard";
import RequestsCard from "../components/RequestsCard";
import FilterBar from "../components/FilterBar";
import FilterSheet from "../components/FilterSheet";
import LocationToggle from "../components/LocationToggle";
import { useFilters } from "../context/FiltersContext";
import {
  requestLocationPermission,
  getLocationPermissionStatus,
  getCurrentLocation,
  updateUserLocation,
} from "../services/location";
import { createThread } from "../services/messages";
import { getFriends, getFriendRequests } from "../services/friends";
import { useTheme } from "../theme/ThemeContext";

export default function PeopleNearbyScreen() {
  const { theme } = useTheme();
  const navigation = useNavigation();
  const [tab, setTab] = useState("friends");
  const [filterSheetVisible, setFilterSheetVisible] = useState(false);
  const {
    filters,
    locationState,
    updateLocationState,
    nearbyPeople,
    nearbyLoading,
    refreshNearby,
  } = useFilters();
  const [currentLocation, setCurrentLocation] = useState(null);
  const [friends, setFriends] = useState([]);
  const [friendRequestCount, setFriendRequestCount] = useState(0);
  const [loadingFriends, setLoadingFriends] = useState(true);

  const handleStartConversation = async (person) => {
    try {
      const result = await createThread(person.id);
      navigation.navigate("Chat", {
        threadId: result.id,
        title: person.name,
      });
    } catch (error) {
      console.error("Error starting conversation:", error);
    }
  };

  useEffect(() => {
    checkLocationPermission();
    loadFriends();
  }, []);

  useEffect(() => {
    if (locationState.permission === "granted" && locationState.inRangeSharing) {
      fetchCurrentLocation();
    }
  }, [locationState.permission, locationState.inRangeSharing]);

  const checkLocationPermission = async () => {
    const status = await getLocationPermissionStatus();
    updateLocationState({ permission: status });
  };

  const fetchCurrentLocation = async () => {
    const location = await getCurrentLocation();
    setCurrentLocation(location);
    if (location) {
      try {
        await updateUserLocation(location.latitude, location.longitude);
      } catch (err) {
        console.error("Failed to update location on server:", err);
      }
      refreshNearby();
    }
  };

  const loadFriends = async () => {
    try {
      const [friendsData, requestsData] = await Promise.all([
        getFriends().catch(() => []),
        getFriendRequests().catch(() => []),
      ]);
      setFriends(friendsData ?? []);
      setFriendRequestCount(Array.isArray(requestsData) ? requestsData.length : 0);
    } catch (err) {
      console.error("Failed to load friends:", err);
    } finally {
      setLoadingFriends(false);
    }
  };

  const handleEnableLocation = async () => {
    const status = await requestLocationPermission();
    updateLocationState({ permission: status });
    if (status === "granted") {
      await fetchCurrentLocation();
    }
  };

  const handleToggleInRange = () => {
    if (locationState.permission === "granted") {
      updateLocationState({ inRangeSharing: !locationState.inRangeSharing });
      if (!locationState.inRangeSharing) {
        fetchCurrentLocation();
      }
    }
  };

  const handleReviewRequests = () => {
    console.log("Review requests");
  };

  const canShowList =
    locationState.permission === "granted" && locationState.inRangeSharing;

  const filteredData = tab === "friends" ? friends : nearbyPeople;
  const friendsCount = friends.length;
  const nearbyCount = nearbyPeople.length;
  const isLoading = tab === "friends" ? loadingFriends : nearbyLoading;

  return (
    <View style={[styles.wrap, { backgroundColor: theme.colors.bg }]}>
      <LinearGradient
        colors={["rgba(255,255,255,0.02)", "transparent"]}
        style={{ height: 140, position: "absolute", top: 0, left: 0, right: 0 }}
        pointerEvents="none"
      />
      <ScreenHeader title="Nearby" />
      <View style={{ height: 12 }} />

      <LocationToggle
        permission={locationState.permission}
        inRangeSharing={locationState.inRangeSharing}
        onToggle={handleToggleInRange}
        onEnable={handleEnableLocation}
      />

      <PillTabs
        tabs={[
          { key: "friends", label: "Friends", count: friendsCount },
          { key: "discover", label: "Discover", count: nearbyCount },
        ]}
        active={tab}
        onChange={(key) => setTab(key === "discover" ? "discover" : "friends")}
      />

      {tab === "discover" && (
        <FilterBar onOpen={() => setFilterSheetVisible(true)} />
      )}

      {isLoading && canShowList ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={theme.colors.accent} />
        </View>
      ) : (
        <FlatList
          data={canShowList ? filteredData : []}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          contentInsetAdjustmentBehavior="automatic"
          ListHeaderComponent={
            tab === "friends" ? (
              <RequestsCard
                count={friendRequestCount}
                onReview={handleReviewRequests}
              />
            ) : null
          }
          renderItem={({ item }) => (
            <PersonCard
              name={item.name}
              bio={item.bio}
              onAdd={() => handleStartConversation(item)}
              isFriend={item.isFriend}
              inRange={item.inRange}
              distanceKm={item.distanceKm}
              showDistance={tab === "friends"}
            />
          )}
          ListEmptyComponent={
            <Text
              style={[
                styles.empty,
                { fontFamily: theme.fonts.serif, color: theme.colors.textSecondary },
              ]}
            >
              {canShowList
                ? "No one around right now"
                : "Enable location sharing to see people nearby"}
            </Text>
          }
        />
      )}

      <FilterSheet
        visible={filterSheetVisible}
        onClose={() => setFilterSheetVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  listContent: {
    paddingTop: 16,
    paddingBottom: 20,
  },
  empty: {
    textAlign: "center",
    marginTop: 40,
  },
});

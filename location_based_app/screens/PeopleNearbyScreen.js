import React, { useState, useEffect } from "react";
import { View, FlatList, StyleSheet, Text, Pressable } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
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
  getCurrentLocation
} from "../services/location";
import { useTheme } from "../theme/ThemeContext";
import { getMessageService } from "../services/messages";
import { NEARBY, FRIENDS, FRIEND_REQUESTS_COUNT } from "../seed";

const CURRENT_USER = "demo-user"; // TODO: wire to auth
const messageService = getMessageService();

export default function PeopleNearbyScreen() {
  const { theme } = useTheme();
  const navigation = useNavigation();
  const [tab, setTab] = useState("friends");
  const [filterSheetVisible, setFilterSheetVisible] = useState(false);
  const { filters, locationState, updateLocationState } = useFilters();
  const [currentLocation, setCurrentLocation] = useState(null);

  const handleStartConversation = async (person) => {
    try {
      // Create or get thread with this person
      const otherUserId = person.id || `user-${person.name.toLowerCase().replace(/\s+/g, '-')}`;
      const threadId = await messageService.createOrGetDM(CURRENT_USER, otherUserId);
      navigation.navigate("Chat", {
        threadId,
        title: person.name,
      });
    } catch (error) {
      console.error("Error starting conversation:", error);
    }
  };


  // Check location permission on mount
  useEffect(() => {
    checkLocationPermission();
  }, []);

  // Get location when permission granted and sharing enabled
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
    // In production, this would trigger a server request to update user's location
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
    // TODO: Open modal/sheet with friend requests
    console.log("Review requests");
  };

  // Filter data based on location and filters
  const filterByLocation = (people) => {
    if (locationState.permission !== "granted" || !locationState.inRangeSharing) {
      return [];
    }
    return people.filter((person) => {
      // Filter by radius
      if (person.distanceKm && person.distanceKm > filters.radiusKm) return false;
      // In production: filter by interests and age from server data
      return true;
    });
  };

  const friendsInRange = filterByLocation(FRIENDS);
  const nearbyInRange = filterByLocation(NEARBY);

  const filteredData = tab === "friends" ? friendsInRange : nearbyInRange;
  const friendsCount = friendsInRange.length;
  const nearbyCount = nearbyInRange.length;

  const canShowList =
    locationState.permission === "granted" && locationState.inRangeSharing;

  const headerRight = null;

  return (
    <View style={[styles.wrap, { backgroundColor: theme.colors.bg }]}>
      <LinearGradient
        colors={["rgba(255,255,255,0.02)", "transparent"]}
        style={{ height: 140, position: "absolute", top: 0, left: 0, right: 0 }}
        pointerEvents="none"
      />
      <ScreenHeader title="Nearby" right={headerRight} />
      <View style={{ height: 12 }} />
      
      {/* Location Toggle - First thing users see */}
      <LocationToggle
        permission={locationState.permission}
        inRangeSharing={locationState.inRangeSharing}
        onToggle={handleToggleInRange}
        onEnable={handleEnableLocation}
      />

      <PillTabs
        tabs={[
          { key: "friends", label: "Friends", count: friendsCount },
          { key: "discover", label: "Discover", count: nearbyCount }
        ]}
        active={tab}
        onChange={(key) => setTab(key === "discover" ? "discover" : "friends")}
      />

      {/* FilterBar - Only show in Discover tab */}
      {tab === "discover" && (
        <FilterBar onOpen={() => setFilterSheetVisible(true)} />
      )}

      <FlatList
        data={canShowList ? filteredData : []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        contentInsetAdjustmentBehavior="automatic"
        ListHeaderComponent={
          tab === "friends" ? (
            <RequestsCard
              count={FRIEND_REQUESTS_COUNT}
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
          <Text style={[styles.empty, { fontFamily: theme.fonts.serif, color: theme.colors.textSecondary }]}>
            {canShowList
              ? "No one around right now"
              : "Enable location sharing to see people nearby"}
          </Text>
        }
      />

      <FilterSheet
        visible={filterSheetVisible}
        onClose={() => setFilterSheetVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  headerActions: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center"
  },
  headerButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center"
  },
  bannerContainer: {
    flex: 1,
    justifyContent: "center"
  },
  listContent: {
    paddingTop: 16,
    paddingBottom: 20
  },
  empty: {
    textAlign: "center",
    marginTop: 40
  }
});

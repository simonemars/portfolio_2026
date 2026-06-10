import * as Location from "expo-location";
import { post } from "./api";

export async function requestLocationPermission() {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    return status === "granted" ? "granted" : "denied";
  } catch (error) {
    console.error("Error requesting location permission:", error);
    return "denied";
  }
}

export async function getLocationPermissionStatus() {
  try {
    const { status } = await Location.getForegroundPermissionsAsync();
    if (status === "granted") return "granted";
    if (status === "denied") return "denied";
    return "unknown";
  } catch (error) {
    console.error("Error getting location permission:", error);
    return "unknown";
  }
}

export async function getCurrentLocation() {
  try {
    const permission = await getLocationPermissionStatus();
    if (permission !== "granted") return null;

    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    return {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    };
  } catch (error) {
    console.error("Error getting current location:", error);
    return null;
  }
}

/**
 * Single call: sends current coords + filters, server updates location
 * and returns nearby users with only public data + rounded distance.
 */
export async function discoverNearby(latitude, longitude, radiusKm, minAge, maxAge) {
  return post("/api/discover", {
    latitude,
    longitude,
    radius_km: radiusKm,
    min_age: minAge,
    max_age: maxAge,
  });
}

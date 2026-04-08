import * as Location from "expo-location";
import { post, get } from "./api";

export function distanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(degrees) {
  return (degrees * Math.PI) / 180;
}

export function isInRange(userA, userB, radiusKm) {
  if (!userA.coords || !userB.coords) return false;
  const distance = distanceKm(
    userA.coords.latitude,
    userA.coords.longitude,
    userB.coords.latitude,
    userB.coords.longitude
  );
  return distance <= radiusKm;
}

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

export async function updateUserLocation(lat, lng) {
  return post("/api/users/me/location", { latitude: lat, longitude: lng });
}

export async function getNearbyPeople(radius, minAge, maxAge) {
  const params = new URLSearchParams({
    radius: String(radius),
    minAge: String(minAge),
    maxAge: String(maxAge),
  });
  return get(`/api/discover?${params}`);
}

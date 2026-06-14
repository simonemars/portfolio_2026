import { Alert } from "react-native";
import * as ImagePicker from "expo-image-picker";

/**
 * Opens the native image picker, lets the user crop a square, and returns the
 * chosen image as a base64 data URI (data:image/...;base64,...) so it can be
 * stored directly via PUT /api/me. Returns null if the user cancels or denies
 * permission.
 */
export async function pickAvatar() {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) {
    Alert.alert(
      "Photo access needed",
      "Please allow photo access to set a profile picture."
    );
    return null;
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.5,
    base64: true,
  });

  if (result.canceled || !result.assets?.length) return null;

  const asset = result.assets[0];
  if (!asset.base64) return asset.uri ?? null;
  const mime = asset.mimeType || "image/jpeg";
  return `data:${mime};base64,${asset.base64}`;
}

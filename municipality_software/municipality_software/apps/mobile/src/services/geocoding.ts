import * as ExpoLocation from 'expo-location';

export interface LocationCoords {
  latitude: number;
  longitude: number;
}

export const reverseGeocode = async (location: LocationCoords): Promise<string> => {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${location.latitude}&lon=${location.longitude}&zoom=18&addressdetails=1`
    );
    
    if (!response.ok) {
      throw new Error('Geocoding request failed');
    }
    
    const data = await response.json();
    
    if (data.display_name) {
      // Extract the most relevant part of the address
      const addressParts = data.display_name.split(', ');
      return addressParts.slice(0, 3).join(', '); // Take first 3 parts for brevity
    }
    
    return 'Unknown location';
  } catch (error) {
    console.error('Geocoding error:', error);
    return 'Unknown location';
  }
};

export const getCurrentLocation = async (): Promise<LocationCoords> => {
  try {
    // Request permissions
    const { status } = await ExpoLocation.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      throw new Error('Location permission denied');
    }

    // Get current position
    const location = await ExpoLocation.getCurrentPositionAsync({
      accuracy: ExpoLocation.Accuracy.High,
    });

    return {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    };
  } catch (error) {
    console.error('Location error:', error);
    throw error;
  }
}; 
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert, ScrollView, Image, Dimensions } from 'react-native';
import { TextInput, Button, Text, Switch, Surface, IconButton, Portal, Modal } from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import MapView, { Marker } from 'react-native-maps';
import { useAuth } from '../hooks/useAuth';
import { createReport, uploadImage, updateReportPhotos } from '../services/reports';
import { reverseGeocode, LocationCoords } from '../services/geocoding';
import { theme, shadows } from '../theme';

const { width, height } = Dimensions.get('window');

export default function NewReportScreen({ navigation }: any) {
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [photos, setPhotos] = useState<string[]>([]);
  const [location, setLocation] = useState<LocationCoords | null>(null);
  const [addressText, setAddressText] = useState('');
  const [loading, setLoading] = useState(false);
  const [mapModalVisible, setMapModalVisible] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<LocationCoords | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    getCurrentLocation();
  }, []);

  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Location permission is required to create reports');
        return;
      }

      const currentLocation = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = currentLocation.coords;
      const newLocation = { latitude, longitude };
      setLocation(newLocation);
      setSelectedLocation(newLocation);

      // Reverse geocode the location
      const address = await reverseGeocode(newLocation);
      setAddressText(address);
    } catch (error) {
      Alert.alert('Error', 'Failed to get current location');
    }
  };

  const handleMapPress = (event: any) => {
    const { latitude, longitude } = event.nativeEvent.coordinate;
    setSelectedLocation({ latitude, longitude });
  };

  const confirmLocation = async () => {
    if (selectedLocation) {
      setLocation(selectedLocation);
      const address = await reverseGeocode(selectedLocation);
      setAddressText(address);
      setMapModalVisible(false);
    }
  };

  const pickImage = async () => {
    if (photos.length >= 3) {
      Alert.alert('Limit reached', 'You can only upload up to 3 photos');
      return;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setPhotos([...photos, result.assets[0].uri]);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const takePhoto = async () => {
    if (photos.length >= 3) {
      Alert.alert('Limit reached', 'You can only upload up to 3 photos');
      return;
    }

    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Camera permission is required to take photos');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setPhotos([...photos, result.assets[0].uri]);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  const removePhoto = (index: number) => {
    setPhotos(photos.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!description.trim()) {
      Alert.alert('Error', 'Please enter a description');
      return;
    }

    if (!location) {
      Alert.alert('Error', 'Location is required');
      return;
    }

    if (!user) {
      Alert.alert('Error', 'You must be logged in to create a report');
      return;
    }

    setLoading(true);
    try {
      console.log('Creating report with data:', { description, location, addressText, isPublic, userId: user.uid });
      
      // Create the report first
      const reportData = {
        description: description.trim(),
        photoUrls: [],
        location,
        addressText,
        isPublic,
        userId: user.uid,
      };

      const reportId = await createReport(reportData, user.uid);
      console.log('Report created with ID:', reportId);

      // Upload photos if any
      if (photos.length > 0) {
        const photoUrls = [];
        for (let i = 0; i < photos.length; i++) {
          const photoUrl = await uploadImage(photos[i], reportId, i);
          photoUrls.push(photoUrl);
        }
        console.log('Photos uploaded:', photoUrls);
        // Update the report with photo URLs
        await updateReportPhotos(reportId, photoUrls);
        console.log('Report updated with photo URLs');
      }

      Alert.alert('Success', 'Report created successfully', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      console.error('Error creating report:', error);
      Alert.alert('Error', `Failed to create report: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView 
      style={styles.container}
      contentInsetAdjustmentBehavior="never"
    >
      <Surface style={styles.surface}>
        <Text variant="headlineSmall" style={styles.title}>
          Report an Issue
        </Text>

        <TextInput
          label="Description"
          value={description}
          onChangeText={setDescription}
          mode="outlined"
          style={styles.input}
          multiline
          numberOfLines={3}
          maxLength={280}
          textColor={theme.colors.onSurface}
          outlineColor={theme.colors.outline}
          activeOutlineColor={theme.colors.primary}
          theme={{ colors: { background: theme.colors.background } }}
        />

        <View style={styles.locationContainer}>
          <Text variant="bodyMedium" style={styles.locationText}>{addressText || 'Getting location...'}</Text>
          <View style={styles.locationButtons}>
            <Button 
              mode="outlined" 
              onPress={getCurrentLocation} 
              style={styles.locationButton}
              textColor={theme.colors.onSurface}
            >
              Refresh
            </Button>
            <Button 
              mode="outlined" 
              onPress={() => setMapModalVisible(true)} 
              style={styles.locationButton}
              textColor={theme.colors.onSurface}
            >
              Change Location
            </Button>
          </View>
        </View>

        <View style={styles.photoSection}>
          <Text variant="bodyMedium" style={styles.sectionTitle}>
            Photos ({photos.length}/3)
          </Text>
          <View style={styles.photoButtons}>
            <Button 
              mode="outlined" 
              onPress={pickImage} 
              style={styles.photoButton}
              textColor={theme.colors.onSurface}
            >
              Pick Photo
            </Button>
            <Button 
              mode="outlined" 
              onPress={takePhoto} 
              style={styles.photoButton}
              textColor={theme.colors.onSurface}
            >
              Take Photo
            </Button>
          </View>
          <View style={styles.photoGrid}>
            {photos.map((photo, index) => (
              <View key={index} style={styles.photoContainer}>
                <Image source={{ uri: photo }} style={styles.photo} />
                <IconButton
                  icon="close"
                  size={20}
                  onPress={() => removePhoto(index)}
                  style={styles.removeButton}
                  iconColor={theme.colors.error}
                />
              </View>
            ))}
          </View>
        </View>

        <View style={styles.switchContainer}>
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurface }}>Make this report public</Text>
          <Switch value={isPublic} onValueChange={setIsPublic} color={theme.colors.onSurface} />
        </View>

        <Button
          mode="outlined"
          onPress={handleSubmit}
          style={styles.submitButton}
          loading={loading}
          disabled={loading}
          textColor={theme.colors.onSurface}
        >
          Submit Report
        </Button>
      </Surface>

      <Portal>
        <Modal
          visible={mapModalVisible}
          onDismiss={() => setMapModalVisible(false)}
          contentContainerStyle={styles.mapModalContainer}
        >
          <View style={styles.mapModalContent}>
            <Text variant="headlineSmall" style={styles.mapModalTitle}>
              Select Location
            </Text>
            <Text variant="bodyMedium" style={styles.mapModalSubtitle}>
              Tap on the map to change the location
            </Text>
            <MapView
              style={styles.map}
              initialRegion={{
                latitude: location?.latitude || 44.8666,
                longitude: location?.longitude || 13.8496,
                latitudeDelta: 0.0922,
                longitudeDelta: 0.0421,
              }}
              onPress={handleMapPress}
              userInterfaceStyle="dark"
            >
              {selectedLocation && (
                <Marker
                  coordinate={selectedLocation}
                  title="Selected Location"
                  description="Tap to confirm this location"
                  pinColor="red"
                />
              )}
            </MapView>
            <View style={styles.mapModalButtons}>
              <Button mode="outlined" onPress={() => setMapModalVisible(false)} textColor={theme.colors.onSurface}>
                Cancel
              </Button>
              <Button 
                mode="outlined" 
                onPress={confirmLocation} 
                disabled={!selectedLocation} 
                textColor={theme.colors.onSurface}
                style={{ borderColor: theme.colors.outline }}
              >
                Confirm Location
              </Button>
            </View>
          </View>
        </Modal>
      </Portal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  surface: {
    margin: 16,
    padding: 16,
    borderRadius: 16,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.outline,
    ...shadows.card,
  },
  title: {
    marginBottom: 16,
    textAlign: 'center',
    color: theme.colors.onSurface,
  },
  input: {
    marginBottom: 16,
    backgroundColor: theme.colors.background,
  },
  locationContainer: {
    marginBottom: 16,
    padding: 16,
    backgroundColor: theme.colors.secondary,
    borderRadius: 12,
  },
  locationText: {
    marginBottom: 16,
    lineHeight: 20,
    fontWeight: '500',
    color: theme.colors.onSurface,
  },
  locationButtons: {
    flexDirection: 'column',
    marginTop: 8,
  },
  locationButton: {
    height: 44,
    marginBottom: 12,
    borderColor: theme.colors.outline,
  },
  photoSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    marginBottom: 8,
    color: theme.colors.onSurface,
  },
  photoButtons: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  photoButton: {
    flex: 1,
    marginHorizontal: 4,
    borderColor: theme.colors.outline,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  photoContainer: {
    position: 'relative',
    marginRight: 8,
    marginBottom: 8,
  },
  photo: {
    width: 100,
    height: 100,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.outline,
  },
  removeButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.outline,
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: theme.colors.outline,
    borderRadius: 12,
  },
  submitButton: {
    marginTop: 8,
    borderColor: theme.colors.outline,
  },
  mapModalContainer: {
    backgroundColor: theme.colors.surface,
    margin: 20,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.colors.outline,
  },
  mapModalContent: {
    padding: 16,
  },
  mapModalTitle: {
    textAlign: 'center',
    marginBottom: 8,
    color: theme.colors.onSurface,
  },
  mapModalSubtitle: {
    textAlign: 'center',
    marginBottom: 16,
    color: theme.colors.placeholder,
  },
  map: {
    width: width - 72,
    height: height * 0.6,
    marginBottom: 16,
    borderRadius: 8,
  },
  mapModalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
}); 
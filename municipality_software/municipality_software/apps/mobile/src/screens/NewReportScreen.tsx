import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert, ScrollView, Image } from 'react-native';
import { TextInput, Button, Text, Switch, Surface, IconButton } from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { useAuth } from '../hooks/useAuth';
import { createReport, uploadImage } from '../services/reports';
import { reverseGeocode, LocationCoords } from '../services/geocoding';

export default function NewReportScreen({ navigation }: any) {
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [photos, setPhotos] = useState<string[]>([]);
  const [location, setLocation] = useState<LocationCoords | null>(null);
  const [addressText, setAddressText] = useState('');
  const [loading, setLoading] = useState(false);
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
      setLocation({ latitude, longitude });

      // Reverse geocode the location
      const address = await reverseGeocode({ latitude, longitude });
      setAddressText(address);
    } catch (error) {
      Alert.alert('Error', 'Failed to get current location');
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
        userId: user.uid, // Add userId to match the Report interface
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
        // This would typically be done in the Cloud Function
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
    <ScrollView style={styles.container}>
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
        />

        <View style={styles.locationContainer}>
          <Text variant="bodyMedium">📍 {addressText || 'Getting location...'}</Text>
          <Button mode="text" onPress={getCurrentLocation}>
            Refresh Location
          </Button>
        </View>

        <View style={styles.photoSection}>
          <Text variant="bodyMedium" style={styles.sectionTitle}>
            Photos ({photos.length}/3)
          </Text>
          <View style={styles.photoButtons}>
            <Button mode="outlined" onPress={pickImage} style={styles.photoButton}>
              📷 Pick Photo
            </Button>
            <Button mode="outlined" onPress={takePhoto} style={styles.photoButton}>
              📸 Take Photo
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
                />
              </View>
            ))}
          </View>
        </View>

        <View style={styles.switchContainer}>
          <Text variant="bodyMedium">Make this report public</Text>
          <Switch value={isPublic} onValueChange={setIsPublic} />
        </View>

        <Button
          mode="contained"
          onPress={handleSubmit}
          style={styles.submitButton}
          loading={loading}
          disabled={loading}
        >
          Submit Report
        </Button>
      </Surface>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  surface: {
    margin: 16,
    padding: 16,
    borderRadius: 8,
  },
  title: {
    marginBottom: 16,
    textAlign: 'center',
  },
  input: {
    marginBottom: 16,
  },
  locationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
  },
  photoSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    marginBottom: 8,
  },
  photoButtons: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  photoButton: {
    flex: 1,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  photoContainer: {
    position: 'relative',
  },
  photo: {
    width: 100,
    height: 100,
    borderRadius: 8,
  },
  removeButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: 'white',
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  submitButton: {
    marginTop: 8,
  },
}); 
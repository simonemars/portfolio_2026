# Municipality Reporter App

A React Native mobile application that allows residents to photograph and report problems around town (potholes, broken streetlights, trash, etc.) and send them to the municipality.

## 🚀 Features

- **Email-based authentication** with Firebase Auth
- **Create reports** with photos, GPS location, and descriptions
- **Public vs. private reports** with visibility controls
- **Community voting** on public reports (one vote per user)
- **AI urgency scoring** based on upvotes and report data
- **Push notifications** for status updates
- **Interactive map** showing all public reports
- **Admin dashboard** for municipality staff
- **GDPR-compliant data deletion**

## 🛠 Tech Stack

### Frontend
- **React Native** with Expo SDK 50+
- **TypeScript** for type safety
- **React Navigation v7** for navigation
- **React Native Paper** for UI components
- **React Hook Form** with Zod validation
- **Zustand** for state management
- **React Native Maps** for map functionality
- **Expo modules** (ImagePicker, Location, Camera, Notifications)

### Backend (Firebase)
- **Firebase Authentication** (email/password)
- **Firestore** for data storage
- **Firebase Storage** for photo uploads
- **Firebase Cloud Functions** for server-side logic
- **Firebase Cloud Messaging** for push notifications

## 📱 Project Structure

```
municipality_software/
├── apps/
│   └── mobile/                 # React Native app
│       ├── App.tsx
│       ├── app.json
│       ├── src/
│       │   ├── components/     # Reusable components
│       │   ├── screens/        # App screens
│       │   ├── services/       # Firebase services
│       │   ├── hooks/          # Custom hooks
│       │   ├── store/          # Zustand stores
│       │   ├── types/          # TypeScript types
│       │   └── navigation/     # Navigation setup
│       └── tests/              # Test files
├── functions/                  # Firebase Cloud Functions
│   ├── src/
│   │   └── index.ts           # Cloud Functions
│   └── package.json
└── README.md
```

## 🚀 Getting Started

### Prerequisites

- **Node.js** >= 18
- **npm** or **yarn**
- **Expo CLI**: `npm install -g expo-cli`
- **Firebase CLI**: `npm install -g firebase-tools`
- **iOS Simulator** (macOS) or **Android Emulator**

### 1. Clone and Setup

```bash
# Clone the repository
git clone <repository-url>
cd municipality_software

# Install dependencies
cd apps/mobile
npm install

cd ../../functions
npm install
```

### 2. Firebase Setup

1. **Create a Firebase project** at [Firebase Console](https://console.firebase.google.com)

2. **Enable required services**:
   - Authentication (Email/Password)
   - Cloud Firestore
   - Cloud Storage
   - Cloud Functions
   - Cloud Messaging

3. **Get Firebase config**:
   - Go to Project Settings → Your apps → Web app
   - Copy the config object

4. **Configure environment**:
   ```bash
   cd apps/mobile
   cp .env.example .env
   # Edit .env with your Firebase config
   ```

### 3. Firebase CLI Setup

```bash
# Login to Firebase
firebase login

# Initialize Firebase in the project
firebase init

# Select your project and enable:
# - Firestore
# - Functions
# - Storage
```

### 4. Deploy Cloud Functions

```bash
cd functions
npm run build
firebase deploy --only functions
```

### 5. Run the App

```bash
cd apps/mobile
npm start

# Press 'i' for iOS Simulator
# Press 'a' for Android Emulator
# Scan QR code with Expo Go app
```

## 📊 Data Model

### Users Collection
```typescript
{
  uid: string;           // Firebase Auth UID
  email: string;
  displayName: string | null;
  role: "user" | "admin";
  pushToken?: string;    // For notifications
  createdAt: Date;
}
```

### Reports Collection
```typescript
{
  id: string;            // Document ID
  authorId: string;      // User UID
  description: string;   // Max 280 chars
  photoUrls: string[];   // Storage URLs
  location: GeoPoint;    // GPS coordinates
  addressText: string;   // Reverse-geocoded
  isPublic: boolean;
  upvotes: number;
  voters: string[];      // User UIDs who voted
  aiScore: number;       // 0-100 urgency score
  status: "new" | "in_progress" | "resolved";
  createdAt: Date;
  updatedAt: Date;
}
```

## 🔧 Development

### Available Scripts

```bash
# Mobile app
npm start          # Start Expo dev server
npm run android    # Run on Android
npm run ios        # Run on iOS
npm run test       # Run tests

# Cloud Functions
npm run build      # Build TypeScript
npm run serve      # Local emulator
npm run deploy     # Deploy to Firebase
```

### Testing

```bash
# Run all tests
npm test

# Run specific test files
npm test auth.test.tsx
npm test reportCreation.test.tsx
```

### Code Quality

- **ESLint** for code linting
- **Prettier** for code formatting
- **TypeScript** for type checking
- **Husky** for pre-commit hooks

## 🔐 Security Rules

### Firestore Rules
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can read/write their own profile
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Public reports are readable by all, writable by author
    match /reports/{reportId} {
      allow read: if resource.data.isPublic == true || 
                     request.auth != null && request.auth.uid == resource.data.authorId;
      allow create: if request.auth != null;
      allow update, delete: if request.auth != null && 
                               request.auth.uid == resource.data.authorId;
    }
  }
}
```

## 📱 Building for Production

### Expo Build

```bash
# Install EAS CLI
npm install -g @expo/eas-cli

# Configure build
eas build:configure

# Build for platforms
eas build --platform ios
eas build --platform android
```

### Environment Variables

Create `.env` file in `apps/mobile/`:
```env
FIREBASE_API_KEY=your_api_key
FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_STORAGE_BUCKET=your_project.appspot.com
FIREBASE_MESSAGING_SENDER_ID=your_sender_id
FIREBASE_APP_ID=your_app_id
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support, email support@municipality-reporter.com or create an issue in the repository.

## 🔄 Changelog

### v1.0.0
- Initial MVP release
- Basic report creation and viewing
- Authentication system
- Map integration
- Cloud Functions for voting and notifications 


maps api key: AIzaSyBdpP41yHt1lHzdDEDSav6lNBKme3t3ZL0
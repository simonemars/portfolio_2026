# Municipality Reporter - High-End Minimalist UI Update

## Design Philosophy: Forest Depth (Skeuomorphic Minimalism)
This update implements a "Skeuomorphic Minimalist" aesthetic, utilizing real-world lighting and depth while stripping away unnecessary details. The design focuses on a "Forest Depth" color palette.

### 1. Color Palette
- **Primary Background**: `#0F1A13` (Deep Forest)
- **Sidebar/Secondary**: `#16261C` (Lighter Forest)
- **Accent/Card Surface**: `#1E2E23` (Leaf Green)
- **Text**: `#FFFFFF` (White)
- **Muted Text**: `rgba(255, 255, 255, 0.4)`
- **Borders**: `rgba(255, 255, 255, 0.1)`

### 2. Typography
- **Font**: System Bold (Inter-like)
- **Headings**: Uppercase, tracked out for elegance.
- **Body**: Generous line height for readability.

### 3. Key UI Features
- **Floating Shadows**: Custom shadow implementation to make cards feel like they are hovering.
- **Glassmorphism**: Subtle use of transparency and blur (where supported).
- **Soft Glow**: Delicate borders to simulate lighting.

## Technical Changes
- **Theme Engine**: Centralized theme definition in `src/theme.ts`.
- **Components**: Updated `ReportCard` to be the primary UI component with the new style.
- **Screens**: Overhauled all screens (`Home`, `MyReports`, `AdminDashboard`, `NewReport`, `Settings`, `Auth`) to use the new theme and layout patterns.
- **Navigation**: Customized React Navigation headers and tab bars to blend seamlessly with the dark theme.

## Usage
The app now defaults to this dark, high-contrast theme. No additional configuration is required.


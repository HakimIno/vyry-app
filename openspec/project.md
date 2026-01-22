# Project Context

## Purpose
Vyry is a React Native mobile application that serves as a client for the chat-rs backend system. It provides a secure, encrypted messaging experience with Signal Protocol integration, featuring user authentication, PIN security, and real-time messaging capabilities.

## Tech Stack
- **React Native 0.81.5** - Mobile application framework
- **Expo SDK 54** - Development platform and tooling
- **Expo Router 6** - File-based routing system
- **TypeScript 5.9** - Type-safe JavaScript
- **React Navigation 7** - Navigation library with bottom tabs
- **React Native Reanimated 4** - Animation library
- **React Native Skia 2.2.12** - Graphics and 2D rendering
- **Shopify Flash List 2.0.2** - High-performance list component
- **Expo Secure Store 15** - Secure key-value storage
- **Expo Fonts 14** - Font loading and management (Roboto)
- **Bun** - Package manager

## Project Conventions

### Code Style
- TypeScript strict mode enabled
- Functional components with hooks
- Context API for state management
- Path aliases with `@/` prefix
- Component files in camelCase
- Constants in constants/ directory
- UI components in components/ui/ directory
- Feature modules in features/ directory
- Custom hooks in hooks/ directory

### Architecture Patterns
- **Feature-based architecture** - Code organized by features (auth, etc.)
- **Domain-driven design** - Business logic separated from UI
- **Provider pattern** - Context providers for global state
- **File-based routing** - Routes defined by file structure in app/ directory
- **Secure storage** - Sensitive data stored in SecureStore
- **Mock mode** - Development mock mode for authentication

### Testing Strategy
- No testing framework currently implemented
- Manual testing through Expo development builds
- Mock authentication mode for development

### Git Workflow
- No specific branching strategy documented yet

## Domain Context
- **Authentication flow**: Phone number → OTP verification → PIN setup → Profile setup
- **Device management**: Each device has unique UUID stored securely
- **Security**: PIN-based security with optional verification
- **Navigation**: Tab-based navigation with protected routes
- **State management**: React Context for authentication state

## Important Constraints
- **Mock authentication mode**: Currently using `USE_AUTH_MOCK = true` for development
- **Mobile-first design**: UI optimized for touch interfaces
- **Secure data storage**: Tokens and sensitive data in SecureStore
- **Expo limitations**: Must work within Expo managed workflow constraints

## External Dependencies
- **chat-rs backend API**: Rust-based chat server (not yet integrated)
- **Signal Protocol**: End-to-end encryption for messages
- **Firebase Cloud Messaging (FCM)** / **Apple Push Notification Service (APNS)**: Push notifications (planned)
- **Expo services**: Development builds, OTA updates

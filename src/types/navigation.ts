import { NavigatorScreenParams } from '@react-navigation/native';

export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  Main: NavigatorScreenParams<MainTabParamList>;
  Chat: {
    userId: string;
    receiverName: string;
    lastSeen?: string;
  };
  Profile: {
    userId: string;
  };
  ForgotPassword: undefined;
  ResetPassword: { email: string };
  // ... existing code ...
};

export type MainTabParamList = {
  Home: undefined;
  Friends: undefined;
  Settings: undefined;
}; 
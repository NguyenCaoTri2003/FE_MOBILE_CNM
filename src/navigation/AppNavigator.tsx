import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import MessagesScreen from '../screens/MessagesScreen';
import ContactsScreen from '../screens/ContactsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import DiaryScreen from '../screens/DiaryScreen';
import DetailedProfileScreen from '../screens/DetailedProfileScreen';
import DiscoveryScreen from '../screens/DiscoveryScreen';

export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  Messages: undefined;
  Contacts: undefined;
  Profile: undefined;
  DetailedProfile: undefined;
  Diary: undefined;
  Chat: { chatId: string };
  ForgotPassword: undefined;
  Discovery: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const AppNavigator = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Login"
        screenOptions={{
          headerShown: false,
        }}
      >
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />
        <Stack.Screen 
          name="Messages" 
          component={MessagesScreen}
        />
        <Stack.Screen 
          name="Contacts" 
          component={ContactsScreen}
        />
        <Stack.Screen 
          name="Profile" 
          component={ProfileScreen}
        />
        <Stack.Screen 
          name="DetailedProfile" 
          component={DetailedProfileScreen}
        />
        <Stack.Screen 
          name="Diary" 
          component={DiaryScreen}
        />
        <Stack.Screen 
          name="Discovery" 
          component={DiscoveryScreen}
        />
        <Stack.Screen 
          name="ForgotPassword" 
          component={LoginScreen} // Tạm thời sử dụng LoginScreen, sau này sẽ tạo ForgotPasswordScreen
          options={{
            headerShown: true,
            headerTitle: 'Forgot Password',
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator; 
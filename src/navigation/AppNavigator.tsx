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
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';
import ResetPasswordScreen from '../screens/ResetPasswordScreen';
import ChangePasswordScreen from '../screens/ChangePasswordScreen';
import FriendRequestsScreen from '../screens/FriendRequestsScreen';
import ChatScreen from '../screens/ChatScreen';
import CreateGroupScreen from '../screens/CreateGroupScreen';
import ChatGroupScreen from '../screens/ChatGroupScreen';
import GroupInfoScreen  from '../screens/GroupInfoScreen';

export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  Messages: undefined;
  Contacts: undefined;
  Profile: undefined;
  DetailedProfile: undefined;
  Diary: undefined;
  Discovery: undefined;
  Chat: {
    fullName: string;
    avatar: string;
    receiverEmail: string;
    lastSeen?: string;
  };
  ChatGroup: {
    groupId: string;
    groupName: string;
    avatar: string;
  };
  CreateGroup: undefined;
  GroupInfo: {
    groupId: string;
    groupName: string;
    avatar: string;
  };
  AddMembers: {
    groupId: string;
  };
  RemoveMembers: {
    groupId: string;
  };
  LeaveGroup: {
    groupId: string;
  };
  DeleteGroup: {
    groupId: string;
  };
  ForgotPassword: undefined;
  ResetPassword: { email: string };
  ChangePassword: undefined;
  FriendRequests: undefined;
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
        <Stack.Screen 
          name="Login" 
          component={LoginScreen}
        />
        <Stack.Screen 
          name="Register" 
          component={RegisterScreen}
        />
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
          component={ForgotPasswordScreen}
        />
        <Stack.Screen 
          name="ResetPassword" 
          component={ResetPasswordScreen}
        />
        <Stack.Screen 
          name="ChangePassword" 
          component={ChangePasswordScreen}
        />
        <Stack.Screen
          name="FriendRequests"
          component={FriendRequestsScreen}
          options={{
            title: 'Lời mời kết bạn',
            headerStyle: {
              backgroundColor: '#0068ff',
            },
            headerTintColor: '#fff',
            headerTitleStyle: {
              fontWeight: 'bold',
            },
          }}
        />
        <Stack.Screen
          name="Chat"
          component={ChatScreen}
        />
        <Stack.Screen
          name="CreateGroup"
          component={CreateGroupScreen}
        />
        <Stack.Screen 
          name="ChatGroup" 
          component={ChatGroupScreen}
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen 
           name="GroupInfo" 
           component={GroupInfoScreen}
           options={{
             headerShown: false,
           }}
         />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator; 
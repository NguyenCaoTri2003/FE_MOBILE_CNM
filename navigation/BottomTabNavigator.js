import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { NavigationContainer } from "@react-navigation/native";
import { StyleSheet } from "react-native";
import Icon from "react-native-vector-icons/FontAwesome";
import { createStackNavigator } from "@react-navigation/stack"
import HomeScreen from "../screens/HomeScreen";
import ContactsScreen from "../screens/ContactsScreen";
import NewsScreen from "../screens/NewsScreen";
import ProfileScreen from "../screens/ProfileScreen";
import HomeScreenHeader from "../components/HomeHeader";
import ContactsHeader from "../components/ContactsHeader";
import NewsHeader from "../components/NewsHeader";
import ProfileHeader from "../components/ProfileHeader";
import ProfileDetailScreen from "../screens/ProfileDetailScreen";
import SettingScreen from "../screens/SettingScreen";
import EditProfileScreen from "../screens/EditProfileScreen";
import EditProfileFormScreen from "../screens/EditProfileFormScreen";
import ChangeAvatarScreen from "../screens/ChangeAvatarScreen";
import ChangeCoverScreen from "../screens/ChangeCoverScreen";
import UpdateBioScreen from "../screens/UpdateBioScreen";
import FriendRequestsScreen from "../screens/FriendRequestsScreen";
import SentRequestsScreen from "../screens/SentRequestsScreen";

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

const ProfileStack = () => (
  <Stack.Navigator>
    <Stack.Screen name="Profile" component={ProfileScreen} options={{ header: () => <ProfileHeader /> }} />
    <Stack.Screen name="ProfileDetail" component={ProfileDetailScreen} options={{ headerShown: false }} />
    <Stack.Screen name="SettingScreen" component={SettingScreen} options={{ headerShown: false }}/>
    <Stack.Screen name="EditProfileScreen" component={EditProfileScreen} options={{ headerShown: false }}/>
    <Stack.Screen name="EditProfileFormScreen" component={EditProfileFormScreen} options={{ headerShown: false }}/>
    <Stack.Screen name="ChangeAvatarScreen" component={ChangeAvatarScreen} options={{ headerShown: false }}/>
    <Stack.Screen name="ChangeCoverScreen" component={ChangeCoverScreen} options={{ headerShown: false }}/>
    <Stack.Screen name="UpdateBioScreen" component={UpdateBioScreen} options={{ headerShown: false }}/>
  </Stack.Navigator>
);

const ContactsStack = () => (
  <Stack.Navigator>
    <Stack.Screen 
      name="ContactsMain" 
      component={ContactsScreen} 
      options={{ header: () => <ContactsHeader /> }} 
    />
    <Stack.Screen 
      name="FriendRequestsScreen" 
      component={FriendRequestsScreen} 
      options={{ headerShown: false }} 
    />
    <Stack.Screen
      name="SentRequestsScreen"
      component={SentRequestsScreen}
      options={{ headerShown: false }}
    />
  </Stack.Navigator>
);


const BottomTabNavigator = () => {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: ({ color, size }) => {
            let iconName;
            if (route.name === "Tin nhắn") {
              iconName = "comment";
            } else if (route.name === "Danh bạ") {
              iconName = "address-book";
            } else if (route.name === "Nhật ký") {
              iconName = "newspaper-o";
            } else if (route.name === "Cá nhân") {
              iconName = "user";
            }
            return <Icon name={iconName} size={size} color={color} />;
          },
          tabBarActiveTintColor: "#0084FF",
          tabBarInactiveTintColor: "gray",
          tabBarStyle: styles.tabBarStyle,
          tabBarLabelStyle: styles.tabBarLabel,
        })}
      >
        <Tab.Screen
          name="Tin nhắn"
          component={HomeScreen}
          options={{ header: () => <HomeScreenHeader /> }}
        />
        <Tab.Screen
          name="Danh bạ"
          component={ContactsStack}
          options={{ headerShown: false }}
        />
        <Tab.Screen
          name="Nhật ký"
          component={NewsScreen}
          options={{ header: () => <NewsHeader /> }}
        />
        <Tab.Screen
          name="Cá nhân"
          component={ProfileStack} 
          options={{ headerShown: false }} 
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  tabBarStyle: {
    height: 60,
    paddingBottom: 8,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#ddd",
    elevation: 5,
  },
  tabBarLabel: {
    fontSize: 12,
    fontWeight: "600",
  },
});

export default BottomTabNavigator;
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, TextInput, SafeAreaView, StatusBar, Alert } from 'react-native';
import { Text, Avatar, ListItem } from '@rneui/themed';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { Ionicons, MaterialIcons, FontAwesome, Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getProfile, uploadAvatar } from '../services/api';
import * as ImagePicker from 'expo-image-picker';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface UserProfile {
  fullName: string;
  avatar: string;
  email: string;
}

const ProfileScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const [activeTab, setActiveTab] = useState('profile');
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      const response = await getProfile();
      if (response.success && response.user) {
        setUserProfile(response.user);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      Alert.alert('Lỗi', 'Không thể tải thông tin người dùng');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Đăng xuất',
      'Bạn có chắc chắn muốn đăng xuất?',
      [
        {
          text: 'Hủy',
          style: 'cancel'
        },
        {
          text: 'Đăng xuất',
          onPress: async () => {
            // Xóa token
            await AsyncStorage.removeItem('token');
            // Chuyển về màn hình đăng nhập
            navigation.reset({
              index: 0,
              routes: [{ name: 'Login' }],
            });
          }
        }
      ]
    );
  };

  const handleAvatarPress = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        setLoading(true);
        const response = await uploadAvatar(result.assets[0].uri);
        if (response.success) {
          setUserProfile(prev => prev ? { ...prev, avatar: response.avatarUrl } : null);
          Alert.alert('Thành công', 'Cập nhật ảnh đại diện thành công');
        }
      }
    } catch (error: any) {
      console.error('Error uploading avatar:', error);
      Alert.alert('Lỗi', error.message || 'Không thể cập nhật ảnh đại diện');
    } finally {
      setLoading(false);
    }
  };

  const profileSettings = [
    {
      id: '1',
      title: 'Cloud',
      subtitle: 'Không gian lưu trữ dữ liệu trên đám mây',
      icon: <Ionicons name="cloud" size={24} color="#0068ff" />,
      rightIcon: true
    },
    {
      id: '2',
      title: 'Style – Tùy chỉnh giao diện',
      subtitle: 'Hình nền và nhạc cho cuộc gọi',
      icon: <Feather name="edit-2" size={24} color="#0068ff" />,
      rightIcon: true
    },
    {
      id: '3',
      title: 'Cloud của tôi',
      subtitle: 'Lưu trữ các tin nhắn quan trọng',
      icon: <Ionicons name="cloud-upload" size={24} color="#0068ff" />,
      rightIcon: true
    },
    {
      id: '4',
      title: 'Dữ liệu trên máy',
      subtitle: 'Quản lý dữ liệu của bạn',
      icon: <FontAwesome name="database" size={24} color="#0068ff" />,
      rightIcon: true
    },
    {
      id: '5',
      title: 'Ví QR',
      subtitle: 'Lưu trữ và xuất trình các mã QR quan trọng',
      icon: <MaterialIcons name="qr-code-scanner" size={24} color="#0068ff" />,
      rightIcon: false
    },
    {
      id: '6',
      title: 'Tài khoản và bảo mật',
      subtitle: '',
      icon: <Ionicons name="shield-checkmark" size={24} color="#0068ff" />,
      rightIcon: true
    },
    {
      id: '7',
      title: 'Quyền riêng tư',
      subtitle: '',
      icon: <MaterialIcons name="lock" size={24} color="#0068ff" />,
      rightIcon: true
    },
    {
      id: '8',
      title: 'Đăng xuất',
      subtitle: '',
      icon: <MaterialIcons name="logout" size={24} color="#FF3B30" />,
      rightIcon: false,
      onPress: handleLogout
    }
  ];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#0068ff" barStyle="light-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={24} color="#fff" style={styles.searchIcon} />
          <TextInput
            placeholder="Tìm kiếm"
            placeholderTextColor="#fff"
            style={styles.searchInput}
          />
        </View>
        <View style={styles.headerIcons}>
          <TouchableOpacity style={styles.settingsButton}>
            <Ionicons name="settings" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Profile Section */}
      <ScrollView style={styles.scrollContainer}>
        <View style={styles.profileSection}>
          <View style={styles.profileHeader}>
            <Avatar
              rounded
              source={{ uri: userProfile?.avatar || 'https://randomuser.me/api/portraits/men/20.jpg' }}
              size={70}
            />
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{userProfile?.fullName || 'Đang tải...'}</Text>
              <TouchableOpacity 
                style={styles.viewProfileButton}
                onPress={() => navigation.navigate('DetailedProfile')}
              >
                <Text style={styles.viewProfileText}>Xem trang cá nhân</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.profileEdit}>
              <Ionicons name="person" size={24} color="#0068ff" />
            </TouchableOpacity>
          </View>

          {/* Settings List */}
          <View style={styles.settingsList}>
            {profileSettings.slice(0, 7).map((item, index) => (
              <TouchableOpacity key={item.id} onPress={item.onPress}>
                <ListItem 
                  containerStyle={[
                    styles.listItem, 
                    index !== 6 && styles.listItemBorder
                  ]}
                >
                  <View style={styles.listItemIcon}>
                    {item.icon}
                  </View>
                  <ListItem.Content>
                    <ListItem.Title style={styles.listItemTitle}>
                      {item.title}
                    </ListItem.Title>
                    {item.subtitle ? (
                      <ListItem.Subtitle style={styles.listItemSubtitle}>{item.subtitle}</ListItem.Subtitle>
                    ) : null}
                  </ListItem.Content>
                  {item.rightIcon && (
                    <Ionicons name="chevron-forward" size={20} color="#999" />
                  )}
                </ListItem>
              </TouchableOpacity>
            ))}

            {/* Khoảng cách trước nút đăng xuất */}
            <View style={styles.logoutSeparator} />

            {/* Nút đăng xuất */}
            <TouchableOpacity onPress={handleLogout}>
              <ListItem containerStyle={styles.logoutItem}>
                <View style={styles.listItemIcon}>
                  <MaterialIcons name="logout" size={24} color="#FF3B30" />
                </View>
                <ListItem.Content>
                  <ListItem.Title style={styles.logoutText}>
                    Đăng xuất
                  </ListItem.Title>
                </ListItem.Content>
              </ListItem>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <TouchableOpacity 
          style={[styles.navItem, activeTab === 'messages' && styles.activeNavItem]} 
          onPress={() => {
            setActiveTab('messages');
            navigation.navigate('Messages');
          }}
        >
          <Ionicons 
            name="chatbubble-outline" 
            size={24} 
            color="#666" 
          />
          <Text style={styles.navText}>Tin nhắn</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.navItem, activeTab === 'contacts' && styles.activeNavItem]} 
          onPress={() => navigation.navigate('Contacts')}
        >
          <Ionicons 
            name="people-outline" 
            size={24} 
            color="#666" 
          />
          <Text style={styles.navText}>Danh bạ</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.navItem, activeTab === 'discover' && styles.activeNavItem]} 
        >
          <MaterialIcons 
            name="grid-view" 
            size={24} 
            color="#666" 
          />
          <Text style={styles.navText}>Khám phá</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.navItem, activeTab === 'diary' && styles.activeNavItem]} 
        >
          <FontAwesome 
            name="clock-o" 
            size={24} 
            color="#666" 
          />
          <Text style={styles.navText}>Nhật ký</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.navItem, activeTab === 'profile' && styles.activeNavItem]} 
        >
          <FontAwesome 
            name="user" 
            size={24} 
            color="#0068ff" 
          />
          <Text style={[styles.navText, styles.activeNavText]}>Cá nhân</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    backgroundColor: '#0068ff',
    paddingHorizontal: 10,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchIcon: {
    marginRight: 5,
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
  },
  headerIcons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  settingsButton: {
    marginLeft: 10,
  },
  scrollContainer: {
    flex: 1,
  },
  profileSection: {
    backgroundColor: '#fff',
    marginBottom: 10,
  },
  profileHeader: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'center',
    borderBottomWidth: 0.5,
    borderBottomColor: '#f0f0f0',
  },
  profileInfo: {
    flex: 1,
    marginLeft: 15,
  },
  profileName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  profileSubtitle: {
    fontSize: 14,
    color: '#888',
    marginTop: 2,
  },
  profileEdit: {
    padding: 5,
  },
  settingsList: {
    paddingTop: 5,
  },
  listItem: {
    paddingVertical: 15,
  },
  listItemBorder: {
    borderBottomWidth: 0.5,
    borderBottomColor: '#f0f0f0',
  },
  listItemIcon: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 5,
  },
  listItemTitle: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  listItemSubtitle: {
    fontSize: 14,
    color: '#999',
    marginTop: 2,
  },
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingVertical: 5,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 5,
  },
  activeNavItem: {},
  navText: {
    fontSize: 12,
    marginTop: 2,
    color: '#666',
  },
  activeNavText: {
    color: '#0068ff',
  },
  logoutItem: {
    marginTop: 20,
    borderRadius: 8,
    marginHorizontal: 10
  },
  logoutText: {
    color: '#FF3B30',
    fontWeight: 'bold',
  },
  logoutSeparator: {
    height: 20,
    backgroundColor: '#f5f5f5',
    marginTop: 10,
    marginBottom: 10,
  },
  viewProfileButton: {
    marginTop: 8,
  },
  viewProfileText: {
    color: '#0068ff',
    fontSize: 14,
    fontWeight: '500',
  },
});

export default ProfileScreen; 
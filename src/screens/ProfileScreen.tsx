import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, TextInput, StatusBar, Platform, Alert } from 'react-native';
import { Text, Avatar, ListItem } from '@rneui/themed';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { Ionicons, MaterialIcons, FontAwesome, Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getProfile, uploadAvatar } from '../services/api';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { socketService } from '../services/socket';
import { SafeAreaView } from 'react-native-safe-area-context';

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

  useEffect(() => {
    fetchUserProfile();
    setupSocket();
    return () => {
      socketService.disconnect();
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      setActiveTab('profile');
    }, [])
  );

  const fetchUserProfile = async () => {
    try {
      const response = await getProfile();
      if (response.success && response.user) {
        setUserProfile(response.user);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      Alert.alert('Lỗi', 'Không thể tải thông tin người dùng');
    }
  };

  const setupSocket = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (token) {
        socketService.connect(token);
        
        // Lắng nghe sự kiện cập nhật profile
        socketService.onProfileUpdate((data) => {
          if (data.email === userProfile?.email) {
            setUserProfile(prev => prev ? { ...prev, fullName: data.fullName, avatar: data.avatar } : null);
          }
        });
      }
    } catch (error) {
      console.error('Socket setup error:', error);
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
        const formData = new FormData();
        formData.append('avatar', {
          uri: Platform.OS === 'android' ? result.assets[0].uri : result.assets[0].uri.replace('file://', ''),
          type: 'image/jpeg',
          name: 'avatar.jpg'
        } as any);

        const response = await uploadAvatar(formData);
        if (response.success) {
          setUserProfile(prev => prev ? { ...prev, avatar: response.avatarUrl } : null);
          
          // Gửi sự kiện cập nhật profile qua socket
          if (userProfile) {
            socketService.emitProfileUpdate({
              fullName: userProfile.fullName,
              avatar: response.avatarUrl,
              email: userProfile.email
            });
          }
          
          Alert.alert('Thành công', 'Cập nhật ảnh đại diện thành công');
        }
      }
    } catch (error: any) {
      console.error('Error uploading avatar:', error);
      Alert.alert('Lỗi', error.message || 'Không thể cập nhật ảnh đại diện');
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
      title: 'Đổi mật khẩu',
      subtitle: '',
      icon: <MaterialIcons name="lock-outline" size={24} color="#0068ff" />,
      rightIcon: true,
      onPress: () => navigation.navigate('ChangePassword')
    },
    {
      id: '9',
      title: 'Đăng xuất',
      subtitle: '',
      icon: <MaterialIcons name="logout" size={24} color="#FF3B30" />,
      rightIcon: false,
      onPress: handleLogout
    }
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }} edges={['top', 'bottom', 'left', 'right']}>
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
              source={{ uri: userProfile?.avatar }}
              size={70}
            />
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{userProfile?.fullName}</Text>
              <TouchableOpacity 
                style={styles.viewProfileButton}
                onPress={() => navigation.navigate('DetailedProfile')}
              >
                <Text style={styles.viewProfileText}>Xem trang cá nhân</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.personIconButton}>
              <Ionicons name="people-outline" size={24} color="#0068ff" />
            </TouchableOpacity>
          </View>

          {/* Settings List */}
          <View style={styles.settingsList}>
            {profileSettings.slice(0, 8).map((item, index) => (
              <TouchableOpacity key={item.id} onPress={item.onPress} disabled={!item.onPress}>
                <ListItem
                  containerStyle={[
                    styles.listItem,
                    index !== 7 && styles.listItemBorder 
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
            {(() => {
              const logoutItem = profileSettings[8];
              return (
                <TouchableOpacity
                  onPress={logoutItem.onPress}
                  style={styles.logoutButton}
                >
                  <LinearGradient
                    colors={['#FF3B30', '#FF6B6B']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.logoutGradient}
                  >
                    <View style={styles.logoutButtonContent}>
                      {logoutItem.icon}
                      <Text style={styles.logoutText}>
                        {logoutItem.title}
                      </Text>
                    </View>
                  </LinearGradient>
                </TouchableOpacity>
              );
            })()}
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
            name={activeTab === 'messages' ? "chatbubble" : "chatbubble-outline"} 
            size={24} 
            color={activeTab === 'messages' ? '#0068ff' : '#666'} 
          />
          <Text style={[styles.navText, activeTab === 'messages' && styles.activeNavText]}>Tin nhắn</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.navItem, activeTab === 'contacts' && styles.activeNavItem]} 
          onPress={() => {
            setActiveTab('contacts');
            navigation.navigate('Contacts');
          }}
        >
          <Ionicons 
            name={activeTab === 'contacts' ? "people" : "people-outline"} 
            size={24} 
            color={activeTab === 'contacts' ? '#0068ff' : '#666'} 
          />
          <Text style={[styles.navText, activeTab === 'contacts' && styles.activeNavText]}>Danh bạ</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.navItem, activeTab === 'discover' && styles.activeNavItem]} 
          onPress={() => {
            setActiveTab('discover');
            navigation.navigate('Discovery');
          }}
        >
          <MaterialIcons 
            name="grid-view" 
            size={24} 
            color={activeTab === 'discover' ? '#0068ff' : '#666'} 
          />
          <Text style={[styles.navText, activeTab === 'discover' && styles.activeNavText]}>Khám phá</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.navItem, activeTab === 'diary' && styles.activeNavItem]} 
          onPress={() => {
            setActiveTab('diary');
            navigation.navigate('Diary');
          }}
        >
          <FontAwesome 
            name="clock-o" 
            size={24} 
            color={activeTab === 'diary' ? '#0068ff' : '#666'} 
          />
          <Text style={[styles.navText, activeTab === 'diary' && styles.activeNavText]}>Nhật ký</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.navItem, activeTab === 'profile' && styles.activeNavItem]} 
          onPress={() => {
            setActiveTab('profile');
            navigation.navigate('Profile');
          }}
        >
          <FontAwesome 
            name="user-o" 
            size={24} 
            color={activeTab === 'profile' ? '#0068ff' : '#666'} 
          />
          <Text style={[styles.navText, activeTab === 'profile' && styles.activeNavText]}>Cá nhân</Text>
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
  logoutButton: {
    marginTop: 20,
    marginHorizontal: 10,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#FF3B30',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  logoutGradient: {
    padding: 16,
  },
  logoutButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
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
  personIconButton: {
    padding: 8,
    marginLeft: 10,
  },
});

export default ProfileScreen; 
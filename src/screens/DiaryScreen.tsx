import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, TextInput, StatusBar, Image } from 'react-native';
import { Text, Avatar, Button } from '@rneui/themed';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { Ionicons, MaterialIcons, FontAwesome, Feather } from '@expo/vector-icons';
import { getProfile } from '../services/api';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface UserProfile {
  fullName: string;
  avatar: string;
  email: string;
}

const DiaryScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const [activeTab, setActiveTab] = useState('diary');
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  useFocusEffect(
    useCallback(() => {
      setActiveTab('diary');
      loadUserProfile();
    }, [])
  );

  const loadUserProfile = async () => {
    try {
      const response = await getProfile();
      if (response.success) {
        setUserProfile(response.user);
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  };

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
          <TouchableOpacity style={styles.addPhotoButton}>
            <Ionicons name="image" size={24} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.notificationButton}>
            <Ionicons name="notifications-outline" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={{ flex: 1 }}>
        {/* Status Update Section */}
        <View style={styles.statusSection}>
          <View style={styles.statusHeader}>
            <Avatar
              rounded
              source={{ uri: userProfile?.avatar || 'https://i.pinimg.com/564x/c0/d1/21/c0d121e3d2c6e958f1c5e2c0bfb78bb7.jpg' }}
              size={50}
            />
            <Text style={styles.statusPrompt}>Hôm nay bạn thế nào?</Text>
          </View>

          {/* Status Update Options */}
          <View style={styles.statusOptions}>
            <TouchableOpacity style={styles.statusOption}>
              <View style={[styles.iconContainer, { backgroundColor: '#4CAF50' }]}>
                <Feather name="image" size={20} color="#fff" />
              </View>
              <Text style={styles.statusOptionText}>Ảnh</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.statusOption}>
              <View style={[styles.iconContainer, { backgroundColor: '#E91E63' }]}>
                <Feather name="video" size={20} color="#fff" />
              </View>
              <Text style={styles.statusOptionText}>Video</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.statusOption}>
              <View style={[styles.iconContainer, { backgroundColor: '#2196F3' }]}>
                <Feather name="grid" size={20} color="#fff" />
              </View>
              <Text style={styles.statusOptionText}>Album</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.statusOption}>
              <View style={[styles.iconContainer, { backgroundColor: '#FF9800' }]}>
                <Feather name="clock" size={20} color="#fff" />
              </View>
              <Text style={styles.statusOptionText}>Kỷ niệm</Text>
            </TouchableOpacity>
          </View>

          {/* Moments Section */}
          <View style={styles.momentsSection}>
            <Text style={styles.momentsTitle}>Khoảnh khắc</Text>
            
            <View style={styles.momentsList}>
              <TouchableOpacity style={styles.momentItem}>
                <Image 
                  source={{ uri: userProfile?.avatar || 'https://i.pinimg.com/564x/c0/d1/21/c0d121e3d2c6e958f1c5e2c0bfb78bb7.jpg' }} 
                  style={styles.momentImage} 
                />
                <View style={styles.editIconContainer}>
                  <Feather name="edit-2" size={18} color="#fff" />
                </View>
                <Text style={styles.momentText}>Tạo mới</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
        
        {/* Posts Section */}
        <View style={styles.postsSection}>
          {/* Single Post */}
          <View style={styles.postContainer}>
            <View style={styles.postHeader}>
              <Avatar
                rounded
                source={{ uri: 'https://randomuser.me/api/portraits/women/15.jpg' }}
                size={40}
              />
              <View style={styles.postHeaderInfo}>
                <Text style={styles.postAuthor}>Trần Thị Hương - Tiệm Bánh Ngọt</Text>
                <Text style={styles.postTime}>Hôm qua lúc 9:00</Text>
              </View>
              <TouchableOpacity style={styles.postOptions}>
                <Feather name="more-horizontal" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.postContent}>
              <Image 
                source={{ uri: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?q=80&w=989' }} 
                style={styles.postImage} 
                resizeMode="cover"
              />
              <View style={styles.postText}>
                <Text style={styles.postMessage}>
                  TIỆM BÁNH NGỌT HÔM NAY MỞ CỬA ĐẾN 21H00.{'\n'}
                  CÓ BÁNH MỚI CÁC BẠN GHÉ NHÉ!
                </Text>
              </View>
            </View>
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
  addPhotoButton: {
    marginRight: 15,
  },
  notificationButton: {},
  scrollContainer: {
    flex: 1,
  },
  statusSection: {
    backgroundColor: '#fff',
    marginBottom: 8,
  },
  statusHeader: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 0.5,
    borderBottomColor: '#f0f0f0',
  },
  statusPrompt: {
    fontSize: 16,
    color: '#888',
    marginLeft: 12,
  },
  statusOptions: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 16,
    justifyContent: 'space-between',
  },
  statusOption: {
    alignItems: 'center',
  },
  statusOptionText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  momentsSection: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
  },
  momentsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  momentsList: {
    flexDirection: 'row',
  },
  momentItem: {
    width: 100,
    marginRight: 10,
    alignItems: 'center',
  },
  momentImage: {
    width: 100,
    height: 150,
    borderRadius: 8,
  },
  editIconContainer: {
    position: 'absolute',
    bottom: 30,
    backgroundColor: '#0068ff',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  momentText: {
    marginTop: 6,
    fontSize: 14,
    color: '#333',
  },
  postsSection: {
    backgroundColor: '#fff',
  },
  postContainer: {
    borderBottomWidth: 0.5,
    borderBottomColor: '#e0e0e0',
  },
  postHeader: {
    flexDirection: 'row',
    padding: 12,
    alignItems: 'center',
  },
  postHeaderInfo: {
    flex: 1,
    marginLeft: 10,
  },
  postAuthor: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  postTime: {
    fontSize: 12,
    color: '#999',
  },
  postOptions: {
    padding: 5,
  },
  postContent: {},
  postImage: {
    width: '100%',
    height: 200,
    backgroundColor: '#FFC107',
  },
  postText: {
    padding: 12,
  },
  postMessage: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
    textAlign: 'center',
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
});

export default DiaryScreen; 
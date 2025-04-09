import React, { useState } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, TextInput, SafeAreaView, StatusBar, Image } from 'react-native';
import { Text, Avatar, Badge } from '@rneui/themed';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { Ionicons, MaterialIcons, FontAwesome, FontAwesome5 } from '@expo/vector-icons';

// Mock data for conversations
const mockConversations = [
  {
    id: '1',
    name: 'Cloud của tôi',
    lastMessage: 'Bạn: Các tài liệu đã được sao lưu',
    time: 'T5',
    avatar: 'https://randomuser.me/api/portraits/lego/1.jpg',
    isOfficial: true
  },
  {
    id: '2',
    name: 'Tin tức 24h',
    lastMessage: 'Tin mới: Dự báo thời tiết ngày mai...',
    time: '',
    avatar: 'https://randomuser.me/api/portraits/lego/2.jpg',
    hasNotification: true
  },
  {
    id: '3',
    name: 'Nhóm Học tập CNTT',
    lastMessage: 'Nguyễn Văn A: [Hình ảnh] Deadline nộp bài tập...',
    time: '6 giờ',
    avatar: 'https://randomuser.me/api/portraits/men/11.jpg',
    isGroup: true,
    memberCount: 45
  },
  {
    id: '4',
    name: 'Lớp KTPM 2023',
    lastMessage: 'Bạn: Em gửi file báo cáo rồi ạ',
    time: '14 giờ',
    avatar: 'https://randomuser.me/api/portraits/men/12.jpg',
    isGroup: true
  },
  {
    id: '5',
    name: 'Nhóm Dự án Java',
    lastMessage: 'Trần Văn B: mọi người họp online lúc 7h nhé',
    time: '16 giờ',
    avatar: 'https://randomuser.me/api/portraits/men/13.jpg',
    isGroup: true,
    memberCount: 6
  },
  {
    id: '6',
    name: 'Gia đình',
    lastMessage: 'Mẹ: Con nhớ ăn cơm đầy đủ nhé...',
    time: '16 giờ',
    avatar: 'https://randomuser.me/api/portraits/women/10.jpg',
    isGroup: true
  },
  {
    id: '7',
    name: 'Nguyễn Văn A',
    lastMessage: 'Tối nay đi đá bóng không bạn?',
    time: '20 giờ',
    avatar: 'https://randomuser.me/api/portraits/men/14.jpg'
  },
  {
    id: '8',
    name: 'Nhóm Bạn Thân',
    lastMessage: 'Lê Thị C: Cuối tuần này đi cafe nhé cả nhóm',
    time: 'T2',
    avatar: 'https://randomuser.me/api/portraits/women/12.jpg',
    isGroup: true,
    memberCount: 5
  }
];

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const MessagesScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const [activeTab, setActiveTab] = useState('messages');

  const renderConversationItem = ({ item }: { item: any }) => (
    <TouchableOpacity style={styles.conversationItem}>
      <View style={styles.avatarContainer}>
        <Avatar
          rounded
          source={{ uri: item.avatar }}
          size={50}
        />
        {item.isGroup && item.memberCount && (
          <View style={styles.memberCount}>
            <Text style={styles.memberCountText}>{item.memberCount}</Text>
          </View>
        )}
        {item.isOfficial && (
          <View style={styles.officialBadge}>
            <Ionicons name="checkmark-circle" size={16} color="#f39c12" />
          </View>
        )}
      </View>

      <View style={styles.conversationDetails}>
        <View style={styles.conversationHeader}>
          <Text style={styles.conversationName} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.timeText}>{item.time}</Text>
        </View>
        <Text style={styles.lastMessage} numberOfLines={1}>{item.lastMessage}</Text>
      </View>

      {item.hasNotification && (
        <Badge
          status="error"
          containerStyle={styles.notificationBadge}
        />
      )}
    </TouchableOpacity>
  );

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
          <TouchableOpacity style={styles.qrCode}>
            <Ionicons name="qr-code" size={24} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.addButton}>
            <Ionicons name="add" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Conversations List */}
      <FlatList
        data={mockConversations}
        renderItem={renderConversationItem}
        keyExtractor={(item) => item.id}
        style={styles.list}
      />

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <TouchableOpacity 
          style={[styles.navItem, activeTab === 'messages' && styles.activeNavItem]} 
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
          onPress={() => navigation.navigate('Contacts')}
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
        >
          <Badge
            status="error"
            value="1"
            containerStyle={styles.navBadge}
          />
          <MaterialIcons 
            name="grid-view" 
            size={24} 
            color={activeTab === 'discover' ? '#0068ff' : '#666'} 
          />
          <Text style={[styles.navText, activeTab === 'discover' && styles.activeNavText]}>Khám phá</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.navItem, activeTab === 'diary' && styles.activeNavItem]} 
          onPress={() => navigation.navigate('Diary')}
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
          onPress={() => navigation.navigate('Profile')}
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
  qrCode: {
    marginRight: 15,
  },
  addButton: {},
  list: {
    flex: 1,
    backgroundColor: '#fff',
  },
  conversationItem: {
    flexDirection: 'row',
    padding: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: '#e0e0e0',
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  memberCount: {
    position: 'absolute',
    bottom: 0,
    right: -2,
    backgroundColor: '#f39c12',
    borderRadius: 10,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  memberCountText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  officialBadge: {
    position: 'absolute',
    bottom: 0,
    right: -2,
  },
  conversationDetails: {
    flex: 1,
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  conversationName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    maxWidth: '80%',
  },
  timeText: {
    fontSize: 12,
    color: '#999',
  },
  lastMessage: {
    fontSize: 14,
    color: '#666',
  },
  notificationBadge: {
    position: 'absolute',
    top: 15,
    right: 10,
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
  activeNavItem: {
    borderBottomWidth: 0,
  },
  navText: {
    fontSize: 12,
    marginTop: 2,
    color: '#666',
  },
  activeNavText: {
    color: '#0068ff',
  },
  navBadge: {
    position: 'absolute',
    top: -5,
    right: 20,
    zIndex: 10,
  },
});

export default MessagesScreen; 
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, TextInput, SafeAreaView, StatusBar } from 'react-native';
import { Text, Avatar } from '@rneui/themed';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { Ionicons, MaterialIcons, FontAwesome } from '@expo/vector-icons';
import { getFriends, getMessages, Message } from '../services/api';

// Add type definitions at the top of the file
declare global {
  var cachedFriends: Friend[];
}

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface Friend {
  email: string;
  fullName: string;
  avatar: string;
  online?: boolean;
}

interface Conversation {
  email: string;
  fullName: string;
  avatar: string;
  lastMessage?: Message;
}

const MessagesScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const [activeTab, setActiveTab] = useState('messages');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    // Try to load from cache first
    const cachedFriends = global.cachedFriends;
    if (cachedFriends) {
      setConversations(cachedFriends.map(friend => ({
        email: friend.email,
        fullName: friend.fullName,
        avatar: friend.avatar
      })));
    }

    // Then fetch fresh data in background
    const loadFriends = async () => {
      try {
        const friendsResponse = await getFriends();
        if (friendsResponse.success && friendsResponse.data) {
          const friends = friendsResponse.data;
          // Cache friends data globally
          global.cachedFriends = friends;
          
          // Update UI with fresh data
          setConversations(friends.map(friend => ({
            email: friend.email,
            fullName: friend.fullName,
            avatar: friend.avatar
          })));

          // Fetch messages in background without blocking UI
          setTimeout(() => {
            fetchMessages(friends);
          }, 100);
        }
      } catch (error) {
        console.error('Error fetching friends:', error);
      }
    };

    loadFriends();
    
    const unsubscribe = navigation.addListener('focus', () => {
      setActiveTab('messages');
      if (global.cachedFriends) {
        setConversations(global.cachedFriends.map(friend => ({
          email: friend.email,
          fullName: friend.fullName,
          avatar: friend.avatar
        })));
      }
      loadFriends();
    });

    return unsubscribe;
  }, [navigation]);

  // Optimize message fetching to run in chunks
  const fetchMessages = async (friends: any[]) => {
    try {
      // Process in chunks of 5 to avoid overwhelming the API
      const chunkSize = 5;
      for (let i = 0; i < friends.length; i += chunkSize) {
        const chunk = friends.slice(i, i + chunkSize);
        const chunkPromises = chunk.map(async (friend) => {
          try {
            const messagesResponse = await getMessages(friend.email);
            if (!messagesResponse.success) return null;

            const theirMessages = messagesResponse.data.filter(msg => msg.senderEmail === friend.email);
            const lastMessage = theirMessages.length > 0 ? theirMessages[theirMessages.length - 1] : undefined;

            return {
              email: friend.email,
              fullName: friend.fullName,
              avatar: friend.avatar,
              lastMessage
            };
          } catch (error) {
            console.error('Error fetching messages for friend:', friend.email, error);
            return null;
          }
        });

        const results = await Promise.all(chunkPromises);
        const validResults = results.filter(result => result !== null) as Conversation[];

        setConversations(prev => {
          const updated = [...prev];
          validResults.forEach(result => {
            const index = updated.findIndex(conv => conv.email === result.email);
            if (index !== -1) {
              updated[index] = result;
            }
          });
          return updated.sort((a, b) => {
            if (!a.lastMessage) return 1;
            if (!b.lastMessage) return -1;
            return new Date(b.lastMessage.createdAt).getTime() - new Date(a.lastMessage.createdAt).getTime();
          });
        });

        // Add a small delay between chunks to prevent overwhelming
        if (i + chunkSize < friends.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const filteredConversations = conversations.filter(conversation => 
    conversation.fullName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatTimeAgo = (timestamp: string) => {
    const messageDate = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - messageDate.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 60) {
      return `${diffInMinutes} phút trước`;
    } else if (diffInMinutes < 1440) { // Less than 24 hours
      const hours = Math.floor(diffInMinutes / 60);
      return `${hours} giờ trước`;
    } else {
      const days = Math.floor(diffInMinutes / 1440);
      return `${days} ngày trước`;
    }
  };

  const renderConversationItem = ({ item }: { item: Conversation }) => {
    const getMessageContent = (message?: Message) => {
      if (!message) return '';
      
      // Kiểm tra nếu content là URL từ S3
      if (message.content.includes('amazonaws.com')) {
        if (message.metadata?.fileType?.startsWith('image')) {
          return 'Đã gửi một ảnh';
        }
        return 'Đã gửi một file';
      }

      return message.content;
    };

    return (
      <TouchableOpacity 
        style={styles.conversationItem}
        onPress={() => navigation.navigate('Chat', { 
          fullName: item.fullName,
          avatar: item.avatar,
          receiverEmail: item.email
        })}
      >
        <View style={styles.avatarContainer}>
          <Avatar
            rounded
            source={{ uri: item.avatar || 'https://randomuser.me/api/portraits/men/1.jpg' }}
            size={50}
          />
        </View>

        <View style={styles.conversationDetails}>
          <View style={styles.conversationHeader}>
            <Text style={styles.conversationName} numberOfLines={1}>{item.fullName}</Text>
            {item.lastMessage && (
              <Text style={styles.timeText}>{formatTimeAgo(item.lastMessage.createdAt)}</Text>
            )}
          </View>
          <Text style={[styles.lastMessage, { color: '#666' }]} numberOfLines={1}>
            {getMessageContent(item.lastMessage)}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#0068ff" barStyle="light-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={24} color="#fff" style={styles.searchIcon} />
          <TextInput
            placeholder="Tìm kiếm bạn bè"
            placeholderTextColor="#fff"
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <View style={styles.headerIcons}>
          <TouchableOpacity style={styles.qrCode}>
            <Ionicons name="qr-code" size={24} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.addButton}
            onPress={() => navigation.navigate('FriendRequests')}
          >
            <Ionicons name="add" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Conversations List */}
      <FlatList
        data={filteredConversations}
        renderItem={renderConversationItem}
        keyExtractor={(item) => item.email}
        style={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Không có cuộc trò chuyện nào</Text>
          </View>
        }
      />

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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
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
    flex: 1,
    marginRight: 8,
  },
  timeText: {
    fontSize: 12,
    color: '#666',
  },
  lastMessage: {
    fontSize: 14,
    color: '#666',
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
});

export default MessagesScreen; 
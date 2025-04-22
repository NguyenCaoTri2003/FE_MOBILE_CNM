import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, TextInput, SafeAreaView, StatusBar } from 'react-native';
import { Text, Avatar } from '@rneui/themed';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { Ionicons, MaterialIcons, FontAwesome } from '@expo/vector-icons';
import { getFriends, getMessages, Message, Friend, getGroups, Group } from '../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { jwtDecode } from 'jwt-decode';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface Conversation {
  id: string;
  type: 'personal' | 'group';
  name: string;
  avatar?: string;
  lastMessage?: {
    content: string;
    senderEmail?: string;
    timestamp: string;
    type?: string;
    metadata?: any;
  };
  unreadCount?: number;
}

interface ExtendedGroup extends Group {
  messages?: Array<{
    content: string;
    senderEmail: string;
    createdAt: string;
  }>;
}

const MessagesScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const [activeTab, setActiveTab] = useState('messages');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadConversations();
  }, []);

  const loadConversations = async () => {
    try {
      setLoading(true);
      
      // Load both friends and groups in parallel
      const [friendsResponse, groupsResponse] = await Promise.all([
        getFriends(),
        getGroups()
      ]);

      let allConversations: Conversation[] = [];

      // Process personal conversations
      if (friendsResponse.success) {
        const friends = friendsResponse.data;
        const personalConversations = await Promise.all(
          friends.map(async (friend) => {
            try {
              const messagesResponse = await getMessages(friend.email);
              const messages = messagesResponse.success ? messagesResponse.data : [];
              const lastMessage = messages[0];
              const unreadCount = messages.filter(
                msg => msg.status !== 'read' && msg.senderEmail === friend.email
              ).length;

              return {
                id: friend.email,
                type: 'personal' as const,
                name: friend.fullName,
                avatar: friend.avatar || undefined,
                lastMessage: lastMessage ? {
                  content: lastMessage.content,
                  senderEmail: lastMessage.senderEmail,
                  timestamp: lastMessage.createdAt,
                  type: lastMessage.type,
                  metadata: lastMessage.metadata
                } : undefined,
                unreadCount
              };
            } catch (error) {
              console.error(`Error loading messages for ${friend.email}:`, error);
              return {
                id: friend.email,
                type: 'personal' as const,
                name: friend.fullName,
                avatar: friend.avatar || undefined
              };
            }
          })
        );
        allConversations = [...allConversations, ...personalConversations];
      }

      // Process group conversations
      if (groupsResponse.success) {
        const groups = groupsResponse.data as ExtendedGroup[];
        const token = await AsyncStorage.getItem('token');
        if (!token) return;
        
        const decoded = jwtDecode<{ email: string; id: string }>(token);
        const userEmail = decoded.email;

        console.log('Current user email:', userEmail);
        console.log('Groups data:', groups);

        const groupConversations = await Promise.all(
          groups.map(async (group) => {
            try {
              // Kiểm tra xem người dùng có phải là thành viên của nhóm không
              const isMember = group.members.some(member => member.email === userEmail);
              console.log(`Group ${group.groupId} - Is member:`, isMember);
              
              if (!isMember) {
                return null;
              }

              // Lấy tin nhắn cuối cùng của nhóm
              const lastMessage = group.lastMessage;
              console.log(`Group ${group.groupId} - Last message:`, lastMessage);

              // Nếu không có tin nhắn cuối cùng, thử lấy từ mảng messages
              if (!lastMessage && group.messages && group.messages.length > 0) {
                const lastMsg = group.messages[group.messages.length - 1];
                return {
                  id: group.groupId,
                  type: 'group' as const,
                  name: group.name,
                  avatar: group.avatar,
                  lastMessage: {
                    content: lastMsg.content,
                    senderEmail: lastMsg.senderEmail,
                    timestamp: lastMsg.createdAt
                  }
                } as Conversation;
              }

              return {
                id: group.groupId,
                type: 'group' as const,
                name: group.name,
                avatar: group.avatar,
                lastMessage: lastMessage ? {
                  content: lastMessage.content,
                  senderEmail: lastMessage.senderEmail,
                  timestamp: lastMessage.timestamp
                } : undefined
              } as Conversation;
            } catch (error) {
              console.error(`Error processing group ${group.groupId}:`, error);
              return null;
            }
          })
        );

        // Lọc bỏ các nhóm null (không có quyền truy cập)
        const validGroupConversations = groupConversations.filter((conv): conv is Conversation => conv !== null);
        console.log('Valid group conversations:', validGroupConversations);
        
        allConversations = [...allConversations, ...validGroupConversations];
      }

      // Sort all conversations by last message time
      const sortedConversations = allConversations.sort((a, b) => {
        if (!a.lastMessage && !b.lastMessage) return 0;
        if (!a.lastMessage) return 1;
        if (!b.lastMessage) return -1;
        
        const dateA = new Date(a.lastMessage.timestamp).getTime();
        const dateB = new Date(b.lastMessage.timestamp).getTime();
        return dateB - dateA;
      });

      setConversations(sortedConversations);
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTimeAgo = (timestamp: string) => {
    const messageDate = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - messageDate.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 60) {
      return `${diffInMinutes} phút trước`;
    } else if (diffInMinutes < 1440) {
      const hours = Math.floor(diffInMinutes / 60);
      return `${hours} giờ trước`;
    } else {
      const days = Math.floor(diffInMinutes / 1440);
      return `${days} ngày trước`;
    }
  };

  const getMessageContent = (message?: Conversation['lastMessage']) => {
    if (!message) return '';
    
    if (message.type === 'recall' || message.content.includes('đã thu hồi')) {
      return 'Tin nhắn đã được thu hồi';
    }
    
    // Check if content is a URL from S3
    if (message.content.includes('amazonaws.com')) {
      if (message.metadata?.fileType?.startsWith('image')) {
        return '[Hình ảnh]';
      }
      if (message.metadata?.fileType?.startsWith('video')) {
        return '[Video]';
      }
      return '[File]';
    }

    return message.content;
  };

  const renderConversationItem = ({ item }: { item: Conversation }) => {
    const isGroup = item.type === 'group';

    const handlePress = () => {
      if (isGroup) {
        navigation.navigate('ChatGroup', { 
          groupId: item.id,
          groupName: item.name,
          avatar: item.avatar || ''
        });
      } else {
        navigation.navigate('Chat', { 
          fullName: item.name,
          avatar: item.avatar || '',
          receiverEmail: item.id
        });
      }
    };

    return (
      <TouchableOpacity 
        style={[
          styles.conversationItem,
          item.unreadCount ? styles.unreadConversation : null
        ]}
        onPress={handlePress}
      >
        <View style={styles.avatarContainer}>
          {isGroup ? (
            <View style={styles.groupAvatarContainer}>
              {item.avatar ? (
                <Avatar
                  rounded
                  source={{ uri: item.avatar }}
                  size={50}
                />
              ) : (
                <View style={styles.groupAvatarPlaceholder}>
                  <Text style={styles.groupAvatarText}>
                    {item.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
              <View style={styles.groupIndicator}>
                <Ionicons name="people" size={12} color="#fff" />
              </View>
            </View>
          ) : (
            <Avatar
              rounded
              source={item.avatar ? { uri: item.avatar } : undefined}
              size={50}
            />
          )}
          {item.unreadCount ? (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadCount}>{item.unreadCount}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.conversationDetails}>
          <View style={styles.conversationHeader}>
            <Text style={[
              styles.conversationName,
              item.unreadCount ? styles.unreadName : null
            ]} numberOfLines={1}>
              {item.name}
            </Text>
            {item.lastMessage && (
              <Text style={[
                styles.timeText,
                item.unreadCount ? styles.unreadTime : null
              ]}>
                {formatTimeAgo(item.lastMessage.timestamp)}
              </Text>
            )}
          </View>
          <Text style={[
            styles.lastMessage,
            item.unreadCount ? styles.unreadMessage : null
          ]} numberOfLines={1}>
            {item.lastMessage?.senderEmail && isGroup ? (
              <Text style={styles.messageSender}>
                {`${item.lastMessage.senderEmail.split('@')[0]}: `}
              </Text>
            ) : null}
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
          <Ionicons name="search" size={20} color="#fff" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm kiếm"
            placeholderTextColor="rgba(255, 255, 255, 0.7)"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <View style={styles.headerIcons}>
          <TouchableOpacity style={styles.qrCode}>
            <Ionicons name="qr-code-outline" size={24} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.addButton}>
            <Ionicons name="add-circle-outline" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Conversations List */}
      <FlatList
        data={conversations.filter(conv => 
          conv.name.toLowerCase().includes(searchQuery.toLowerCase())
        )}
        renderItem={renderConversationItem}
        keyExtractor={item => `${item.type}-${item.id}`}
        style={styles.list}
        refreshing={loading}
        onRefresh={loadConversations}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {searchQuery ? 'Không tìm thấy cuộc trò chuyện nào' : 'Chưa có cuộc trò chuyện nào'}
            </Text>
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
  unreadConversation: {
    backgroundColor: '#f0f7ff',
  },
  unreadBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#0068ff',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  unreadCount: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  unreadName: {
    color: '#0068ff',
    fontWeight: 'bold',
  },
  unreadTime: {
    color: '#0068ff',
    fontWeight: 'bold',
  },
  unreadMessage: {
    color: '#0068ff',
    fontWeight: '500',
  },
  groupAvatarContainer: {
    position: 'relative',
  },
  groupAvatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  groupAvatarText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#666',
  },
  groupIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#0068ff',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  messageSender: {
    color: '#0068ff',
    fontWeight: '500',
  },
});

export default MessagesScreen; 
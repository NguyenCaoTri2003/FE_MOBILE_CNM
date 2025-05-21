import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, TextInput, SafeAreaView, StatusBar } from 'react-native';
import { Text, Avatar } from '@rneui/themed';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { Ionicons, MaterialIcons, FontAwesome } from '@expo/vector-icons';
import { getFriends, getMessages, getGroups, Group } from '../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { jwtDecode } from 'jwt-decode';
import { io } from 'socket.io-client';
import { API_BASE_URL } from '@env';
import { SafeAreaView as SafeAreaViewRN } from 'react-native-safe-area-context';

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
  const [isLoading, setIsLoading] = useState(false);
  const [currentUserEmail, setCurrentUserEmail] = useState<string>('');
  const [hasChanges, setHasChanges] = useState(false);
  const [isFromChat, setIsFromChat] = useState(false);
  const socket = useRef<any>(null);
  const pollingInterval = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const getCurrentUserEmail = async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        if (token) {
          const decoded = jwtDecode<{ email: string }>(token);
          setCurrentUserEmail(decoded.email);
        }
      } catch (error) {
        console.error('Error getting current user email:', error);
      }
    };

    getCurrentUserEmail();
  }, []);

  useEffect(() => {
    const initializeSocket = async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        if (!token) {
          console.log('No token found');
          return;
        }

        // Initialize socket connection
        const socketUrl = API_BASE_URL;
        console.log('Initializing socket connection to:', socketUrl);
        
        if (socket.current) {
          console.log('Disconnecting existing socket');
          conversations.forEach(conv => {
            if (conv.type === 'group') {
              socket.current.emit('leaveGroup', { groupId: conv.id });
            }
          });
          socket.current.disconnect();
        }
        
        socket.current = io(socketUrl, {
          transports: ['websocket', 'polling'],
          upgrade: true,
          rememberUpgrade: true,
          auth: {
            token
          },
          reconnection: true,
          reconnectionAttempts: 5,
          reconnectionDelay: 1000,
          timeout: 20000,
          path: '/socket.io/'
        });

        // Log socket connection status
        socket.current.on('connect', () => {
          console.log('Socket connected successfully with ID:', socket.current?.id);
          // Khi kết nối lại, load lại danh sách cuộc trò chuyện
          loadConversations();
        });

        socket.current.on('connect_error', (error: Error) => {
          console.log('Socket connection error:', error.message);
        });

        socket.current.on('error', (error: Error) => {
          console.log('Socket error:', error.message);
        });

        socket.current.on('disconnect', (reason: string) => {
          console.log('Socket disconnected:', reason);
        });

        // Socket event listeners for group updates
        socket.current.on('groupList', (data: { groups: Group[] }) => {
          console.log('Received groupList:', data);
          updateGroupConversations(data.groups);
        });

        socket.current.on('groupCreated', (data: { group: Group }) => {
          console.log('Received groupCreated:', data);
          const newGroup = data.group;
          const newConversation: Conversation = {
            id: newGroup.groupId,
            type: 'group',
            name: newGroup.name,
            avatar: newGroup.avatar,
            lastMessage: newGroup.lastMessage ? {
              content: newGroup.lastMessage.content,
              senderEmail: newGroup.lastMessage.senderEmail,
              timestamp: newGroup.lastMessage.timestamp || new Date().toISOString(),
              type: newGroup.lastMessage.type || 'text'
            } : undefined
          };

          setConversations(prev => {
            const existingIndex = prev.findIndex(conv => conv.id === newGroup.groupId);
            if (existingIndex !== -1) {
              const updated = [...prev];
              updated[existingIndex] = newConversation;
              return sortConversationsByTime(updated);
            }
            return sortConversationsByTime([newConversation, ...prev]);
          });
        });

        socket.current.on('groupDeleted', (data: { groupId: string }) => {
          console.log('Received groupDeleted:', data);
          handleGroupDeleted(data.groupId);
        });

        socket.current.on('groupJoined', (data: { group: Group }) => {
          console.log('Received groupJoined:', data);
          addNewGroupConversation(data.group);
        });

        socket.current.on('groupMembersUpdated', (data: { groupId: string, newMembers: any[] }) => {
          console.log('Received groupMembersUpdated:', data);
          updateGroupMembers(data.groupId, data.newMembers);
        });

        // Xử lý tin nhắn mới
        socket.current.on('newMessage', (data: { message: any }) => {
          console.log('Received newMessage:', data);
          const { message } = data;
          setConversations(prev => {
            const updated = prev.map(conv => {
              if (conv.type === 'personal' && 
                  (conv.id === message.senderEmail || conv.id === message.receiverEmail)) {
                return {
                  ...conv,
                  lastMessage: {
                    content: message.content,
                    senderEmail: message.senderEmail,
                    timestamp: message.timestamp || new Date().toISOString(),
                    type: message.type || 'text',
                    metadata: message.metadata
                  }
                };
              }
              return conv;
            });
            return sortConversationsByTime(updated);
          });
        });

        socket.current.on('newGroupMessage', (data: { groupId: string, message: any }) => {
          console.log('Received newGroupMessage:', data);
          const { groupId, message } = data;
          setConversations(prev => {
            const updated = prev.map(conv => {
              if (conv.type === 'group' && conv.id === groupId) {
                return {
                  ...conv,
                  lastMessage: {
                    content: message.content,
                    senderEmail: message.senderEmail,
                    timestamp: message.timestamp || new Date().toISOString(),
                    type: message.type || 'text'
                  }
                };
              }
              return conv;
            });
            return sortConversationsByTime(updated);
          });
        });

        // Load conversations lần đầu
        loadConversations();

        return () => {
          if (socket.current) {
            console.log('Cleaning up socket connection');
            conversations.forEach(conv => {
              if (conv.type === 'group') {
                socket.current.emit('leaveGroup', { groupId: conv.id });
              }
            });
            socket.current.disconnect();
          }
        };
      } catch (error) {
        console.log('Error initializing socket:', error);
      }
    };

    initializeSocket();
  }, []);

  // Thêm useEffect để theo dõi thay đổi của conversations
  useEffect(() => {
    if (socket.current?.connected) {
      // Join các nhóm khi danh sách conversations thay đổi
      const groupIds = conversations
        .filter(conv => conv.type === 'group')
        .map(conv => conv.id);
      
      if (groupIds.length > 0) {
        console.log('Joining groups:', groupIds);
        socket.current.emit('joinGroups', { groupIds });
      }
    }
  }, [conversations]);

  useFocusEffect(
    useCallback(() => {
      setActiveTab('messages');
    }, [])
  );

  // Thêm useEffect để xử lý polling
  useEffect(() => {
    // Bắt đầu polling khi component mount
    pollingInterval.current = setInterval(() => {
      if (!isLoading) { // Chỉ load khi không đang trong quá trình load
        loadConversations();
      }
    }, 3000); // Mỗi 3 giây

    // Cleanup khi component unmount
    return () => {
      if (pollingInterval.current) {
        clearInterval(pollingInterval.current);
      }
    };
  }, [isLoading]); // Chỉ chạy lại khi loading thay đổi

  const updateGroupConversations = async (groups: Group[]) => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) return;
      
      const decoded = jwtDecode<{ email: string; id: string }>(token);
      const userEmail = decoded.email;

      const groupConversations = groups
        .filter(group => group.members.some(member => member.email === userEmail))
        .map(group => ({
          id: group.groupId,
          type: 'group' as const,
          name: group.name,
          avatar: group.avatar,
          lastMessage: group.lastMessage ? {
            content: group.lastMessage.content,
            senderEmail: group.lastMessage.senderEmail,
            timestamp: group.lastMessage.timestamp || new Date().toISOString(),
            type: group.lastMessage.type || 'text'
          } : undefined
        }));

      setConversations(prev => {
        const personalConversations = prev.filter(conv => conv.type === 'personal');
        const allConversations = [...personalConversations, ...groupConversations];
        return sortConversationsByTime(allConversations);
      });
    } catch (error) {
      // Bỏ qua lỗi khi cập nhật danh sách nhóm
      console.log('Error updating group conversations:', error);
    }
  };

  const addNewGroupConversation = (group: Group) => {
    try {
      const newConversation: Conversation = {
        id: group.groupId,
        type: 'group',
        name: group.name,
        avatar: group.avatar,
        lastMessage: group.lastMessage ? {
          content: group.lastMessage.content,
          senderEmail: group.lastMessage.senderEmail,
          timestamp: group.lastMessage.timestamp || new Date().toISOString(),
          type: group.lastMessage.type || 'text'
        } : undefined
      };

      setConversations(prev => {
        const existingIndex = prev.findIndex(conv => conv.id === group.groupId);
        if (existingIndex !== -1) {
          const updated = [...prev];
          updated[existingIndex] = newConversation;
          return sortConversationsByTime(updated);
        }
        return sortConversationsByTime([...prev, newConversation]);
      });
    } catch (error) {
      // Bỏ qua lỗi khi thêm nhóm mới
      console.log('Error adding new group conversation:', error);
    }
  };

  const updateGroupMembers = (groupId: string, newMembers: any[]) => {
    try {
      setConversations(prev => {
        return prev.map(conv => {
          if (conv.type === 'group' && conv.id === groupId) {
            return {
              ...conv,
              name: conv.name
            };
          }
          return conv;
        });
      });
    } catch (error) {
      // Bỏ qua lỗi khi cập nhật thành viên nhóm
      console.log('Error updating group members:', error);
    }
  };

  const sortConversationsByTime = (conversations: Conversation[]) => {
    return conversations.sort((a, b) => {
      if (!a.lastMessage && !b.lastMessage) return 0;
      if (!a.lastMessage) return 1;
      if (!b.lastMessage) return -1;
      
      const dateA = new Date(a.lastMessage.timestamp).getTime();
      const dateB = new Date(b.lastMessage.timestamp).getTime();
      return dateB - dateA;
    });
  };

  const loadConversations = async () => {
    try {
      setIsLoading(true);
      
      // Load friends and groups in parallel
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
              const lastMessage = messages[messages.length - 1];

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
                } : undefined
              };
            } catch (error) {
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
        const groups = groupsResponse.data;
        const groupConversations = groups.map(group => ({
          id: group.groupId,
          type: 'group' as const,
          name: group.name,
          avatar: group.avatar,
          lastMessage: group.lastMessage ? {
            content: group.lastMessage.content,
            senderEmail: group.lastMessage.senderEmail,
            timestamp: group.lastMessage.timestamp || new Date().toISOString(),
            type: group.lastMessage.type || 'text'
          } : undefined
        }));
        allConversations = [...allConversations, ...groupConversations];
      }

      // Sort all conversations by time
      setConversations(sortConversationsByTime(allConversations));
      
      // Emit socket event to join groups
      if (socket.current) {
        const groupIds = allConversations
          .filter(conv => conv.type === 'group')
          .map(conv => conv.id);
        
        if (groupIds.length > 0) {
          socket.current.emit('joinGroups', { groupIds });
        }
      }
    } catch (error) {
      console.log('Error loading conversations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGroupDeleted = (groupId: string) => {
    // Xóa nhóm khỏi danh sách cuộc trò chuyện
    setConversations(prev => prev.filter(conv => conv.id !== groupId));
    
    // Ngắt kết nối socket với nhóm đã bị giải tán
    if (socket.current) {
      socket.current.emit('leaveGroup', { groupId });
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
    
    // Nếu là file gửi từ S3
    if (message.metadata?.fileType?.startsWith('image')) {
      return 'Đã gửi ảnh';
    }
    if (message.metadata?.fileType && !message.metadata.fileType.startsWith('image') && !message.metadata.fileType.startsWith('video')) {
      return 'Đã gửi file';
    }
    if (typeof message.content === 'string' && message.content.includes('amazonaws.com')) {
      if (message.content.match(/\.(jpg|jpeg|png|gif|bmp|webp)$/i)) {
        return 'Đã gửi ảnh';
      }
      return 'Đã gửi file';
    }
    if (message.content.includes('amazonaws.com')) {
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
      try {
        setIsFromChat(true); // Đánh dấu là đang chuyển đến màn hình chat
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
      } catch (error) {
        console.log('Error navigating to chat:', error);
      }
    };

    const getLastMessageDisplay = () => {
      if (!item.lastMessage || !item.lastMessage.senderEmail) return '';
      
      const messageContent = getMessageContent(item.lastMessage);
      const isCurrentUser = item.lastMessage.senderEmail === currentUserEmail;

      if (isGroup) {
        return isCurrentUser 
          ? `Bạn: ${messageContent}`
          : `${item.lastMessage.senderEmail.split('@')[0]}: ${messageContent}`;
      } else {
        return isCurrentUser ? `Bạn: ${messageContent}` : messageContent;
      }
    };

    return (
      <TouchableOpacity 
        style={styles.conversationItem}
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
        </View>

        <View style={styles.conversationDetails}>
          <View style={styles.conversationHeader}>
            <Text style={styles.conversationName} numberOfLines={1}>
              {item.name}
            </Text>
            {item.lastMessage && (
              <Text style={styles.timeText}>
                {formatTimeAgo(item.lastMessage.timestamp)}
              </Text>
            )}
          </View>
          <Text style={styles.lastMessage} numberOfLines={1}>
            {getLastMessageDisplay()}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  // Cập nhật tin nhắn mới nhất
  const updateLastMessage = (conversationId: string, message: any, isGroup: boolean = false) => {
    setConversations(prev => {
      const updated = prev.map(conv => {
        if ((isGroup && conv.type === 'group' && conv.id === conversationId) ||
            (!isGroup && conv.type === 'personal' && conv.id === conversationId)) {
          return {
            ...conv,
            lastMessage: {
              content: message.content,
              senderEmail: message.senderEmail,
              timestamp: message.timestamp || new Date().toISOString(),
              type: message.type || 'text',
              metadata: message.metadata
            }
          };
        }
        return conv;
      });
      return sortConversationsByTime(updated);
    });
  };

  return (
    <SafeAreaViewRN style={{ flex: 1, backgroundColor: '#fff' }} edges={['top', 'bottom', 'left', 'right']}>
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
      <View style={{ flex: 1 }}>
        <FlatList
          data={conversations.filter(conv => 
            conv.name.toLowerCase().includes(searchQuery.toLowerCase())
          )}
          renderItem={renderConversationItem}
          keyExtractor={item => `${item.type}-${item.id}`}
          style={styles.list}
          onRefresh={loadConversations}
          refreshing={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                {searchQuery ? 'Không tìm thấy cuộc trò chuyện nào' : 'Chưa có cuộc trò chuyện nào'}
              </Text>
            </View>
          }
        />
      </View>

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
    </SafeAreaViewRN>
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
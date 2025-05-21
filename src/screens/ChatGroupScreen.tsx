import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, TextInput, StatusBar, FlatList, KeyboardAvoidingView, Platform, ScrollView, Alert, Image, Linking, Modal, ActivityIndicator } from 'react-native';
import { Text, Avatar } from '@rneui/themed';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { 
  getGroupMessages, 
  sendGroupMessage, 
  uploadGroupFile,
  addReactionToGroupMessage,
  recallGroupMessage, 
  deleteGroupMessage,
  searchUsers,
  getGroupMembers,
  getGroups,
  forwardGroupMessage,
  getFriends,
  addGroupMembers,
} from '../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import * as Clipboard from 'expo-clipboard';
import { jwtDecode } from 'jwt-decode';
import { io } from 'socket.io-client';
import { API_BASE_URL } from '@env';
import { SafeAreaView } from 'react-native-safe-area-context';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

type RouteParams = {
  groupId: string;
  groupName: string;
  avatar: string;
};

type ChatRouteParams = {
  receiverEmail: string;
  fullName: string;
  avatar: string;
  lastSeen?: string;
  messageToForward?: ExtendedGroupMessage;
};

const EMOJIS = [
  '😀', '😃', '😄', '😁', '😅', '😂', '🤣', '😊', '😇', '🙂', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚',
  '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🤩', '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁',
  '☹️', '😣', '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠', '😡', '🤬', '🤯', '😳', '🥵', '🥶', '😱', '😨',
];

const REACTIONS = [
  { emoji: '❤️', name: 'heart', type: 'reaction' },
  { emoji: '👍', name: 'thumbsup', type: 'reaction' },
  { emoji: '😄', name: 'haha', type: 'reaction' },
  { emoji: '😮', name: 'wow', type: 'reaction' },
  { emoji: '😢', name: 'sad', type: 'reaction' },
  { emoji: '😠', name: 'angry', type: 'reaction' }
];

interface MessageReaction {
  messageId: string;
  reaction: string;
  senderEmail: string;
}

interface ExtendedGroupMessage {
  messageId: string;
  groupId: string;
  senderEmail: string;
  receiverEmail: string;
  content: string;
  createdAt: string;
  status: 'sending' | 'sent' | 'read' | 'error';
  type: 'text' | 'image' | 'file' | 'audio' | 'video';
  senderName?: string;
  senderAvatar?: string;
  isCurrentUser?: boolean;
  reactions?: MessageReaction[];
  isRecalled?: boolean;
  metadata?: {
    fileName?: string;
    fileSize?: number;
    fileType?: string;
    fileUrl?: string;
    thumbnailUrl?: string;
    duration?: number;
    width?: number;
    height?: number;
  };
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
}

interface AddReactionResponse {
  success: boolean;
  data: ExtendedGroupMessage;
}

const isAddReactionResponse = (response: any): response is AddReactionResponse => {
  return response && typeof response.success === 'boolean' && response.data;
};

interface Group {
  groupId: string;
  name: string;
  description?: string;
  avatar?: string;
  members: any[];
  createdAt: string;
  lastMessage?: {
    content: string;
    senderEmail: string;
    timestamp: string;
  };
}

interface Friend {
  email: string;
  fullName: string;
  avatar: string;
  userId: string;
}

interface ForwardItem {
  id: string;
  name: string;
  avatar: string | undefined;
  subtext: string;
  type: 'friend' | 'group';
  data: Friend | Group;
}

interface ForwardResponse {
  success: boolean;
  message?: string;
  data?: any;
}

const ChatGroupScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute();
  const { groupId, groupName, avatar } = route.params as RouteParams;
  const [messages, setMessages] = useState<ExtendedGroupMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const flatListRef = useRef<FlatList>(null);
  const socket = useRef<any>(null);
  const [showEmojis, setShowEmojis] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<ExtendedGroupMessage | null>(null);
  const [showReactions, setShowReactions] = useState(false);
  const [showMessageActions, setShowMessageActions] = useState(false);
  const [currentUserEmail, setCurrentUserEmail] = useState<string>('');
  const [userAvatars, setUserAvatars] = useState<{ [key: string]: string }>({});
  const [memberCount, setMemberCount] = useState<number>(0);
  const [showForwardModal, setShowForwardModal] = useState(false);
  const [selectedMessageForForward, setSelectedMessageForForward] = useState<ExtendedGroupMessage | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [isLoadingForward, setIsLoadingForward] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [selectedFriendsToAdd, setSelectedFriendsToAdd] = useState<string[]>([]);
  const [friendsList, setFriendsList] = useState<Friend[]>([]);
  const [lastMessageId, setLastMessageId] = useState<string>('');
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const pollingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const messageSet = useRef<Set<string>>(new Set());
  // Thêm state để lưu danh sách thành viên hiện tại của nhóm
  const [currentGroupMembers, setCurrentGroupMembers] = useState<string[]>([]);

  useEffect(() => {
    const loadMessages = async () => {
      try {
        console.log('Loading messages for group:', groupId);
        const response = await getGroupMessages(groupId);
        console.log('Group messages response:', response);
        
        if (response.success && response.data.messages) {
          const token = await AsyncStorage.getItem('token');
          if (!token) return;
          const decoded = jwtDecode<{ email: string }>(token);
          const currentEmail = decoded.email;

          const messagesWithInfo = await Promise.all(response.data.messages.map(async message => {
            // Skip messages that are deleted for current user
            if (message.deletedFor && message.deletedFor.includes(currentEmail)) {
              return null;
            }

            const senderEmail = message.senderEmail;
            const userResponse = await searchUsers(senderEmail);
            const avatar = await fetchUserAvatar(senderEmail);
            let forcedType = message.type;
            if (isImageFile(message?.metadata?.fileName || '', message?.metadata?.fileType, message.content)) {
              forcedType = 'image';
            }
            return {
              ...message,
              groupId,
              senderName: userResponse.data?.fullName || 'Unknown',
              senderAvatar: avatar,
              isCurrentUser: senderEmail === currentEmail,
              type: forcedType || 'text'
            } as ExtendedGroupMessage;
          }));

          // Filter out null messages and sort by createdAt
          const filteredMessages = messagesWithInfo.filter(msg => msg !== null);
          const sortedMessages = filteredMessages.sort((a, b) => 
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          );

          // Update last message ID and message set
          if (sortedMessages.length > 0) {
            const lastMessage = sortedMessages[sortedMessages.length - 1];
            setLastMessageId(lastMessage.messageId);
            messageSet.current = new Set(sortedMessages.map(msg => msg.messageId));
          }

          setMessages(sortedMessages);
          setIsInitialLoad(false);
        } else {
          console.error('Invalid response format:', response);
          setMessages([]);
        }
      } catch (error) {
        console.error('Error loading messages:', error);
        Alert.alert('Lỗi', 'Không thể tải tin nhắn');
      } finally {
        setLoading(false);
      }
    };

    // Load messages initially
    loadMessages();

    // Set up polling interval
    const startPolling = () => {
      if (pollingTimeoutRef.current) {
        clearTimeout(pollingTimeoutRef.current);
      }

      pollingTimeoutRef.current = setTimeout(async () => {
        try {
          const response = await getGroupMessages(groupId);
          if (response.success && response.data.messages) {
            const token = await AsyncStorage.getItem('token');
            if (!token) return;
            const decoded = jwtDecode<{ email: string }>(token);
            const currentEmail = decoded.email;

            const lastMessage = response.data.messages[response.data.messages.length - 1];
            if (lastMessage && lastMessage.messageId !== lastMessageId) {
              // Only load new messages
              const newMessages = response.data.messages.filter(msg => !messageSet.current.has(msg.messageId));
              if (newMessages.length > 0) {
                const messagesWithInfo = await Promise.all(newMessages.map(async message => {
                  const senderEmail = message.senderEmail;
                  const userResponse = await searchUsers(senderEmail);
                  const avatar = await fetchUserAvatar(senderEmail);
                  let forcedType = message.type;
                  if (isImageFile(message?.metadata?.fileName || '', message?.metadata?.fileType, message.content)) {
                    forcedType = 'image';
                  }
                  return {
                    ...message,
                    groupId,
                    senderName: userResponse.data?.fullName || 'Unknown',
                    senderAvatar: avatar,
                    isCurrentUser: senderEmail === currentEmail,
                    type: forcedType || 'text'
                  } as ExtendedGroupMessage;
                }));

                // Add new message IDs to set
                messagesWithInfo.forEach(msg => messageSet.current.add(msg.messageId));

                setMessages(prev => {
                  const existingIds = new Set(prev.map(msg => msg.messageId));
                  const uniqueNewMessages = messagesWithInfo.filter(msg => !existingIds.has(msg.messageId));
                  const updatedMessages = [...prev, ...uniqueNewMessages];
                  
                  // Sort messages by createdAt
                  return updatedMessages.sort((a, b) => 
                    new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
                  );
                });
                setLastMessageId(messagesWithInfo[messagesWithInfo.length - 1].messageId);

                // Scroll to bottom after adding new messages
                if (flatListRef.current) {
                  flatListRef.current.scrollToEnd({ animated: true });
                }
              }
            }
          }
        } catch (error) {
          console.error('Error checking for new messages:', error);
        }
        startPolling();
      }, 5000); // Increased polling interval to 5 seconds
    };

    if (!isInitialLoad) {
      startPolling();
    }

    // Clean up interval on unmount
    return () => {
      if (pollingTimeoutRef.current) {
        clearTimeout(pollingTimeoutRef.current);
      }
    };
  }, [groupId, lastMessageId, isInitialLoad]);

  useEffect(() => {
    const initializeSocket = async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        if (!token) {
          console.error('No token found');
          return;
        }

        // Initialize socket connection
        const socketUrl = API_BASE_URL;
        console.log('Initializing socket connection to:', socketUrl);
        
        if (socket.current) {
          console.log('Disconnecting existing socket');
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
          // Join the group room
          socket.current.emit('joinGroup', { groupId });
        });

        socket.current.on('connect_error', (error: Error) => {
          console.error('Socket connection error:', error.message);
        });

        socket.current.on('error', (error: Error) => {
          console.error('Socket error:', error.message);
        });

        socket.current.on('disconnect', (reason: string) => {
          console.log('Socket disconnected:', reason);
        });

        // Socket event listeners
        socket.current.on('newGroupMessage', async (data: { groupId: string, message: any }) => {
          console.log('Received newGroupMessage event:', data);
          if (data.groupId === groupId) {
            try {
              const token = await AsyncStorage.getItem('token');
              if (!token) return;

              const decoded = jwtDecode<{ email: string }>(token);
              const userResponse = await searchUsers(data.message.senderEmail);
              const avatar = await fetchUserAvatar(data.message.senderEmail);
              let forcedType = data.message.type;
              if (isImageFile(data.message?.metadata?.fileName || '', data.message?.metadata?.fileType, data.message.content)) {
                forcedType = 'image';
              }
              const newMessage: ExtendedGroupMessage = {
                ...data.message,
                groupId,
                senderName: userResponse.data?.fullName || 'Unknown',
                senderAvatar: avatar,
                isCurrentUser: data.message.senderEmail === decoded.email,
                type: forcedType || 'text'
              };

              console.log('Adding new message to state:', newMessage);

              setMessages(prev => {
                const messageExists = prev.some(msg => msg.messageId === newMessage.messageId);
                if (!messageExists) {
                  const updatedMessages = [...prev, newMessage];
                  console.log('Updated messages:', updatedMessages);
                  // Update last message ID
                  setLastMessageId(newMessage.messageId);
                  return updatedMessages;
                }
                return prev;
              });

              // Scroll to bottom after adding new message
              if (flatListRef.current) {
                flatListRef.current.scrollToEnd({ animated: true });
              }
            } catch (error) {
              console.error('Error handling new message:', error);
            }
          }
        });

        // Listen for message sent confirmation
        socket.current.on('groupMessageSent', (data: { success: boolean, messageId: string }) => {
          console.log('Message sent confirmation:', data);
          if (!data.success) {
            Alert.alert('Lỗi', 'Không thể gửi tin nhắn');
          }
        });

        socket.current.on('groupNameChanged', (data: { groupId: string, newName: string }) => {
          console.log('Received groupNameChanged:', data);
          if (data.groupId === groupId) {
            navigation.setParams({ groupName: data.newName });
          }
        });

        socket.current.on('groupAvatarChanged', (data: { groupId: string, newAvatar: string }) => {
          console.log('Received groupAvatarChanged:', data);
          if (data.groupId === groupId) {
            navigation.setParams({ avatar: data.newAvatar });
          }
        });

        socket.current.on('groupMembersUpdated', async (data: { groupId: string, newMembers: any[] }) => {
          console.log('Received groupMembersUpdated:', data);
          if (data.groupId === groupId) {
            setMemberCount(data.newMembers.length);
            const token = await AsyncStorage.getItem('token');
            if (token) {
              const decoded = jwtDecode<{ email: string }>(token);
              const isUserAdmin = data.newMembers.some(
                (member: any) => member.email === decoded.email && member.role === 'admin'
              );
              setIsAdmin(isUserAdmin);
            }
          }
        });

        socket.current.on('messageReaction', (data: { messageId: string, reaction: string, senderEmail: string }) => {
          console.log('Received messageReaction event:', data);
          setMessages(prevMessages => {
            return prevMessages.map(msg => {
              if (msg.messageId === data.messageId) {
                const reactionExists = msg.reactions?.some(
                  r => r.senderEmail === data.senderEmail && r.reaction === data.reaction
                );
                
                if (reactionExists) {
                  return {
                    ...msg,
                    reactions: msg.reactions?.filter(
                      r => !(r.senderEmail === data.senderEmail && r.reaction === data.reaction)
                    ) || []
                  };
                } else {
                  return {
                    ...msg,
                    reactions: [...(msg.reactions || []), {
                      messageId: data.messageId,
                      reaction: data.reaction,
                      senderEmail: data.senderEmail
                    }]
                  };
                }
              }
              return msg;
            });
          });
        });

        socket.current.on('messageRecalled', (data: { messageId: string, senderEmail: string }) => {
          console.log('Received messageRecalled:', data);
          setMessages(prevMessages => {
            return prevMessages.map(msg => {
              if (msg.messageId === data.messageId) {
                return {
                  ...msg,
                  isRecalled: true,
                  content: 'Tin nhắn đã được thu hồi'
                };
              }
              return msg;
            });
          });
        });

        socket.current.on('messageDeleted', (data: { messageId: string }) => {
          console.log('Received messageDeleted:', data);
          setMessages(prevMessages => {
            return prevMessages.filter(msg => msg.messageId !== data.messageId);
          });
        });

        return () => {
          if (socket.current) {
            console.log('Cleaning up socket connection');
            socket.current.emit('leaveGroup', { groupId });
            socket.current.disconnect();
          }
        };
      } catch (error) {
        console.error('Error initializing socket:', error);
      }
    };

    initializeSocket();
  }, [groupId]);

  useEffect(() => {
    const getCurrentUserEmail = async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        if (token) {
          const decoded = jwtDecode<{ email: string; id: string }>(token);
          console.log('Current user info:', decoded);
          setCurrentUserEmail(decoded.email);
        }
      } catch (error) {
        console.error('Error getting current user:', error);
      }
    };
    getCurrentUserEmail();
  }, []);

  useEffect(() => {
    const loadGroupMembers = async () => {
      try {
        const response = await getGroupMembers(groupId);
        if (response.success) {
          setMemberCount(response.data.members.length);
          const token = await AsyncStorage.getItem('token');
          if (token) {
            const decoded = jwtDecode<{ email: string }>(token);
            const isUserAdmin = response.data.members.some(
              (member: any) => member.email === decoded.email && member.role === 'admin'
            );
            setIsAdmin(isUserAdmin);
          }
        }
      } catch (error) {
        console.error('Error loading group members:', error);
      }
    };

    loadGroupMembers();
  }, [groupId]);

  useEffect(() => {
    if (messages.length > 0) {
      flatListRef.current?.scrollToEnd({ animated: true });
    }
  }, [messages]);

  useEffect(() => {
    const loadGroups = async () => {
      try {
        const response = await getGroups();
        if (response.success) {
          setGroups(response.data);
        }
      } catch (error) {
        console.error('Error loading groups:', error);
      }
    };
    loadGroups();
  }, []);

  useEffect(() => {
    const loadForwardData = async () => {
      if (showForwardModal) {
        setIsLoadingForward(true);
        try {
          const [friendsResponse, groupsResponse] = await Promise.all([
            getFriends(),
            getGroups()
          ]);
          
          if (friendsResponse.success) {
            setFriends(friendsResponse.data);
          }
          if (groupsResponse.success) {
            setGroups(groupsResponse.data.filter(g => g.groupId !== groupId));
          }
        } catch (error) {
          console.error('Error loading forward data:', error);
          Alert.alert('Lỗi', 'Không thể tải danh sách bạn bè và nhóm');
        } finally {
          setIsLoadingForward(false);
        }
      }
    };

    loadForwardData();
  }, [showForwardModal, groupId]);

  //Load danh sách bạn bè khi mở modal
  useEffect(() => {
    if (showAddMemberModal) {
      const fetchFriends = async () => {
        try {
          const response = await getFriends();
          if (response.success) {
            setFriendsList(response.data);
          }
        } catch (err) {
          console.error('Lỗi tải danh sách bạn bè:', err);
        }
      };
      fetchFriends();
    }
  }, [showAddMemberModal]);

  useEffect(() => {
    if (showAddMemberModal) {
      const fetchData = async () => {
        try {
          // Lấy danh sách bạn bè
          const friendsResponse = await getFriends();
          if (friendsResponse.success) {
            setFriendsList(friendsResponse.data);
          }

          // Lấy danh sách thành viên hiện tại của nhóm
          const membersResponse = await getGroupMembers(groupId);
          if (membersResponse.success) {
            const memberEmails = membersResponse.data.members.map((member: any) => member.email);
            setCurrentGroupMembers(memberEmails);
          }
        } catch (err) {
          console.error('Lỗi tải dữ liệu:', err);
        }
      };
      fetchData();
    }
  }, [showAddMemberModal, groupId]);

  const fetchUserAvatar = async (email: string) => {
    try {
      if (!email) {
        console.warn('No email provided to fetchUserAvatar');
        return 'https://res.cloudinary.com/ds4v3awds/image/upload/v1743944990/l2eq6atjnmzpppjqkk1j.jpg';
      }

      const response = await searchUsers(email);
      if (response.success && response.data && response.data.avatar) {
        setUserAvatars(prev => ({
          ...prev,
          [email]: response.data.avatar
        }));
        return response.data.avatar;
      }
      return 'https://res.cloudinary.com/ds4v3awds/image/upload/v1743944990/l2eq6atjnmzpppjqkk1j.jpg';
    } catch (error) {
      console.error('Error fetching user avatar:', error);
      return 'https://res.cloudinary.com/ds4v3awds/image/upload/v1743944990/l2eq6atjnmzpppjqkk1j.jpg';
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;

    try {
      console.log('Sending message to group:', groupId);
      const response = await sendGroupMessage(groupId, newMessage.trim());
      console.log('Send message response:', response);
      
      if (response.success) {
        const token = await AsyncStorage.getItem('token');
        if (!token) return;

        const decoded = jwtDecode<{ email: string }>(token);
        const userResponse = await searchUsers(decoded.email);
        const avatar = await fetchUserAvatar(decoded.email);
        
        const newMessageWithInfo: ExtendedGroupMessage = {
          ...response.data,
          groupId,
          senderName: userResponse.data?.fullName || 'Unknown',
          senderAvatar: avatar,
          isCurrentUser: true,
          type: response.data.type || 'text'
        };

        // Add message ID to set
        messageSet.current.add(newMessageWithInfo.messageId);

        setMessages(prev => {
          const existingIds = new Set(prev.map(msg => msg.messageId));
          if (existingIds.has(newMessageWithInfo.messageId)) {
            return prev;
          }
          return [...prev, newMessageWithInfo];
        });
        setNewMessage('');
        // Update last message ID
        setLastMessageId(newMessageWithInfo.messageId);

        if (socket.current) {
          console.log('Emitting groupMessage event:', {
            groupId,
            message: newMessageWithInfo
          });
          socket.current.emit('groupMessage', {
            groupId,
            message: newMessageWithInfo
          });
        }

        // Scroll to bottom immediately after sending
        if (flatListRef.current) {
          flatListRef.current.scrollToEnd({ animated: true });
        }
      } else {
        console.error('Failed to send message:', response);
        Alert.alert('Lỗi', 'Không thể gửi tin nhắn');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Lỗi', 'Không thể gửi tin nhắn');
    }
  };

  const handleEmojiPress = (emoji: string) => {
    setNewMessage(prev => prev + emoji);
    setShowEmojis(false);
  };

  const isImageFile = (fileName: string, mimeType?: string, url?: string): boolean => {
    // Chuyển về chữ thường để kiểm tra không phân biệt hoa thường
    const lowerFileName = fileName ? fileName.toLowerCase() : '';
    const lowerUrl = url ? url.toLowerCase() : '';

    // Kiểm tra URL từ S3
    if (lowerUrl.includes('uploads3cnm.s3.amazonaws.com')) {
      return lowerUrl.endsWith('.jpg') || 
             lowerUrl.endsWith('.jpeg') || 
             lowerUrl.endsWith('.png') || 
             lowerUrl.endsWith('.gif') || 
             lowerUrl.endsWith('.bmp');
    }

    if (!lowerFileName) return false;
    
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp'];
    const hasImageExtension = imageExtensions.some(ext => lowerFileName.endsWith(ext));
    const hasImageMimeType = mimeType ? mimeType.toLowerCase().startsWith('image/') : false;
    
    return hasImageExtension || hasImageMimeType;
  };

  const handleFileUpload = async (fileAsset: {
    uri: string;
    name: string;
    mimeType?: string;
    size?: number;
  }) => {
    try {
      setUploading(true);
      console.log('File asset:', fileAsset);

      const formData = new FormData();
      formData.append('file', {
        uri: Platform.OS === 'android' ? fileAsset.uri : fileAsset.uri.replace('file://', ''),
        type: fileAsset.mimeType || 'application/octet-stream',
        name: fileAsset.name,
      } as any);

      const response = await uploadGroupFile(groupId, formData);
      console.log('Upload response:', response);
      
      if (response.success) {
        const fileMetadata = {
          fileName: response.data.originalname,
          fileSize: response.data.size,
          fileType: response.data.mimetype,
          fileUrl: response.data.url
        };

        console.log('File metadata:', fileMetadata);

        // Force type 'image' if file is image
        const isImage = isImageFile(
          fileMetadata.fileName, 
          fileMetadata.fileType, 
          response.data.url
        );
        const forcedType = isImage ? 'image' : 'file';

        const messageResponse = await sendGroupMessage(
          groupId,
          response.data.url,
          forcedType,
          fileMetadata
        );

        console.log('Message response:', messageResponse);

        if (messageResponse.success) {
          const token = await AsyncStorage.getItem('token');
          if (!token) return;

          const decoded = jwtDecode<{ email: string; id: string }>(token);
          const avatar = await fetchUserAvatar(decoded.email);

          const newMessageWithInfo: ExtendedGroupMessage = {
            ...messageResponse.data,
            groupId,
            messageId: messageResponse.data.messageId,
            senderEmail: decoded.email,
            content: response.data.url,
            createdAt: new Date().toISOString(),
            status: 'sent',
            senderName: decoded.email,
            senderAvatar: avatar,
            isCurrentUser: true,
            type: forcedType,
            metadata: fileMetadata
          };

          console.log('New message with info:', newMessageWithInfo);

          setMessages(prev => [...prev, newMessageWithInfo] as ExtendedGroupMessage[]);

          if (socket.current) {
            socket.current.emit('groupMessage', {
              groupId,
              message: newMessageWithInfo
            });
          }
        }
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      Alert.alert('Lỗi', 'Không thể tải lên file');
    } finally {
      setUploading(false);
    }
  };

  const handleFilePick = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true
      });

      console.log('Document picker result:', result); // Log để kiểm tra kết quả chọn file

      if (result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        // Đảm bảo có đầy đủ thông tin file
        const fileAsset = {
          uri: asset.uri,
          name: asset.name,
          mimeType: asset.mimeType,
          size: asset.size
        };
        await handleFileUpload(fileAsset);
      }
    } catch (error) {
      console.error('Error picking file:', error);
      Alert.alert('Lỗi', 'Không thể chọn file');
    }
  };

  const handleImagePick = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant permission to access your photos');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.5,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selectedImage = result.assets[0];
        setUploading(true);

        const formData = new FormData();
        formData.append('file', {
          uri: selectedImage.uri,
          type: 'image/jpeg',
          name: 'image.jpg',
        } as any);

        const response = await uploadGroupFile(groupId, formData);
        
        if (response.success) {
          // Always set type 'image'
          const messageResponse = await sendGroupMessage(
            groupId,
            response.data.url,
            'image',
            {
              fileName: 'image.jpg',
              fileSize: 0,
              fileType: 'image/jpeg'
            }
          );

          if (messageResponse.success) {
            const token = await AsyncStorage.getItem('token');
            if (!token) return;

            const decoded = jwtDecode<{ email: string; id: string }>(token);
            const avatar = await fetchUserAvatar(decoded.email);
            const newMessageWithInfo: ExtendedGroupMessage = {
              ...messageResponse.data,
              groupId,
              messageId: messageResponse.data.messageId,
              senderEmail: decoded.email,
              content: response.data.url,
              createdAt: new Date().toISOString(),
              status: 'sent',
              senderName: decoded.email,
              senderAvatar: avatar,
              isCurrentUser: true,
              type: 'image',
              metadata: {
                fileName: 'image.jpg',
                fileSize: 0,
                fileType: 'image/jpeg'
              }
            };
            setMessages(prev => [...prev, newMessageWithInfo] as ExtendedGroupMessage[]);
          }
        }
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Lỗi', 'Không thể chọn ảnh');
    } finally {
      setUploading(false);
    }
  };

  const handleReaction = async (messageId: string, emoji: string) => {
    if (!currentUserEmail) {
      console.warn('No currentUserEmail, cannot add reaction');
      return;
    }

    try {
      console.log('Adding reaction:', { messageId, emoji, currentUserEmail });
      
      // Update local state immediately for better UX
      setMessages(prevMessages => {
        const updatedMessages = prevMessages.map(msg => {
          if (msg.messageId === messageId) {
            console.log('Found message to update:', msg);
            // Check if this reaction already exists
            const reactionExists = msg.reactions?.some(
              r => r.senderEmail === currentUserEmail && r.reaction === emoji
            );

            if (reactionExists) {
              // If reaction exists, remove it (toggle off)
              const updatedReactions = msg.reactions?.filter(
                r => !(r.senderEmail === currentUserEmail && r.reaction === emoji)
              ) || [];
              console.log('Removing reaction, updated reactions:', updatedReactions);
              return {
                ...msg,
                reactions: updatedReactions
              };
            } else {
              // If reaction doesn't exist, add it
              const newReaction = {
                messageId,
                reaction: emoji,
                senderEmail: currentUserEmail
              };
              const updatedReactions = [...(msg.reactions || []), newReaction];
              console.log('Adding reaction, updated reactions:', updatedReactions);
              return {
                ...msg,
                reactions: updatedReactions
              };
            }
          }
          return msg;
        });
        console.log('Updated messages:', updatedMessages);
        return updatedMessages;
      });

      // Emit socket event
      if (socket.current) {
        console.log('Emitting messageReaction event:', {
          groupId,
          messageId,
          reaction: emoji,
          senderEmail: currentUserEmail
        });
        socket.current.emit('messageReaction', {
          groupId,
          messageId,
          reaction: emoji,
          senderEmail: currentUserEmail
        });
      }

      // Call API to persist the reaction
      const response = await addReactionToGroupMessage(groupId, messageId, emoji);
      console.log('API response:', response);
      
      if (!isAddReactionResponse(response)) {
        // If API call fails, revert the local state
        setMessages(prevMessages =>
          prevMessages.map(msg =>
            msg.messageId === messageId
              ? {
                  ...msg,
                  reactions: msg.reactions?.filter(
                    r => !(r.senderEmail === currentUserEmail && r.reaction === emoji)
                  ) || []
                }
              : msg
          )
        );
        Alert.alert('Lỗi', 'Không thể thêm reaction');
        return;
      }

      // Update the message with the API response data
      setMessages(prevMessages => {
        const updatedMessages = prevMessages.map(msg => {
          if (msg.messageId === messageId) {
            return {
              ...msg,
              reactions: response.data.reactions || msg.reactions
            };
          }
          return msg;
        });
        return updatedMessages;
      });

    } catch (error) {
      console.error('Error adding reaction:', error);
      // Revert local state on error
      setMessages(prevMessages =>
        prevMessages.map(msg =>
          msg.messageId === messageId
            ? {
                ...msg,
                reactions: msg.reactions?.filter(
                  r => !(r.senderEmail === currentUserEmail && r.reaction === emoji)
                ) || []
              }
            : msg
        )
      );
      Alert.alert('Lỗi', 'Không thể thêm reaction');
    }
  };

  const handleRecall = async (messageId: string) => {
    try {
      console.log('Attempting to recall message:', messageId);
      const recalledMessage = await recallGroupMessage(groupId, messageId);
      console.log('Recall response:', recalledMessage);
      
      // Update the message in the messages state
      setMessages(prevMessages => 
        prevMessages.map(msg => {
          if (msg.messageId === messageId) {
            return {
              ...msg,
              isRecalled: true,
              content: 'Tin nhắn đã được thu hồi'
            };
          }
          return msg;
        })
      );

      // Emit socket event
      if (socket.current) {
        console.log('Emitting messageRecall event');
        socket.current.emit('messageRecall', {
          groupId,
          messageId,
          senderEmail: currentUserEmail
        });
      }

      Alert.alert('Thành công', 'Tin nhắn đã được thu hồi');
    } catch (error: any) {
      console.error('Error recalling message:', error);
      Alert.alert('Lỗi', error.message || 'Không thể thu hồi tin nhắn');
    }
  };

  const handleDelete = async (messageId: string) => {
    try {
      await deleteGroupMessage(groupId, messageId);
      // Remove the message from the messages state
      setMessages(prevMessages => 
        prevMessages.filter(msg => msg.messageId !== messageId)
      );

      // No need to emit socket event since other users should still see the message
    } catch (error) {
      console.error('Error deleting message:', error);
      Alert.alert('Lỗi', 'Không thể xóa tin nhắn');
    }
  };

  const handleCopyText = (message: ExtendedGroupMessage) => {
    if (message.content) {
      Clipboard.setString(message.content);
      Alert.alert('Thành công', 'Đã sao chép văn bản');
    }
    setShowReactions(false);
  };

  const getForwardItems = (): ForwardItem[] => {
    const friendItems: ForwardItem[] = friends.map(friend => ({
      id: friend.email,
      name: friend.fullName,
      avatar: friend.avatar,
      subtext: friend.email,
      type: 'friend',
      data: friend
    }));

    const groupItems: ForwardItem[] = groups
      .filter(g => g.groupId !== groupId)
      .map(group => ({
        id: group.groupId,
        name: group.name,
        avatar: group.avatar,
        subtext: `${group.members.length} thành viên`,
        type: 'group',
        data: group
      }));

    return [...friendItems, ...groupItems];
  };

  const handleForwardItemPress = async (item: any) => {
    if (!selectedMessage) {
        Alert.alert('Lỗi', 'Vui lòng chọn tin nhắn cần chuyển tiếp');
        return;
    }

    if (selectedMessage.isRecalled) {
        Alert.alert('Lỗi', 'Không thể chuyển tiếp tin nhắn đã thu hồi');
        return;
    }

    try {
        const sourceGroupId = selectedMessage.groupId;
        const messageId = selectedMessage.messageId;

        console.log('Forwarding message:', {
            sourceGroupId,
            messageId,
            targetType: item.type,
            targetId: item.type === 'group' ? item.id : item.id // Use item.id for both cases
        });

        let response;
        if (item.type === 'friend') {
            response = await forwardGroupMessage(sourceGroupId, messageId, undefined, item.id);
        } else {
            response = await forwardGroupMessage(sourceGroupId, messageId, item.id);
        }

        if (response.success) {
            Alert.alert('Thành công', 'Đã chuyển tiếp tin nhắn');
            
            // Navigate to the appropriate chat screen
            if (item.type === 'friend') {
                navigation.navigate('Chat', {
                    receiverEmail: item.id, // Use item.id instead of item.email
                    fullName: item.name,
                    avatar: item.avatar
                });
            } else {
                navigation.navigate('ChatGroup', {
                    groupId: item.id,
                    groupName: item.name,
                    avatar: item.avatar
                });
            }
        } else {
            Alert.alert('Lỗi', response.message || 'Không thể chuyển tiếp tin nhắn');
        }
    } catch (error) {
        console.error('Error forwarding message:', error);
        Alert.alert('Lỗi', 'Không thể chuyển tiếp tin nhắn');
    } finally {
        setSelectedMessage(null);
        setShowForwardModal(false);
    }
};

  const renderForwardModal = () => {
    return (
      <Modal
        visible={showForwardModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowForwardModal(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowForwardModal(false)}
        >
          <View style={styles.forwardModal}>
            <Text style={styles.forwardModalTitle}>Chuyển tiếp tin nhắn</Text>
            
            {isLoadingForward ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#0068ff" />
              </View>
            ) : (
              <FlatList<ForwardItem>
                data={getForwardItems()}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.forwardItem}
                    onPress={() => handleForwardItemPress(item)}
                  >
                    <Avatar
                      rounded
                      source={item.avatar ? { uri: item.avatar } : undefined}
                      size={40}
                    />
                    <View style={styles.forwardItemInfo}>
                      <Text style={styles.forwardItemName}>
                        {item.name}
                      </Text>
                      <Text style={styles.forwardItemSubtext}>
                        {item.subtext}
                      </Text>
                    </View>
                  </TouchableOpacity>
                )}
              />
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    );
  };

  const handleMessageAction = (message: ExtendedGroupMessage, action: string) => {
    if (action === 'forward') {
      setSelectedMessageForForward(message);
      setShowForwardModal(true);
    } else if (action === 'copy') {
      handleCopyText(message);
    } else if (action === 'recall') {
      handleRecall(message.messageId);
    }
  };

  const formatTimeAgo = (timestamp: string) => {
    try {
      if (!timestamp) return '';
      const messageDate = new Date(timestamp);
      if (isNaN(messageDate.getTime())) return '';
      
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
    } catch (error) {
      console.error('Error formatting time:', error);
      return '';
    }
  };

  // Update MessageItem component
  const MessageItem: React.FC<{
    item: ExtendedGroupMessage;
    onLongPress: () => void;
    onImagePress: () => void;
    onFilePress: () => void;
    onCopyPress: () => void;
  }> = React.memo(({ item, onLongPress, onImagePress, onFilePress, onCopyPress }) => {
    const isCurrentUser = item.isCurrentUser;
    
    const renderReactions = () => {
      if (!item.reactions || item.reactions.length === 0) {
        return null;
      }

      // Group reactions by emoji
      const reactionGroups = item.reactions.reduce((acc, reaction) => {
        if (!acc[reaction.reaction]) {
          acc[reaction.reaction] = [];
        }
        acc[reaction.reaction].push(reaction);
        return acc;
      }, {} as { [key: string]: MessageReaction[] });

      return (
        <View style={[
          styles.reactionsContainer,
          isCurrentUser ? styles.reactionsRight : styles.reactionsLeft
        ]}>
          {Object.entries(reactionGroups).map(([emoji, reactions]) => (
            <View key={`${item.messageId}-${emoji}`} style={styles.reactionBadge}>
              <Text style={styles.reactionEmojiText}>{emoji}</Text>
              {reactions.length > 1 && (
                <Text style={styles.reactionCount}>{reactions.length}</Text>
              )}
            </View>
          ))}
        </View>
      );
    };

    const renderMessageContent = () => {
      if (item.isRecalled) {
        return (
          <Text style={[styles.messageText, styles.recalledMessage]}>
            Tin nhắn đã được thu hồi
          </Text>
        );
      }

      if (item.type === 'image' || 
          (item.type === 'file' && 
           item.metadata?.fileName && 
           isImageFile(item.metadata.fileName, item.metadata.fileType, item.content))) {
        return (
          <TouchableOpacity 
            onPress={onImagePress}
            style={[styles.imageBubble, { width: '100%', borderRadius: 16 }]}
          >
            <Image
              source={{ uri: item.content }}
              style={styles.messageImage}
              resizeMode="cover"
            />
          </TouchableOpacity>
        );
      }
      
      if (item.type === 'file') {
        const getFileIcon = () => {
          const fileName = item.metadata?.fileName?.toLowerCase() || '';
          const mimeType = item.metadata?.fileType?.toLowerCase() || '';

          if (fileName.endsWith('.pdf') || mimeType.includes('pdf')) return 'document-text';
          if (fileName.endsWith('.doc') || fileName.endsWith('.docx') || mimeType.includes('msword')) return 'document-text';
          if (fileName.endsWith('.xls') || fileName.endsWith('.xlsx')) return 'grid';
          if (fileName.endsWith('.ppt') || fileName.endsWith('.pptx')) return 'easel';
          if (mimeType.includes('video')) return 'videocam';
          if (mimeType.includes('audio')) return 'musical-notes';
          return 'document';
        };

        const getFileName = () => {
          let fullName = '';
          if (item.metadata?.fileName) {
            fullName = item.metadata.fileName;
          } else if (item.content) {
            const urlParts = item.content.split('/');
            fullName = urlParts[urlParts.length - 1];
          } else {
            return 'File';
          }

          const lastDotIndex = fullName.lastIndexOf('.');
          if (lastDotIndex === -1) return fullName;

          const name = fullName.slice(0, lastDotIndex);
          const ext = fullName.slice(lastDotIndex + 1).toLowerCase();

          if (name.length <= 8) return `${name}.${ext}`;
          return `${name.slice(0, 8)}...${name.slice(-4)}.${ext}`;
        };

        const fileSize = item.metadata?.fileSize 
          ? `${Math.round(item.metadata.fileSize / 1024)} KB` 
          : '2.9 MB';

        return (
          <TouchableOpacity 
            onPress={() => Linking.openURL(item.content)}
            style={styles.fileMessageWrapper}
          >
            <View style={styles.fileIconContainer}>
              <Ionicons 
                name={getFileIcon()} 
                size={20} 
                color="#0068ff" 
              />
            </View>
            <View style={styles.fileTextContainer}>
              <Text style={styles.fileMessageName} numberOfLines={1}>
                {getFileName()}
              </Text>
              <Text style={styles.fileMessageSize}>
                {fileSize}
              </Text>
            </View>
            <TouchableOpacity 
              style={styles.downloadButton}
              onPress={() => Linking.openURL(item.content)}
            >
              <Ionicons name="download-outline" size={14} color="#0068ff" />
            </TouchableOpacity>
          </TouchableOpacity>
        );
      }
      
      return (
        <Text style={[styles.messageText, !isCurrentUser && styles.theirMessageText]}>
          {item.content}
        </Text>
      );
    };

    return (
      <View style={[
        styles.messageContainer,
        isCurrentUser ? styles.myMessage : styles.theirMessage,
        { position: 'relative', alignSelf: isCurrentUser ? 'flex-end' : 'flex-start' }
      ]}>
        {!isCurrentUser && (
          <View style={styles.avatarContainer}>
            <Avatar
              rounded
              source={{ uri: item.senderAvatar || 'https://res.cloudinary.com/ds4v3awds/image/upload/v1743944990/l2eq6atjnmzpppjqkk1j.jpg' }}
              size={32}
              containerStyle={styles.avatar}
            />
          </View>
        )}
        <View style={[
          styles.messageContentContainer,
          isCurrentUser ? styles.myMessageContent : styles.theirMessageContent,
          item.isRecalled && styles.recalledMessageContainer
        ]}>
          {!isCurrentUser && (
            <Text style={styles.senderName}>
              {item.senderName || 'Unknown'}
            </Text>
          )}
          <TouchableOpacity 
            onLongPress={onLongPress}
            activeOpacity={0.7}
            style={[
              styles.messageBubble,
              isCurrentUser ? styles.myBubble : styles.theirBubble,
              item.isRecalled && styles.recalledMessageBubble
            ]}
          >
            {renderMessageContent()}
          </TouchableOpacity>
          {renderReactions()}
          <View style={styles.messageFooter}>
            <Text style={[styles.messageTime, isCurrentUser ? styles.myTime : styles.theirTime]}>
              {formatTimeAgo(item.createdAt)}
            </Text>
          </View>
        </View>
      </View>
    );
  });

  const renderMessage = React.useCallback(({ item }: { item: ExtendedGroupMessage }) => {
    const handleLongPress = () => {
      console.log('Message long pressed:', item);
      setSelectedMessage(item);
      setShowMessageActions(true);
    };

    const handleImagePress = () => {
      if (item.type === 'image') {
        Linking.openURL(item.content);
      }
    };

    const handleFilePress = () => {
      if (item.type === 'file' && item.metadata?.fileUrl) {
        Linking.openURL(item.metadata.fileUrl);
      }
    };

    return (
      <MessageItem
        key={item.messageId}
        item={item}
        onLongPress={handleLongPress}
        onImagePress={handleImagePress}
        onFilePress={handleFilePress}
        onCopyPress={() => handleCopyText(item)}
      />
    );
  }, []);

  const keyExtractor = React.useCallback((item: ExtendedGroupMessage) => 
    item.messageId, []);

  const renderMessageActions = () => {
    if (!selectedMessage) return null;
    
    const isCurrentUser = selectedMessage.senderEmail === currentUserEmail;
    const timeDiff = new Date().getTime() - new Date(selectedMessage.createdAt).getTime();
    const canRecall = timeDiff <= 2 * 60 * 1000; // 2 phút

    return (
      <View style={styles.messageActions}>
        {/* Message Actions Section */}
        {isCurrentUser && (
          <View style={styles.messageActionsSection}>
            <TouchableOpacity 
              style={styles.messageActionButton}
              onPress={() => {
                setShowMessageActions(false);
                handleCopyText(selectedMessage);
              }}
            >
              <Ionicons name="copy-outline" size={24} color="#666" />
              <Text style={styles.messageActionText}>Sao chép</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.messageActionButton}
              onPress={() => {
                setShowMessageActions(false);
                setSelectedMessageForForward(selectedMessage);
                setShowForwardModal(true);
              }}
            >
              <Ionicons name="share-outline" size={24} color="#666" />
              <Text style={styles.messageActionText}>Chuyển tiếp</Text>
            </TouchableOpacity>

            {canRecall && (
              <TouchableOpacity 
                style={styles.messageActionButton}
                onPress={() => {
                  setShowMessageActions(false);
                  handleRecall(selectedMessage.messageId);
                }}
              >
                <Ionicons name="refresh" size={24} color="#666" />
                <Text style={styles.messageActionText}>Thu hồi</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity 
              style={styles.messageActionButton}
              onPress={() => {
                setShowMessageActions(false);
                handleDelete(selectedMessage.messageId);
              }}
            >
              <Ionicons name="trash" size={24} color="#666" />
              <Text style={styles.messageActionText}>Xóa</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  const renderReactionAndActionModal = () => {
    return (
      <Modal
        visible={showMessageActions}
        transparent
        animationType="fade"
        onRequestClose={() => setShowMessageActions(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowMessageActions(false)}
        >
          <View style={styles.modalContent}>
            {selectedMessage && (
              <View style={styles.messageActions}>
                {/* Reactions Section */}
                <View style={styles.reactionsSection}>
                  {REACTIONS.map((reaction) => (
                    <TouchableOpacity
                      key={reaction.name}
                      style={styles.reactionButton}
                      onPress={() => {
                        handleReaction(selectedMessage.messageId, reaction.emoji);
                        setShowMessageActions(false);
                      }}
                    >
                      <Text style={styles.reactionEmoji}>{reaction.emoji}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Message Actions Section */}
                <View style={styles.messageActionsSection}>
                  {/* Common actions for all messages */}
                  <TouchableOpacity 
                    style={styles.messageActionButton}
                    onPress={() => {
                      setShowMessageActions(false);
                      handleCopyText(selectedMessage);
                    }}
                  >
                    <Ionicons name="copy-outline" size={24} color="#666" />
                    <Text style={styles.messageActionText}>Sao chép</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={styles.messageActionButton}
                    onPress={() => {
                      setShowMessageActions(false);
                      setSelectedMessageForForward(selectedMessage);
                      setShowForwardModal(true);
                    }}
                  >
                    <Ionicons name="share-outline" size={24} color="#666" />
                    <Text style={styles.messageActionText}>Chuyển tiếp</Text>
                  </TouchableOpacity>

                  {/* Actions only for own messages */}
                  {selectedMessage.senderEmail === currentUserEmail && (
                    <>
                      {(() => {
                        const messageTime = new Date(selectedMessage.createdAt).getTime();
                        const currentTime = new Date().getTime();
                        const timeDiff = currentTime - messageTime;
                        const canRecall = timeDiff <= 2 * 60 * 1000; // 2 phút
                        console.log('Message time:', messageTime);
                        console.log('Current time:', currentTime);
                        console.log('Time difference:', timeDiff);
                        console.log('Can recall:', canRecall);
                        return canRecall && (
                          <TouchableOpacity 
                            style={styles.messageActionButton}
                            onPress={() => {
                              setShowMessageActions(false);
                              handleRecall(selectedMessage.messageId);
                            }}
                          >
                            <Ionicons name="refresh" size={24} color="#666" />
                            <Text style={styles.messageActionText}>Thu hồi</Text>
                          </TouchableOpacity>
                        );
                      })()}

                      <TouchableOpacity 
                        style={styles.messageActionButton}
                        onPress={() => {
                          setShowMessageActions(false);
                          handleDelete(selectedMessage.messageId);
                        }}
                      >
                        <Ionicons name="trash" size={24} color="#666" />
                        <Text style={styles.messageActionText}>Xóa</Text>
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    );
  };

  // Thêm thành viên vào nhóm
  const handleAddMembers = async () => {
    try {
      console.log('Mời các thành viên:', selectedFriendsToAdd);
      
      // Lọc ra những thành viên chưa có trong nhóm
      const newMembers = selectedFriendsToAdd.filter(email => !currentGroupMembers.includes(email));
      
      if (newMembers.length === 0) {
        Alert.alert('Thông báo', 'Các thành viên đã được chọn đều đã có trong nhóm');
        setShowAddMemberModal(false);
        setSelectedFriendsToAdd([]);
        return;
      }

      // Chuyển đổi email thành ID từ friendsList
      const memberIds = newMembers.map(email => {
        const friend = friendsList.find(f => f.email === email);
        if (!friend) {
          throw new Error(`Không tìm thấy người dùng với email: ${email}`);
        }
        return friend.userId;
      });

      console.log('Chuyển đổi thành ID:', memberIds);

      // Gọi API thêm thành viên
      const response = await addGroupMembers(groupId, memberIds);
      console.log('Server response:', response);

      if (response.success) {
        // Cập nhật số lượng thành viên
        const membersResponse = await getGroupMembers(groupId);
        if (membersResponse.success) {
          setMemberCount(membersResponse.data.members.length);
          // Cập nhật lại danh sách thành viên hiện tại
          const memberEmails = membersResponse.data.members.map((member: any) => member.email);
          setCurrentGroupMembers(memberEmails);
          
          // Chỉ hiển thị thông báo thành công nếu có thành viên mới được thêm vào
          if (newMembers.length > 0) {
            Alert.alert('Thành công', `Đã thêm ${newMembers.length} thành viên vào nhóm`);
          }
        }
        
        // Đóng modal và reset form
        setShowAddMemberModal(false);
        setSelectedFriendsToAdd([]);
      } else {
        throw new Error(response.message || 'Không thể thêm thành viên');
      }
    } catch (error: any) {
      console.error('Lỗi khi thêm thành viên:', error);
      Alert.alert('Lỗi', error.message || 'Không thể thêm thành viên vào nhóm');
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }} edges={['top', 'bottom', 'left', 'right']}>
      <StatusBar backgroundColor="#0068ff" barStyle="light-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={styles.userInfo}>
            <Avatar
              rounded
              source={{ uri: avatar || 'https://randomuser.me/api/portraits/men/1.jpg' }}
              size={40}
            />
            <View style={styles.nameContainer}>
              <Text style={styles.userName}>{groupName}</Text>
              <Text style={styles.lastSeen}>
                {memberCount} thành viên
              </Text>
            </View>
          </View>
        </View>
        
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.headerIcon}>
            <Ionicons name="call" size={24} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerIcon}>
            <Ionicons name="videocam" size={24} color="#fff" />
          </TouchableOpacity>
          {isAdmin && (
            <TouchableOpacity
              style={styles.headerIcon}
              onPress={() => setShowAddMemberModal(true)}
            >
              <Ionicons name="person-add" size={24} color="#fff" />
            </TouchableOpacity>
          )}
          
          <TouchableOpacity 
            style={styles.headerIcon}
            onPress={() => navigation.navigate('GroupInfo', { 
              groupId,
              groupName,
              avatar
            })}
          >
            <Ionicons name="ellipsis-vertical" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Chat Content */}
      <KeyboardAvoidingView
        style={styles.chatContent}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={keyExtractor}
          contentContainerStyle={styles.messagesContainer}
          onContentSizeChange={() => {
            if (!loading) {
              flatListRef.current?.scrollToEnd({ animated: true });
            }
          }}
          onLayout={() => {
            if (!loading) {
              flatListRef.current?.scrollToEnd({ animated: true });
            }
          }}
          removeClippedSubviews={true}
          maxToRenderPerBatch={5}
          windowSize={5}
          initialNumToRender={10}
          updateCellsBatchingPeriod={50}
          inverted={false}
          showsVerticalScrollIndicator={false}
          style={styles.flatList}
        />

        {/* Emoji Picker */}
        {showEmojis && (
          <View style={styles.emojiContainer}>
            <ScrollView 
              horizontal={false} 
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.emojiScrollContainer}
            >
              <View style={styles.emojiGrid}>
                {EMOJIS.map((emoji) => (
                  <TouchableOpacity
                    key={emoji}
                    style={styles.emojiButton}
                    onPress={() => handleEmojiPress(emoji)}
                  >
                    <Text style={styles.emojiText}>{emoji}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>
        )}

        {/* Bottom Input Bar */}
        <View style={styles.inputContainer}>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              placeholder="Tin nhắn"
              placeholderTextColor="#666"
              value={newMessage}
              onChangeText={setNewMessage}
              multiline
            />
            <View style={styles.inputRightIcons}>
              <TouchableOpacity 
                style={styles.inputIcon}
                onPress={() => setShowEmojis(!showEmojis)}
              >
                <Ionicons 
                  name={showEmojis ? "close-outline" : "happy-outline"} 
                  size={24} 
                  color="#666" 
                />
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.inputIcon}
                onPress={handleImagePick}
                disabled={uploading}
              >
                <Ionicons name="image-outline" size={24} color="#666" />
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.inputIcon}
                onPress={handleFilePick}
                disabled={uploading}
              >
                <Ionicons name="document-outline" size={24} color="#666" />
              </TouchableOpacity>
              {newMessage.trim() && (
                <TouchableOpacity 
                  style={[styles.inputIcon, styles.sendButton]}
                  onPress={handleSendMessage}
                >
                  <Ionicons name="send" size={24} color="#0068ff" />
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>

      {renderReactionAndActionModal()}
      {renderForwardModal()}
      {showAddMemberModal && (
        <Modal visible transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.forwardModal}>
              <View style={styles.modalHeader}>
                <Text style={styles.forwardModalTitle}>Thêm thành viên</Text>
                <TouchableOpacity 
                  style={styles.closeButton}
                  onPress={() => {
                    setShowAddMemberModal(false);
                    setSelectedFriendsToAdd([]);
                  }}
                >
                  <Ionicons name="close" size={24} color="#666" />
                </TouchableOpacity>
              </View>
              <FlatList
                data={friendsList}
                keyExtractor={item => item.email}
                renderItem={({ item }) => {
                  const isSelected = selectedFriendsToAdd.includes(item.email);
                  const isMember = currentGroupMembers.includes(item.email);
                  
                  return (
                    <TouchableOpacity
                      style={[
                        styles.forwardItem,
                        isMember && styles.disabledItem
                      ]}
                      onPress={() => {
                        if (!isMember) {
                          if (isSelected) {
                            setSelectedFriendsToAdd(prev => prev.filter(email => email !== item.email));
                          } else {
                            setSelectedFriendsToAdd(prev => [...prev, item.email]);
                          }
                        }
                      }}
                      disabled={isMember}
                    >
                      <Avatar rounded source={{ uri: item.avatar }} size={40} />
                      <View style={styles.forwardItemInfo}>
                        <Text style={styles.forwardItemName}>{item.fullName}</Text>
                        <Text style={styles.forwardItemSubtext}>{item.email}</Text>
                        {isMember && (
                          <Text style={styles.memberText}>Đã là thành viên</Text>
                        )}
                      </View>
                      {!isMember && (
                        <Ionicons
                          name={isSelected ? "checkbox" : "square-outline"}
                          size={24}
                          color="#0068ff"
                        />
                      )}
                    </TouchableOpacity>
                  );
                }}
              />
              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={[styles.addMemberButton, selectedFriendsToAdd.length === 0 && styles.disabledButton]}
                  onPress={handleAddMembers}
                  disabled={selectedFriendsToAdd.length === 0}
                >
                  <Text style={styles.addMemberButtonText}>Thêm thành viên</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

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
    padding: 10,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: 10,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  nameContainer: {
    marginLeft: 10,
  },
  userName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  lastSeen: {
    color: '#fff',
    fontSize: 12,
    opacity: 0.8,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIcon: {
    marginLeft: 15,
  },
  chatContent: {
    flex: 1,
    backgroundColor: '#fff',
  },
  messagesContainer: {
    paddingVertical: 16,
  },
  messageContainer: {
    flexDirection: 'row',
    marginVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'flex-start',
  },
  myMessage: {
    justifyContent: 'flex-end',
    marginLeft: 50,
  },
  theirMessage: {
    justifyContent: 'flex-start',
    marginRight: 50,
  },
  avatarContainer: {
    width: 32,
    marginRight: 8,
    alignSelf: 'flex-start',
  },
  avatar: {
    backgroundColor: '#E4E6EB',
  },
  messageContentContainer: {
    maxWidth: '80%',
    borderRadius: 12,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
    elevation: 3,
  },
  myMessageContent: {
    alignItems: 'flex-end',
    backgroundColor: '#0084ff',
    marginLeft: 'auto',
  },
  theirMessageContent: {
    alignItems: 'flex-start',
    backgroundColor: '#E4E6EB',
    marginRight: 'auto',
  },
  senderName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1E88E5',
    marginBottom: 4,
    paddingHorizontal: 4,
  },
  messageBubble: {
    width: '100%',
    padding: 4,
    overflow: 'visible',
    minHeight: 40,
    position: 'relative',
    paddingBottom: 20,
  },
  myBubble: {
    alignItems: 'flex-end',
  },
  theirBubble: {
    alignItems: 'flex-start',
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
    color: '#fff',
  },
  theirMessageText: {
    color: '#000',
  },
  messageTime: {
    fontSize: 11,
    color: '#65676B',
  },
  myTime: {
    color: '#fff',
  },
  theirTime: {
    color: '#65676B',
  },
  imageContainer: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#fff',
  },
  messageImage: {
    width: 240,
    height: 240,
    borderRadius: 16,
  },
  fileContainer: {
    width: 280,
    borderRadius: 8,
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  myFileContainer: {
    backgroundColor: '#fff',
  },
  theirFileContainer: {
    backgroundColor: '#fff',
  },
  fileContentContainer: {
    padding: 8,
    paddingRight: 12,
  },
  fileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  fileIconWrapper: {
    position: 'absolute',
    right: 4,
    bottom: 4,
    zIndex: 2,
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderRadius: 12,
    padding: 2,
  },
  fileInfoContainer: {
    flex: 1,
    width: 220,
  },
  fileName: {
    fontSize: 14,
    color: '#000000',
    marginBottom: 2,
  },
  fileSize: {
    fontSize: 12,
    color: '#666666',
  },
  actionButtons: {
    flexDirection: 'row',
    marginLeft: 8,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 6,
    backgroundColor: '#0084ff',
  },
  elevation: {
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  inputContainer: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    padding: 10,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
    paddingHorizontal: 10,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    paddingHorizontal: 10,
    fontSize: 16,
  },
  inputIcon: {
    padding: 5,
  },
  inputRightIcons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sendButton: {
    backgroundColor: '#fff',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 5,
  },
  emojiContainer: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    maxHeight: 200,
    width: '100%',
  },
  emojiScrollContainer: {
    paddingVertical: 10,
  },
  emojiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    paddingHorizontal: 10,
  },
  emojiButton: {
    width: '12.5%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 5,
  },
  emojiText: {
    fontSize: 22,
    color: '#000',
  },
  myImageContainer: {
    alignSelf: 'flex-end',
  },
  theirImageContainer: {
    alignSelf: 'flex-start',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  reactionAndActionContainer: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 15,
    width: '90%',
    maxHeight: '80%',
  },
  reactionSection: {
    marginBottom: 15,
  },
  actionSection: {
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingTop: 15,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#666',
  },
  reactionMenu: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  reactionButton: {
    padding: 8,
    marginHorizontal: 4,
  },
  reactionEmoji: {
    fontSize: 14,
    marginHorizontal: 1,
  },
  adminActionsMenu: {
    backgroundColor: '#f8f8f8',
    borderRadius: 10,
    padding: 10,
  },
  adminActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  adminActionText: {
    marginLeft: 15,
    fontSize: 16,
    color: '#0068ff',
  },
  messageActionsMenu: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 15,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    width: '80%',
  },
  messageActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  messageActionText: {
    marginLeft: 15,
    fontSize: 16,
    color: '#0068ff',
  },
  forwardModal: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 15,
    width: '90%',
    maxHeight: '80%',
  },
  forwardModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  forwardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  forwardItemInfo: {
    marginLeft: 10,
    flex: 1,
  },
  forwardItemName: {
    fontSize: 16,
    fontWeight: '500',
  },
  forwardItemSubtext: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  messageActions: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 15,
    width: '90%',
    maxWidth: 300,
  },
  reactionsSection: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  messageActionsSection: {
    marginTop: 10,
  },
  actionText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  reactionsContainer: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    marginTop: 2,
    marginBottom: 2,
    maxWidth: '100%',
    alignItems: 'center',
  },
  reactionsRight: {
    justifyContent: 'flex-end',
  },
  reactionsLeft: {
    justifyContent: 'flex-start',
  },
  reactionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 1,
    marginRight: 2,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  reactionEmojiText: {
    fontSize: 12,
    marginRight: 1,
  },
  reactionCount: {
    fontSize: 10,
    color: '#666',
    marginLeft: 1,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 15,
    margin: 20,
    maxWidth: '90%',
  },
  imageBubble: {
    maxWidth: 200,
    borderRadius: 12,
    overflow: 'hidden',
  },
  flatList: {
    flex: 1,
  },
  fileMessageWrapper: {
    backgroundColor: '#F5F5F5',
    padding: 6,
    minWidth: 180,
    maxWidth: 240,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    margin: 4,
  },
  fileIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
    flexShrink: 0,
  },
  fileTextContainer: {
    flex: 1,
    minWidth: 0,
    marginRight: 4,
  },
  fileMessageName: {
    fontSize: 12,
    color: '#000000',
    marginBottom: 1,
  },
  fileMessageSize: {
    fontSize: 10,
    color: '#666666',
  },
  downloadButton: {
    padding: 3,
    borderRadius: 4,
    backgroundColor: '#E3F2FD',
    flexShrink: 0,
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 2,
    paddingHorizontal: 4,
  },
  heartIconAbsoluteOuter: {
    position: 'absolute',
    right: 8,
    bottom: 8,
    zIndex: 1000,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 12,
    padding: 4,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  closeButton: {
    padding: 5,
  },
  modalFooter: {
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  addMemberButton: {
    backgroundColor: '#0068ff',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#cccccc',
  },
  addMemberButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  disabledItem: {
    opacity: 0.6,
    backgroundColor: '#f5f5f5',
  },
  memberText: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 2,
  },
  recalledMessageContainer: {
    opacity: 0.9,
  },
  recalledMessageBubble: {
    backgroundColor: '#f5f5f5',
  },
  recalledMessage: {
    color: '#999',
    fontSize: 14,
    fontStyle: 'italic',
  },
});

export default ChatGroupScreen; 
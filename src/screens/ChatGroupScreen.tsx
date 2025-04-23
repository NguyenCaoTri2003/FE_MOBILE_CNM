import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, SafeAreaView, TouchableOpacity, TextInput, StatusBar, FlatList, KeyboardAvoidingView, Platform, ScrollView, Alert, Image, Linking, Modal, ActivityIndicator } from 'react-native';
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
  Message,
  GroupMessage,
  searchUsers,
  getGroupMembers,
  getGroups,
  forwardGroupMessage,
  getFriends,
  addGroupMembers,
  removeGroupMember
} from '../services/api';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import * as Clipboard from 'expo-clipboard';
import { jwtDecode } from 'jwt-decode';
import { socketService } from '../services/socket';

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
  { emoji: '😠', name: 'angry', type: 'reaction' },
  { emoji: '📋', name: 'copy', type: 'action' },
  { emoji: '↪️', name: 'forward', type: 'action' }
];
const convertToEmoji = (text: string) => {
  return text
    .replace(/:\)/g, "😊")           // :) -> 😊
    .replace(/:D/g, "😄")            // :D -> 😄
    .replace(/:P/g, "😛")            // :P -> 😛
    .replace(/:\/\//g, "😕")         // :// -> 😕 (hoặc có thể là :\// tùy chỉnh)
    .replace(/<3/g, "❤️")            // <3 -> ❤️
    .replace(/;\)/g, "😉")           // ;) -> 😉
    .replace(/:O/g, "😲")            // :O -> 😲
    .replace(/:'\(/g, "😢")           // :'( -> 😢
    .replace(/XD/g, "😂")            // XD -> 😂
    .replace(/:-\(/g, "☹️")          // :- ( -> ☹️
    .replace(/:|/g, "😐")            // :| -> 😐
    .replace(/:3/g, "😻")            // :3 -> 😻
    .replace(/B-\)/g, "😎")          // B-) -> 😎
    .replace(/<3/g, "❤️")            // <3 -> ❤️
    .replace(/\(y\)/g, "👍")          // (y) -> 👍 (y = like)
    .replace(/\(n\)/g, "👎")          // (n) -> 👎 (n = dislike)
    .replace(/:\*/g, "😘");          // :* -> 😘
};
const [showAddMemberModal, setShowAddMemberModal] = useState(false);
const [selectedFriendsToAdd, setSelectedFriendsToAdd] = useState<string[]>([]);
const [friendsList, setFriendsList] = useState<Friend[]>([]);



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
  data: {
    messageId: string;
    reactions: {
      [key: string]: string[];
    };
  };
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
  const [isTyping, setIsTyping] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const socket = useRef<any>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const [hasInteracted, setHasInteracted] = useState(false);
  const [showEmojis, setShowEmojis] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<ExtendedGroupMessage | null>(null);
  const [showReactions, setShowReactions] = useState(false);
  const [selectedMessageForActions, setSelectedMessageForActions] = useState<ExtendedGroupMessage | null>(null);
  const [showMessageActions, setShowMessageActions] = useState(false);
  const [currentUserEmail, setCurrentUserEmail] = useState<string>('');
  const [userAvatars, setUserAvatars] = useState<{ [key: string]: string }>({});
  const [memberCount, setMemberCount] = useState<number>(0);
  const [showForwardModal, setShowForwardModal] = useState(false);
  const [selectedMessageForForward, setSelectedMessageForForward] = useState<ExtendedGroupMessage | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [forwardTab, setForwardTab] = useState<'friends' | 'groups'>('friends');
  const [isLoadingForward, setIsLoadingForward] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAdminActions, setShowAdminActions] = useState(false);

  useEffect(() => {
    loadMessages();
    setupSocketListeners();
  }, []);

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
  

  const fetchUserAvatar = async (email: string) => {
    try {
      const response = await searchUsers(email);
      if (response.success && response.data) {
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

  const loadMessages = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) return;

      const decoded = jwtDecode<{ email: string; id: string }>(token);
      console.log('Current user email in loadMessages:', decoded.email);
      
      const response = await getGroupMessages(groupId);
      console.log('Group messages response:', response);
      
      if (response.success && response.data.messages) {
        const messagesWithInfo = await Promise.all(response.data.messages.map(async message => {
          const avatar = await fetchUserAvatar(message.senderEmail);
          return {
            ...message,
            groupId,
            senderName: message.senderEmail,
            senderAvatar: avatar,
            isCurrentUser: message.senderEmail === decoded.email
          } as ExtendedGroupMessage;
        }));
        setMessages(messagesWithInfo);
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

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;

    try {
      // Lưu tin nhắn hiện tại để hiển thị ngay lập tức
      const messageToShow = newMessage.trim();
      setNewMessage('');
      
      // Tạo tin nhắn tạm thời để hiển thị ngay lập tức
      const tempMessage: ExtendedGroupMessage = {
        messageId: `temp-${Date.now()}`,
        groupId,
        senderEmail: currentUserEmail,
        receiverEmail: groupId,
        content: messageToShow,
        createdAt: new Date().toISOString(),
        status: 'sending',
        type: 'text',
        senderName: currentUserEmail,
        senderAvatar: await fetchUserAvatar(currentUserEmail),
        isCurrentUser: true
      };
      
      setMessages(prev => [...prev, tempMessage] as ExtendedGroupMessage[]);
      
      // Gửi tin nhắn qua socket để cải thiện tốc độ
      socketService.emitGroupMessage(groupId, messageToShow);
      
      // Sau đó gửi qua API để lưu vào database
      const response = await sendGroupMessage(groupId, messageToShow);
      
      if (response.success) {
        // Cập nhật tin nhắn tạm thời với thông tin thực từ server
        setMessages(prev => {
          return prev.map(msg => {
            if (msg.messageId === tempMessage.messageId) {
              return {
                ...msg,
                messageId: response.data.messageId,
                status: 'sent'
              };
            }
            return msg;
          });
        });
      } else {
        // Đánh dấu tin nhắn là lỗi nếu gửi thất bại
        setMessages(prev => {
          return prev.map(msg => {
            if (msg.messageId === tempMessage.messageId) {
              return {
                ...msg,
                status: 'error'
              };
            }
            return msg;
          });
        });
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

  const handleFilePick = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true
      });

      if (result.assets && result.assets.length > 0) {
        await handleFileUpload(result.assets[0]);
      }
    } catch (error) {
      console.error('Error picking file:', error);
      Alert.alert('Lỗi', 'Không thể chọn file');
    }
  };

  const handleFileUpload = async (fileAsset: {
    uri: string;
    name: string;
    mimeType?: string;
    size?: number;
  }) => {
    try {
      setUploading(true);
      
      const formData = new FormData();
      formData.append('file', {
        uri: Platform.OS === 'android' ? fileAsset.uri : fileAsset.uri.replace('file://', ''),
        type: fileAsset.mimeType || 'application/octet-stream',
        name: fileAsset.name,
      } as any);

      const response = await uploadGroupFile(groupId, formData);
      
      if (response.success) {
        const messageResponse = await sendGroupMessage(
          groupId,
          response.data.url,
          response.data.type,
          {
            fileName: fileAsset.name,
            fileSize: fileAsset.size || 0,
            fileType: fileAsset.mimeType || 'application/octet-stream'
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
            type: response.data.type,
            metadata: {
              fileName: fileAsset.name,
              fileSize: fileAsset.size || 0,
              fileType: fileAsset.mimeType || 'application/octet-stream'
            }
          };
          setMessages(prev => [...prev, newMessageWithInfo] as ExtendedGroupMessage[]);
        }
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      Alert.alert('Lỗi', 'Không thể tải lên file');
    } finally {
      setUploading(false);
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
    try {
      if (emoji === '↪️') {
        // Nếu là emoji forward, tìm tin nhắn và chuyển tiếp
        const messageToForward = messages.find(msg => msg.messageId === messageId);
        if (messageToForward) {
          setSelectedMessageForForward(messageToForward);
          setShowForwardModal(true);
        }
        return;
      }

      const response = await addReactionToGroupMessage(groupId, messageId, emoji);
      const updatedMessage = response as ExtendedGroupMessage;
      setMessages(prev => 
        prev.map(msg => {
          if (msg.messageId === messageId) {
            return {
              ...msg,
              reactions: [
                ...(msg.reactions || []),
                {
                  messageId,
                  reaction: emoji,
                  senderEmail: currentUserEmail
                }
              ]
            } as ExtendedGroupMessage;
          }
          return msg;
        })
      );
      setShowReactions(false);
    } catch (error) {
      console.error('Error adding reaction:', error);
    }
  };

  const handleRecall = async (messageId: string) => {
    try {
      const response = await recallGroupMessage(groupId, messageId);
      if (response) {
        setMessages((prevMessages: ExtendedGroupMessage[]) => 
          prevMessages.map((msg: ExtendedGroupMessage) => 
            msg.messageId === messageId 
              ? { ...msg, isRecalled: true, content: 'Tin nhắn đã được thu hồi' }
              : msg
          )
        );
        Alert.alert('Thành công', 'Đã thu hồi tin nhắn');
      }
    } catch (error: any) {
      console.error('Error recalling message:', error);
      Alert.alert('Lỗi', error.message || 'Không thể thu hồi tin nhắn. Vui lòng thử lại.');
    }
  };

  const handleDelete = async (messageId: string) => {
    try {
      await deleteGroupMessage(groupId, messageId);
      setMessages(prev => prev.filter(msg => msg.messageId !== messageId));
    } catch (error) {
      console.error('Error deleting message:', error);
    }
  };

  const handleCopyText = (message: ExtendedGroupMessage) => {
    if (message.content) {
      Clipboard.setString(message.content);
      Alert.alert('Thành công', 'Đã sao chép văn bản');
    }
    setShowReactions(false);
  };

  const handleForward = async (targetGroupId: string) => {
    if (!selectedMessageForForward) return;

    try {
      await forwardGroupMessage(groupId, selectedMessageForForward.messageId, targetGroupId);
      setShowForwardModal(false);
      setSelectedMessageForForward(null);
      Alert.alert('Thành công', 'Tin nhắn đã được chuyển tiếp');
    } catch (error) {
      console.error('Error forwarding message:', error);
      Alert.alert('Lỗi', 'Không thể chuyển tiếp tin nhắn');
    }
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

  const handleForwardItemPress = async (item: ForwardItem) => {
    console.log('Forwarding message to:', item);
    console.log('Selected message:', selectedMessageForForward);
    
    if (!selectedMessageForForward) {
      console.log('No message selected for forwarding');
      return;
    }

    try {
      if (item.type === 'friend') {
        console.log('Forwarding to friend:', item.data);
        const friend = item.data as Friend;
        // Close modal before navigating
        setShowForwardModal(false);
        setSelectedMessageForForward(null);
        // Navigate to chat with the message to forward
        navigation.navigate('Chat', {
          receiverEmail: friend.email,
          fullName: friend.fullName,
          avatar: friend.avatar,
          messageToForward: selectedMessageForForward
        } as ChatRouteParams);
      } else {
        console.log('Forwarding to group:', item.data);
        const group = item.data as Group;
        try {
          await forwardGroupMessage(groupId, selectedMessageForForward.messageId, group.groupId);
          Alert.alert('Thành công', 'Tin nhắn đã được chuyển tiếp');
          setShowForwardModal(false);
          setSelectedMessageForForward(null);
        } catch (forwardError: any) {
          console.error('Forward error:', forwardError);
          Alert.alert('Lỗi', forwardError.message || 'Không thể chuyển tiếp tin nhắn');
          return;
        }
      }
    } catch (error: any) {
      console.error('Error in handleForwardItemPress:', error);
      Alert.alert('Lỗi', error.message || 'Không thể chuyển tiếp tin nhắn');
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

  const renderMessage = ({ item }: { item: ExtendedGroupMessage }) => {
    const isMe = item.senderEmail === currentUserEmail;
    
    return (
      <TouchableOpacity
        onLongPress={() => {
          if (isMe) {
            setSelectedMessageForActions(item);
            setShowMessageActions(true);
          } else {
            setSelectedMessage(item);
            setSelectedMessageForActions(item);
            setShowReactions(true);
          }
        }}
        delayLongPress={200}
        activeOpacity={0.7}
      >
        <View style={[styles.messageContainer, isMe ? styles.myMessage : styles.theirMessage]}>
          {!isMe && (
            <Avatar
              rounded
              source={{ uri: item.senderAvatar }}
              size={30}
              containerStyle={styles.avatar}
            />
          )}
          <View 
            style={[
              styles.messageBubble,
              isMe ? styles.myBubble : styles.theirBubble,
              isImageMessage(item) && styles.imageBubble
            ]}
          >
            {isImageMessage(item) ? (
              <TouchableOpacity 
                onPress={() => {
                  if (item.content) {
                    Linking.openURL(item.content);
                  }
                }}
                style={[
                  styles.imageContainer,
                  isMe ? styles.myImageContainer : styles.theirImageContainer
                ]}
              >
                <Image
                  source={{ uri: item.content }}
                  style={styles.messageImage}
                  resizeMode="cover"
                />
              </TouchableOpacity>
            ) : isFileMessage(item.content) ? (
              <View style={styles.fileContainer}>
                <TouchableOpacity 
                  style={[
                    styles.fileContentContainer,
                    { backgroundColor: isMe ? '#E3F2FD' : '#FFFFFF' },
                    styles.elevation
                  ]}
                  onPress={() => {
                    if (item.content) {
                      Linking.openURL(item.content);
                    }
                  }}
                >
                  <View style={styles.fileIconWrapper}>
                    <View style={[styles.fileIconContainer, { backgroundColor: '#1976D2' }]}>
                      <Ionicons 
                        name="document"
                        size={22} 
                        color="#FFFFFF"
                      />
                    </View>
                  </View>
                  <View style={styles.fileInfoContainer}>
                    <Text style={styles.fileName} numberOfLines={1}>
                      {item.metadata?.fileName || 'Unknown file'}
                    </Text>
                    <Text style={styles.fileType}>
                      {item.metadata?.fileType?.toUpperCase() || 'Unknown type'}
                    </Text>
                  </View>
                  <View style={styles.actionButtons}>
                    <TouchableOpacity 
                      style={[styles.actionButton, { backgroundColor: '#1976D2' }]}
                      onPress={() => {
                        if (item.content) {
                          Linking.openURL(item.content);
                        }
                      }}
                    >
                      <Ionicons 
                        name="eye-outline" 
                        size={16} 
                        color="#FFFFFF"
                      />
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.actionButton, { backgroundColor: '#2196F3' }]}
                      onPress={() => {
                        if (item.content) {
                          Clipboard.setString(item.content);
                        }
                      }}
                    >
                      <Ionicons 
                        name="copy-outline" 
                        size={16} 
                        color="#FFFFFF"
                      />
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              </View>
            ) : (
              <Text style={[styles.messageText, !isMe && styles.theirMessageText]}>
                {item.content}
              </Text>
            )}
            <View style={styles.messageFooter}>
              <Text style={[styles.messageTime, !isMe && styles.theirMessageTime]}>
                {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true, locale: vi })}
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderMessageActions = () => {
    if (!selectedMessageForActions) return null;

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
          <View style={styles.messageActionsMenu}>
            <TouchableOpacity
              style={styles.messageActionButton}
              onPress={() => handleMessageAction(selectedMessageForActions, 'recall')}
            >
              <Ionicons name="refresh-outline" size={24} color="#0068ff" />
              <Text style={styles.messageActionText}>Thu hồi</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.messageActionButton}
              onPress={() => handleMessageAction(selectedMessageForActions, 'forward')}
            >
              <Ionicons name="share-outline" size={24} color="#0068ff" />
              <Text style={styles.messageActionText}>Chuyển tiếp</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.messageActionButton}
              onPress={() => handleMessageAction(selectedMessageForActions, 'copy')}
            >
              <Ionicons name="copy-outline" size={24} color="#0068ff" />
              <Text style={styles.messageActionText}>Sao chép</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    );
  };

  const renderReactionAndActionModal = () => {
    if (!selectedMessage) return null;

    return (
      <Modal
        visible={showReactions}
        transparent
        animationType="fade"
        onRequestClose={() => setShowReactions(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowReactions(false)}
        >
          <View style={styles.reactionAndActionContainer}>
            {/* Reactions Section */}
            <View style={styles.reactionSection}>
              <Text style={styles.sectionTitle}>Reactions</Text>
              <View style={styles.reactionMenu}>
                {REACTIONS.map((reaction, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.reactionButton}
                    onPress={() => {
                      if (!selectedMessage) return;
                      
                      if (reaction.type === 'reaction') {
                        handleReaction(selectedMessage.messageId, reaction.emoji);
                      } else if (reaction.type === 'action') {
                        if (reaction.name === 'copy') {
                          handleCopyText(selectedMessage);
                        } else if (reaction.name === 'forward') {
                          setSelectedMessageForForward(selectedMessage);
                          setShowForwardModal(true);
                          setShowReactions(false);
                        }
                      }
                    }}
                  >
                    <Text style={styles.reactionEmoji}>{reaction.emoji}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Admin Actions Section */}
            {isAdmin && (
              <View style={styles.actionSection}>
                <Text style={styles.sectionTitle}>Admin Actions</Text>
                <View style={styles.adminActionsMenu}>
                  <TouchableOpacity
                    style={styles.adminActionButton}
                    onPress={() => {
                      if (selectedMessage) {
                        handleRecall(selectedMessage.messageId);
                        setShowReactions(false);
                      }
                    }}
                  >
                    <Ionicons name="refresh-outline" size={24} color="#0068ff" />
                    <Text style={styles.adminActionText}>Thu hồi tin nhắn</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.adminActionButton}
                    onPress={() => {
                      if (selectedMessage) {
                        setSelectedMessageForForward(selectedMessage);
                        setShowForwardModal(true);
                        setShowReactions(false);
                      }
                    }}
                  >
                    <Ionicons name="share-outline" size={24} color="#0068ff" />
                    <Text style={styles.adminActionText}>Chuyển tiếp</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.adminActionButton}
                    onPress={() => {
                      if (selectedMessage) {
                        handleCopyText(selectedMessage);
                        setShowReactions(false);
                      }
                    }}
                  >
                    <Ionicons name="copy-outline" size={24} color="#0068ff" />
                    <Text style={styles.adminActionText}>Sao chép</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    );
  };

  const isFileMessage = (content: string) => {
    return content.includes('uploads3cnm.s3.amazonaws.com') && (!selectedMessage || !isImageMessage(selectedMessage));
  };

  const isImageMessage = (message: ExtendedGroupMessage) => {
    if (message.type === 'image') return true;
    if (message.metadata?.fileType?.startsWith('image/')) return true;
    const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'];
    const url = message.content.toLowerCase();
    return imageExtensions.some(ext => url.endsWith(`.${ext}`));
  };

  const setupSocketListeners = () => {
    // Listen for new messages
    const handleNewMessage = (data: { groupId: string, message: any }) => {
      if (data.groupId === groupId) {
        const newMessage: ExtendedGroupMessage = {
          ...data.message,
          groupId,
          isCurrentUser: data.message.senderEmail === currentUserEmail
        };
        setMessages(prev => [...prev, newMessage]);
      }
    };

    // Listen for group name changes
    const handleNameChange = (data: { groupId: string, newName: string }) => {
      if (data.groupId === groupId) {
        navigation.setParams({ groupName: data.newName });
      }
    };

    // Listen for group avatar changes
    const handleAvatarChange = (data: { groupId: string, newAvatar: string }) => {
      if (data.groupId === groupId) {
        navigation.setParams({ avatar: data.newAvatar });
      }
    };

    // Listen for member updates
    const handleMembersUpdate = (data: { groupId: string, newMembers: any[] }) => {
      if (data.groupId === groupId) {
        setMemberCount(data.newMembers.length);
      }
    };

    // Thêm thành viên vào nhóm
    const handleAddMembers = async (emails: string[]) => {
      try {
        const response = await addGroupMembers(groupId, emails);
        if (response.success) {
          Alert.alert('Thành công', 'Đã thêm thành viên vào nhóm');
          socketService.emit('groupMembersUpdated', { groupId });
        } else {
          Alert.alert('Thất bại', response.message || 'Không thể thêm thành viên');
        }
      } catch (error) {
        console.error('Lỗi khi thêm thành viên:', error);
        Alert.alert('Lỗi', 'Không thể thêm thành viên');
      }
    };
    
    // Xóa thành viên khỏi nhóm
    const handleRemoveMember = async (email: string) => {
      try {
        const response = await removeGroupMember(groupId, email);
        if (response.success) {
          Alert.alert('Thành công', 'Đã xóa thành viên khỏi nhóm');
          socketService.emit('groupMembersUpdated', { groupId });
        } else {
          Alert.alert('Thất bại', response.message || 'Không thể xóa thành viên');
        }
      } catch (error) {
        console.error('Lỗi khi xóa thành viên:', error);
        Alert.alert('Lỗi', 'Không thể xóa thành viên');
      }
    };
    
    
    

    // Subscribe to socket events
    socketService.on('newGroupMessage', handleNewMessage);
    socketService.on('groupNameChanged', handleNameChange);
    socketService.on('groupAvatarChanged', handleAvatarChange);
    socketService.on('groupMembersUpdated', handleMembersUpdate);

    // Join the group room
    socketService.joinGroup(groupId);

    return () => {
      socketService.off('newGroupMessage', handleNewMessage);
      socketService.off('groupNameChanged', handleNameChange);
      socketService.off('groupAvatarChanged', handleAvatarChange);
      socketService.off('groupMembersUpdated', handleMembersUpdate);
      socketService.leaveGroup(groupId);
    };
  };

  return (
    <SafeAreaView style={styles.container}>
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
          keyExtractor={(item) => item.messageId}
          style={styles.flatList}
          contentContainerStyle={styles.messagesList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
          maintainVisibleContentPosition={{
            minIndexForVisible: 0,
            autoscrollToTopThreshold: 10
          }}
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
                {EMOJIS.map((emoji, index) => (
                  <TouchableOpacity
                    key={index}
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
                  style={styles.sendButton}
                  onPress={handleSendMessage}
                >
                  <Ionicons name="send" size={24} color="#fff" />
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>

      {renderMessageActions()}
      {renderReactionAndActionModal()}
      {renderForwardModal()}

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
  flatList: {
    flex: 1,
  },
  messagesList: {
    padding: 10,
    paddingBottom: 20,
  },
  messageContainer: {
    flexDirection: 'row',
    marginVertical: 5,
    alignItems: 'flex-end',
    width: '100%',
  },
  myMessage: {
    flexDirection: 'row-reverse',
    alignSelf: 'flex-end',
    paddingLeft: '15%',
  },
  theirMessage: {
    alignSelf: 'flex-start',
    paddingRight: '15%',
  },
  avatar: {
    marginHorizontal: 8,
  },
  messageBubble: {
    maxWidth: '100%',
    padding: 12,
    borderRadius: 20,
  },
  myBubble: {
    backgroundColor: '#0068ff',
    borderBottomRightRadius: 4,
    marginLeft: 8,
  },
  theirBubble: {
    backgroundColor: '#f0f0f0',
    borderBottomLeftRadius: 4,
    marginRight: 8,
  },
  imageBubble: {
    padding: 3,
    backgroundColor: 'transparent',
  },
  messageText: {
    fontSize: 16,
    color: '#ffffff',
  },
  theirMessageText: {
    color: '#000000',
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 4,
  },
  messageTime: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.7)',
    marginRight: 4,
  },
  theirMessageTime: {
    color: 'rgba(0, 0, 0, 0.5)',
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
    backgroundColor: '#0068ff',
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
  imageContainer: {
    borderRadius: 10,
    overflow: 'hidden',
    maxWidth: '100%',
  },
  myImageContainer: {
    alignSelf: 'flex-end',
  },
  theirImageContainer: {
    alignSelf: 'flex-start',
  },
  messageImage: {
    width: 200,
    height: 200,
    borderRadius: 10,
  },
  fileContainer: {
    maxWidth: '85%',
    minWidth: 220,
    marginVertical: 2,
  },
  fileContentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 12,
  },
  elevation: {
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  fileIconWrapper: {
    marginRight: 12,
  },
  fileIconContainer: {
    width: 42,
    height: 42,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fileInfoContainer: {
    flex: 1,
    marginRight: 8,
  },
  fileType: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 2,
    letterSpacing: 0.5,
  },
  fileName: {
    fontSize: 13,
    fontWeight: '500',
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
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
    fontSize: 20,
    marginHorizontal: 2,
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
});

export default ChatGroupScreen; 
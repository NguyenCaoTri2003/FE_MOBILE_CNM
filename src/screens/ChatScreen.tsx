import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, TextInput, StatusBar, FlatList, KeyboardAvoidingView, Platform, ScrollView, Alert, Image, Linking, Modal } from 'react-native';
import { Text, Avatar } from '@rneui/themed';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { 
  getMessages, 
  sendMessage, 
  markMessageAsRead, 
  uploadFile,
  addReaction,
  recallMessage, 
  deleteMessage,
  getFriends,
  Message
} from '../services/api';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import { io } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import type { Friend } from '../services/api';
import * as Clipboard from 'expo-clipboard';
import { API_BASE_URL } from '@env';
import { SafeAreaView } from 'react-native-safe-area-context';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

type RouteParams = {
  receiverEmail: string;
  fullName: string;
  avatar: string;
  lastSeen?: string;
  messageToForward?: Message;
};

interface MessageReaction {
  messageId: string;
  reaction: string;
  senderEmail: string;
}

const EMOJIS = [
  // Mặt cười
  '😀', '😃', '😄', '😁', '😅', '😂', '🤣', '😊', '😇', '🙂', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚',
  '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🤩', '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁',
  '☹️', '😣', '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠', '😡', '🤬', '🤯', '😳', '🥵', '🥶', '😱', '😨',
  
  // Cử chỉ và con người
  '👋', '🤚', '✋', '🖐️', '👌', '🤌', '🤏', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '👇', '☝️', '👍',
  '👎', '✊', '👊', '🤛', '🤜', '👏', '🙌', '👐', '🤲', '🤝', '🙏', '💪', '🦾', '🧠', '🫀', '🫁', '🦷', '🦴',
  
  // Trái tim và tình cảm
  '❤️', '🧡', '💛', '💚', '💙', '💜', '🤎', '🖤', '🤍', '💯', '💢', '💥', '💫', '💦', '💨', '🕳️', '💣', '💬',
  '👁️‍🗨️', '🗨️', '🗯️', '💭', '💤', '💝', '💞', '💓', '💗', '💖', '💘', '💕', '💟', '❣️', '💔', '✨',
  
  // Động vật
  '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🙈', '🙉', '🙊',
  
  // Thức ăn và đồ uống
  '☕', '🫖', '🍵', '🧃', '🥤', '🧋', '🍺', '🍻', '🥂', '🍷', '🥃', '🍸', '🍹', '🧉', '🍾', '🍽️', '🍴', '🥄',
  '🍬', '🍭', '🍫', '🍿', '🍪', '🍩', '🍯', '🧂', '🍖', '🍗', '🥩', '🥓', '🍔', '🍟', '🌭', '🥪',
  
  // Hoạt động
  '⚽', '🏀', '🏈', '⚾', '🥎', '🎾', '🏐', '🏉', '🎱', '🎮', '🎲', '♟️', '🎭', '🎨', '🎬', '🎤', '🎧', '🎼',
  
  // Thiên nhiên và thời tiết
  '🌸', '💮', '🏵️', '🌹', '🥀', '🌺', '🌻', '🌼', '🌷', '🌱', '🪴', '🌲', '🌳', '🌴', '🌵', '🌾', '🌿', '☘️',
  '🍀', '🍁', '🍂', '🍃', '🌍', '🌎', '🌏', '🌑', '🌒', '🌓', '🌔', '🌕', '🌖', '🌗', '🌘', '🌙', '🌚', '🌛',
  '⭐', '🌟', '✨', '⚡', '☄️', '💥', '🔥', '🌪️', '🌈', '☀️', '🌤️', '⛅', '🌥️', '☁️', '🌦️', '🌧️', '⛈️', '🌩️',
  
  // Đối tượng
  '💎', '💍', '🔔', '🎵', '🎶', '🚗', '✈️', '🚀', '⌚', '📱', '💻', '⌨️', '🖨️', '💡', '🔦'
];

const REACTIONS = [
  { emoji: '❤️', name: 'heart', type: 'reaction' },
  { emoji: '👍', name: 'thumbsup', type: 'reaction' },
  { emoji: '😄', name: 'haha', type: 'reaction' },
  { emoji: '😮', name: 'wow', type: 'reaction' },
  { emoji: '😢', name: 'sad', type: 'reaction' },
  { emoji: '😠', name: 'angry', type: 'reaction' }
];

const ChatScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute();
  const { receiverEmail, fullName, avatar, lastSeen, messageToForward } = route.params as RouteParams;
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const socket = useRef<any>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [showEmojis, setShowEmojis] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [showReactions, setShowReactions] = useState(false);
  const [selectedMessageForActions, setSelectedMessageForActions] = useState<Message | null>(null);
  const [showMessageActions, setShowMessageActions] = useState(false);
  const [showForwardModal, setShowForwardModal] = useState(false);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Add useEffect to monitor isTyping changes
  useEffect(() => {
    console.log('isTyping changed:', isTyping);
  }, [isTyping]);

  // Sửa lại useEffect cho auto-scrolling
  useEffect(() => {
    if (messages.length > 0 && flatListRef.current) {
      // Cuộn xuống cuối khi có tin nhắn mới
      flatListRef.current.scrollToEnd({ animated: true });
    }
  }, [messages]);

  useEffect(() => {
    const initializeSocket = async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        console.log('Token from AsyncStorage:', token ? 'exists' : 'not found');
        
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

        // Load messages
        loadMessages();

        // Socket event listeners
        socket.current.on('newMessage', (message: Message) => {
          console.log('Received new message:', message);
          if (message.senderEmail === receiverEmail) {
            setMessages(prev => {
              const messageExists = prev.some(msg => msg.messageId === message.messageId);
              if (!messageExists) {
                return [...prev, message];
              }
              return prev;
            });
            
            if (hasInteracted) {
              markMessageAsRead(message.messageId);
              if (socket.current) {
                socket.current.emit('messageRead', {
                  messageId: message.messageId,
                  senderEmail: message.senderEmail
                });
              }
            }
          }
        });

        socket.current.on('messageRead', (data: { messageId: string }) => {
          console.log('Message read:', data.messageId);
          // Cập nhật trạng thái đã đọc cho tin nhắn ngay lập tức
          setMessages(prev => prev.map(msg => 
            msg.messageId === data.messageId ? { ...msg, status: 'read' } : msg
          ));
        });

        // Add typing indicator listeners with console logs
        socket.current.on('typingStart', (data: { senderEmail: string }) => {
          console.log('Received typingStart event:', data);
          console.log('Current receiver email:', receiverEmail);
          console.log('Comparing emails:', data.senderEmail === receiverEmail);
          
          // Sửa lại điều kiện: hiển thị khi người khác đang gõ
          // Thử cả hai điều kiện để xem điều nào hoạt động
          if (data.senderEmail !== receiverEmail) {
            console.log('Setting isTyping to true (senderEmail !== receiverEmail)');
            setIsTyping(true);
          } else {
            console.log('Setting isTyping to true (senderEmail === receiverEmail)');
            setIsTyping(true);
          }
        });

        socket.current.on('typingStop', (data: { senderEmail: string }) => {
          console.log('Received typingStop event:', data);
          console.log('Current receiver email:', receiverEmail);
          console.log('Comparing emails:', data.senderEmail === receiverEmail);
          
          // Sửa lại điều kiện: ẩn khi người khác dừng gõ
          // Thử cả hai điều kiện để xem điều nào hoạt động
          if (data.senderEmail !== receiverEmail) {
            console.log('Setting isTyping to false (senderEmail !== receiverEmail)');
            setIsTyping(false);
          } else {
            console.log('Setting isTyping to false (senderEmail === receiverEmail)');
            setIsTyping(false);
          }
        });

        socket.current.on('messageReaction', (data: { messageId: string, reaction: string, senderEmail: string }) => {
          console.log('Received messageReaction event:', data);
          setMessages(prevMessages => {
            console.log('Updating messages for reaction:', data.messageId);
            return prevMessages.map(msg => {
              if (msg.messageId === data.messageId) {
                console.log('Found message to add reaction:', msg.messageId);
                return {
                  ...msg,
                  reactions: [...(msg.reactions || []), {
                    messageId: data.messageId,
                    reaction: data.reaction,
                    senderEmail: data.senderEmail
                  }]
                };
              }
              return msg;
            });
          });
        });

        socket.current.on('messageReactionConfirmed', (data: { success: boolean, messageId: string, reaction: string, error?: string }) => {
          console.log('Message reaction confirmation:', data);
          if (!data.success) {
            Alert.alert('Lỗi', 'Không thể thả cảm xúc. Vui lòng thử lại.');
          }
        });

        socket.current.on('messageRecalled', (data: { messageId: string, senderEmail: string }) => {
          console.log('Received messageRecalled event:', data);
          setMessages(prevMessages => {
            console.log('Updating messages for recall:', data.messageId);
            return prevMessages.map(msg => {
              if (msg.messageId === data.messageId) {
                console.log('Found message to recall:', msg.messageId);
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
          console.log('Received messageDeleted event:', data);
          setMessages(prevMessages => {
            console.log('Removing deleted message:', data.messageId);
            return prevMessages.filter(msg => msg.messageId !== data.messageId);
          });
        });

        // Confirmation handlers
        socket.current.on('messageRecallConfirmed', (data: { success: boolean, messageId: string, error?: string }) => {
          console.log('Message recall confirmation:', data);
          if (!data.success) {
            Alert.alert('Lỗi', 'Không thể thu hồi tin nhắn. Vui lòng thử lại.');
          }
        });

        socket.current.on('messageDeleteConfirmed', (data: { success: boolean, messageId: string, error?: string }) => {
          console.log('Message delete confirmation:', data);
          if (!data.success) {
            Alert.alert('Lỗi', 'Không thể xóa tin nhắn. Vui lòng thử lại.');
          }
        });

        return () => {
          if (socket.current) {
            console.log('Cleaning up socket connection');
            socket.current.disconnect();
          }
          if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
          }
        };
      } catch (error) {
        console.error('Error initializing socket:', error);
      }
    };

    initializeSocket();
  }, [receiverEmail]); // Add receiverEmail to dependencies

  // Thêm hàm xử lý khi người dùng tương tác với màn hình
  const handleScreenFocus = () => {
    setHasInteracted(true);
    // Chỉ đánh dấu đã đọc khi người dùng thực sự tương tác
    if (messages.length > 0) {
      messages.forEach(msg => {
        if (msg.status !== 'read' && msg.senderEmail === receiverEmail) {
          // Đánh dấu tin nhắn là đã đọc
          markMessageAsRead(msg.messageId).then(() => {
            // Cập nhật trạng thái tin nhắn trong state
            setMessages(prev => prev.map(m => 
              m.messageId === msg.messageId ? { ...m, status: 'read' } : m
            ));
            
            // Emit sự kiện messageRead
            if (socket.current) {
              socket.current.emit('messageRead', {
                messageId: msg.messageId,
                senderEmail: msg.senderEmail
              });
            }
          });
        }
      });
    }
  };

  // Thêm useEffect để theo dõi khi màn hình được focus
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', handleScreenFocus);
    return unsubscribe;
  }, [navigation, messages, receiverEmail]);

  const loadMessages = async () => {
    try {
      console.log('Loading messages for:', receiverEmail);
      const response = await getMessages(receiverEmail);
      if (response.success) {
        // Sắp xếp tin nhắn theo thời gian tăng dần (cũ nhất lên đầu)
        const sortedMessages = response.data.sort((a, b) => {
          const dateA = new Date(a.createdAt).getTime();
          const dateB = new Date(b.createdAt).getTime();
          return dateA - dateB;
        });
        setMessages(sortedMessages);
        
        // Mark messages as read if user has interacted with the screen
        if (hasInteracted) {
          const unreadMessages = sortedMessages.filter(
            msg => msg.status !== 'read' && msg.senderEmail === receiverEmail
          );
          
          // Batch mark messages as read
          if (unreadMessages.length > 0) {
            const messageIds = unreadMessages.map(msg => msg.messageId);
            if (socket.current) {
              socket.current.emit('messagesRead', {
                messageIds,
                senderEmail: receiverEmail
              });
            }
          }
        }
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;

    try {
      console.log('Sending message to:', receiverEmail);
      const response = await sendMessage(receiverEmail, newMessage.trim());
      if (response.success) {
        // Add new message to the end of the array
        setMessages(prev => [...prev, response.data]);
        setNewMessage('');

        // Emit socket event
        if (socket.current) {
          socket.current.emit('newMessage', {
            receiverEmail,
            message: response.data
          });
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleTypingStart = () => {
    console.log('Emitting typingStart event to:', receiverEmail);
    if (socket.current) {
      // Gửi sự kiện typingStart với email của người gửi (người đang gõ)
      socket.current.emit('typingStart', { receiverEmail });
      // Thêm log để debug
      console.log('Typing start event emitted');
    }
  };

  const handleTypingStop = () => {
    console.log('Emitting typingStop event to:', receiverEmail);
    if (socket.current) {
      // Gửi sự kiện typingStop với email của người gửi (người đang gõ)
      socket.current.emit('typingStop', { receiverEmail });
      // Thêm log để debug
      console.log('Typing stop event emitted');
    }
  };

  const handleMessageChange = (text: string) => {
    setNewMessage(text);
    
    // Xóa timeout cũ nếu có
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Gửi sự kiện bắt đầu gõ
    handleTypingStart();

    // Đặt timeout mới để dừng gõ sau 1 giây
    typingTimeoutRef.current = setTimeout(() => {
      handleTypingStop();
    }, 1000);
  };

  const handleEmojiPress = (emoji: string) => {
    setNewMessage(prev => prev + emoji);
    setShowEmojis(false); // Ẩn bảng emoji sau khi chọn
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
      Alert.alert('Lỗi', 'Không thể chọn file. Vui lòng thử lại.');
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
      
      // Get file info
      const fileInfo = await FileSystem.getInfoAsync(fileAsset.uri);
      if (!fileInfo.exists) {
        throw new Error('Không thể truy cập file');
      }

      // Create form data
      const formData = new FormData();
      formData.append('file', {
        uri: Platform.OS === 'android' ? fileAsset.uri : fileAsset.uri.replace('file://', ''),
        type: fileAsset.mimeType || 'application/octet-stream',
        name: fileAsset.name,
      } as any);

      // Upload file
      const response = await uploadFile(formData);
      
      if (response.success) {
        // Sử dụng URL S3 trực tiếp
        const fileUrl = response.data.url;
        
        // Send message with file URL and metadata
        const messageResponse = await sendMessage(
          receiverEmail,
          fileUrl,
          'file',
          {
            fileName: fileAsset.name,
            fileSize: fileAsset.size || fileInfo.size || 0,
            fileType: fileAsset.mimeType || 'application/octet-stream'
          }
        );

        if (messageResponse.success) {
          setMessages(prev => {
            const messageExists = prev.some(msg => msg.messageId === messageResponse.data.messageId);
            if (!messageExists) {
              return [...prev, messageResponse.data];
            }
            return prev;
          });

          // Emit socket event
          if (socket.current) {
            socket.current.emit('newMessage', {
              receiverEmail,
              message: messageResponse.data
            });
          }
        }
      }
    } catch (error: any) {
      console.error('Error uploading file:', error);
      let errorMessage = 'Không thể tải lên file';
      
      if (error.message) {
        errorMessage = error.message;
      } else if (error.error) {
        errorMessage = error.error;
      } else if (error.code === 'ECONNABORTED') {
        errorMessage = 'Kết nối quá lâu. Vui lòng thử lại.';
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }
      
      Alert.alert('Lỗi', errorMessage);
    } finally {
      setUploading(false);
    }
  };

  const handleImagePick = async () => {
    try {
      // Request permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant permission to access your photos');
        return;
      }

      // Pick image with compression
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.5, // Reduce quality to 50%
        base64: false,
        exif: false,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selectedImage = result.assets[0];
        
        // Check file size
        const fileInfo = await FileSystem.getInfoAsync(selectedImage.uri);
        if (!fileInfo.exists) {
          Alert.alert('Lỗi', 'Không thể truy cập file ảnh');
          return;
        }
        
        const fileSize = (fileInfo as any).size;
        if (fileSize && fileSize > 10 * 1024 * 1024) { // 10MB limit
          Alert.alert('Lỗi', 'Kích thước ảnh quá lớn. Vui lòng chọn ảnh nhỏ hơn 10MB.');
          return;
        }

        setUploading(true);

        try {
          // Create form data with compressed image
          const formData = new FormData();
          formData.append('file', {
            uri: selectedImage.uri,
            type: 'image/jpeg',
            name: 'image.jpg',
          } as any);

          // Upload image with timeout handling
          const uploadResponse = await Promise.race([
            uploadFile(formData),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Upload timeout')), 30000) // 30 second timeout
            )
          ]);
          
          if (uploadResponse.success) {
            // Send message with image URL
            const messageResponse = await sendMessage(
              receiverEmail,
              uploadResponse.data.url,
              'image',
              {
                fileName: uploadResponse.data.originalname,
                fileSize: uploadResponse.data.size,
                fileType: uploadResponse.data.mimetype
              }
            );

            if (messageResponse.success) {
              setMessages(prev => {
                const messageExists = prev.some(msg => msg.messageId === messageResponse.data.messageId);
                if (!messageExists) {
                  return [...prev, messageResponse.data];
                }
                return prev;
              });

              // Emit socket event
              if (socket.current) {
                socket.current.emit('newMessage', {
                  receiverEmail,
                  message: messageResponse.data
                });
              }
            }
          } else {
            throw new Error('Upload failed');
          }
        } catch (error: any) {
          console.error('Error uploading image:', error);
          let errorMessage = 'Không thể tải lên ảnh';
          
          if (error.message === 'Upload timeout') {
            errorMessage = 'Tải lên ảnh quá thời gian. Vui lòng thử lại.';
          } else if (error.response?.data?.message) {
            errorMessage = error.response.data.message;
          }
          
          Alert.alert('Lỗi', errorMessage);
        }
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Lỗi', 'Không thể chọn ảnh. Vui lòng thử lại.');
    } finally {
      setUploading(false);
    }
  };

  const handleVideoPick = async () => {
    try {
      // Request permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant permission to access your videos');
        return;
      }

      // Pick video
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: true,
        quality: 1,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selectedVideo = result.assets[0];
        setUploading(true);

        // Create form data
        const formData = new FormData();
        formData.append('file', {
          uri: selectedVideo.uri,
          type: 'video/mp4',
          name: 'video.mp4',
        } as any);

        try {
          // Upload video
          const uploadResponse = await uploadFile(formData);
          
          if (uploadResponse.success) {
            // Send message with video URL
            const messageResponse = await sendMessage(
              receiverEmail,
              uploadResponse.data.url,
              'video',
              {
                fileName: uploadResponse.data.originalname,
                fileSize: uploadResponse.data.size,
                fileType: uploadResponse.data.mimetype
              }
            );

            if (messageResponse.success) {
              setMessages(prev => {
                const messageExists = prev.some(msg => msg.messageId === messageResponse.data.messageId);
                if (!messageExists) {
                  return [...prev, messageResponse.data];
                }
                return prev;
              });

              // Emit socket event
              if (socket.current) {
                socket.current.emit('newMessage', {
                  receiverEmail,
                  message: messageResponse.data
                });
              }
            }
          }
        } catch (error) {
          console.error('Error uploading video:', error);
          Alert.alert('Error', 'Failed to upload video. Please try again.');
        }
      }
    } catch (error) {
      console.error('Error picking video:', error);
      Alert.alert('Error', 'Failed to pick video. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleReaction = async (messageId: string, reaction: string) => {
    try {
      const response = await addReaction(messageId, reaction);
      if (response) {
        // Update the message in the messages state
        setMessages(prevMessages => 
          prevMessages.map(msg => 
            msg.messageId === messageId ? response : msg
          )
        );
      }
    } catch (error) {
      console.error('Error adding reaction:', error);
    }
  };

  const handleRecall = async (messageId: string) => {
    try {
      const response = await recallMessage(messageId);
      if (response) {
        // Update the message in the messages state
        setMessages(prevMessages => 
          prevMessages.map(msg => 
            msg.messageId === messageId ? response : msg
          )
        );
      }
    } catch (error) {
      console.error('Error recalling message:', error);
    }
  };

  const handleDelete = async (messageId: string) => {
    try {
      // Gọi API xóa tin nhắn chỉ cho người gửi
      await deleteMessage(messageId);
      // Chỉ xóa tin nhắn khỏi state local
      setMessages(prevMessages => 
        prevMessages.filter(msg => msg.messageId !== messageId)
      );
      Alert.alert('Thành công', 'Tin nhắn đã được xóa');
    } catch (error) {
      console.error('Error deleting message:', error);
      Alert.alert('Lỗi', 'Không thể xóa tin nhắn. Vui lòng thử lại.');
    }
  };

  // Add useEffect to load friends when forward modal is opened
  useEffect(() => {
    if (showForwardModal) {
      loadFriends();
    }
  }, [showForwardModal]);

  const loadFriends = async () => {
    try {
      const response = await getFriends();
      if (response.success) {
        setFriends(response.data);
      }
    } catch (error) {
      console.error('Error loading friends:', error);
    }
  };

  const handleForwardMessage = async (message: Message, receiverEmail: string) => {
    try {
      // Forward the message to the selected receiver
      const response = await sendMessage(
        receiverEmail,
        message.content,
        message.type,
        message.metadata ? {
          fileName: message.metadata.fileName || '',
          fileSize: message.metadata.fileSize || 0,
          fileType: message.metadata.fileType || ''
        } : undefined
      );

      if (response.success) {
        // Add the forwarded message to the messages state
        setMessages(prevMessages => [...prevMessages, response.data]);
        
        // Emit socket event for the forwarded message
        if (socket.current) {
          socket.current.emit('newMessage', {
            receiverEmail,
            message: response.data
          });
        }
        Alert.alert('Thành công', 'Tin nhắn đã được chuyển tiếp');
      }
    } catch (error) {
      console.error('Error forwarding message:', error);
      Alert.alert('Lỗi', 'Không thể chuyển tiếp tin nhắn. Vui lòng thử lại.');
    }
    setShowForwardModal(false);
    setShowMessageActions(false);
  };

  const handleCopyText = (message: Message) => {
    if (message.content) {
      // Copy text to clipboard
      const textToCopy = message.isRecalled ? 'Tin nhắn đã được thu hồi' : message.content;
      Clipboard.setString(textToCopy);
      Alert.alert('Thành công', 'Đã sao chép văn bản');
    }
    setShowReactions(false);
  };

  const handleForwardFromReaction = (message: Message) => {
    setSelectedMessageForActions(message);
    setShowReactions(false);
    setShowForwardModal(true);
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isMe = item.senderEmail !== receiverEmail;

    // Hiển thị tin nhắn đã thu hồi
    if (item.isRecalled) {
      return (
        <View style={[styles.messageContainer, isMe ? styles.myMessage : styles.theirMessage]}>
          {!isMe && (
            <Avatar
              rounded
              source={{ uri: avatar || 'https://randomuser.me/api/portraits/men/1.jpg' }}
              size={30}
              containerStyle={styles.avatar}
            />
          )}
          <View style={[styles.messageBubble, styles.recalledBubble]}>
            <Text style={styles.recalledText}>Tin nhắn đã được thu hồi</Text>
          </View>
        </View>
      );
    }

    const isFileMessage = (content: string) => {
      // Kiểm tra nếu là URL S3 và không phải là hình ảnh
      return content.includes('uploads3cnm.s3.amazonaws.com') && !isImageMessage(item);
    };

    const isImageMessage = (message: Message) => {
      // Kiểm tra nếu là tin nhắn hình ảnh hoặc file có định dạng hình ảnh
      if (message.type === 'image') return true;
      if (message.metadata?.fileType?.startsWith('image/')) return true;
      // Kiểm tra đuôi file trong URL
      const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'];
      const url = message.content.toLowerCase();
      return imageExtensions.some(ext => url.endsWith(`.${ext}`));
    };

    const getFileInfo = (url: string) => {
      try {
        // Decode URL để lấy tên file gốc
        const decodedUrl = decodeURIComponent(url);
        
        // Lấy phần cuối của URL (sau dấu / cuối cùng)
        const urlParts = decodedUrl.split('/');
        const fullFileName = urlParts[urlParts.length - 1];
        
        // Tách UUID và tên file
        // Format URL thường là: UUID-originalfilename.ext
        const lastHyphenIndex = fullFileName.lastIndexOf('-');
        const fileNameWithExt = lastHyphenIndex !== -1 
          ? fullFileName.substring(lastHyphenIndex + 1) 
          : fullFileName;
        
        // Xác định loại file từ phần mở rộng
        const fileType = fileNameWithExt.split('.').pop()?.toLowerCase() || '';
        
        console.log('File info:', {
          fullFileName,
          fileNameWithExt,
          fileType
        });
        
        return {
          fileName: fileNameWithExt,
          fileType,
          isImage: ['jpg', 'jpeg', 'png', 'gif'].includes(fileType),
          isVideo: ['mp4', 'mov', 'avi'].includes(fileType),
          isCompressed: ['zip', 'rar', '7z'].includes(fileType),
          isDocument: ['doc', 'docx', 'pdf', 'txt'].includes(fileType)
        };
      } catch (error) {
        console.error('Error parsing file info:', error);
        return {
          fileName: 'Unknown file',
          fileType: '',
          isImage: false,
          isVideo: false,
          isCompressed: false,
          isDocument: false
        };
      }
    };

    const renderFileContent = () => {
      const fileInfo = getFileInfo(item.content);
      
      const getFileIcon = () => {
        const ext = fileInfo.fileType.toLowerCase();
        if (['jpg', 'jpeg', 'png', 'gif'].includes(ext)) {
          return "image";
        }
        if (['mp4', 'mov', 'avi'].includes(ext)) {
          return "videocam";
        }
        if (['pdf'].includes(ext)) {
          return "document-text";
        }
        if (['doc', 'docx'].includes(ext)) {
          return "document";
        }
        if (['xls', 'xlsx'].includes(ext)) {
          return "grid";
        }
        if (['zip', 'rar', '7z'].includes(ext)) {
          return "archive";
        }
        if (['txt'].includes(ext)) {
          return "text";
        }
        return "document";
      };

      const getFileColor = () => {
        const ext = fileInfo.fileType.toLowerCase();
        if (['jpg', 'jpeg', 'png', 'gif'].includes(ext)) return '#FF9500';
        if (['mp4', 'mov', 'avi'].includes(ext)) return '#FF2D55';
        if (['pdf'].includes(ext)) return '#FF3B30';
        if (['doc', 'docx'].includes(ext)) return '#007AFF';
        if (['xls', 'xlsx'].includes(ext)) return '#34C759';
        if (['zip', 'rar', '7z'].includes(ext)) return '#AF52DE';
        if (['txt'].includes(ext)) return '#5856D6';
        return '#8E8E93';
      };

      const handlePreview = () => {
        if (item.content) {
          Linking.openURL(item.content);
        }
      };

      const handleDownload = () => {
        if (item.content) {
          // Mở URL trong trình duyệt để tải xuống
          Linking.openURL(item.content);
        }
      };

      const handlePlayVideo = () => {
        if (item.content) {
          Linking.openURL(item.content);
        }
      };

      return (
        <View style={styles.fileContainer}>
          <TouchableOpacity 
            style={[
              styles.fileContentContainer,
              { backgroundColor: isMe ? '#E3F2FD' : '#FFFFFF' },
              styles.elevation
            ]}
            onPress={fileInfo.isVideo ? handlePlayVideo : handlePreview}
          >
            <View style={styles.fileIconWrapper}>
              <View style={[styles.fileIconContainer, { backgroundColor: getFileColor() }]}>
                <Ionicons 
                  name={getFileIcon()}
                  size={22} 
                  color="#FFFFFF"
                />
              </View>
            </View>
            <View style={styles.fileInfoContainer}>
              <Text style={[
                styles.fileType,
                { color: '#1976D2' }
              ]} numberOfLines={1}>
                {fileInfo.fileType.toUpperCase()}
              </Text>
              <Text style={[
                styles.fileName,
                { color: '#2196F3' }
              ]} numberOfLines={1}>
                {fileInfo.fileName}
              </Text>
            </View>
            <View style={styles.actionButtons}>
              {fileInfo.isVideo ? (
                <TouchableOpacity 
                  style={[styles.actionButton, { backgroundColor: '#FF2D55' }]}
                  onPress={handlePlayVideo}
                >
                  <Ionicons 
                    name="play" 
                    size={16} 
                    color="#FFFFFF"
                  />
                </TouchableOpacity>
              ) : (
                <>
                  <TouchableOpacity 
                    style={[styles.actionButton, { backgroundColor: '#1976D2' }]}
                    onPress={handlePreview}
                  >
                    <Ionicons 
                      name="eye-outline" 
                      size={16} 
                      color="#FFFFFF"
                    />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.actionButton, { backgroundColor: '#2196F3' }]}
                    onPress={handleDownload}
                  >
                    <Ionicons 
                      name="cloud-download" 
                      size={16} 
                      color="#FFFFFF"
                    />
                  </TouchableOpacity>
                </>
              )}
            </View>
          </TouchableOpacity>
        </View>
      );
    };

    const renderImageContent = () => {
      return (
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
      );
    };

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
          isMe ? styles.myReactionsContainer : styles.theirReactionsContainer
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

    return (
      <TouchableOpacity
        onLongPress={() => {
          setSelectedMessage(item);
          setShowMessageActions(true);
        }}
        delayLongPress={200}
        activeOpacity={0.7}
      >
        <View style={[styles.messageContainer, isMe ? styles.myMessage : styles.theirMessage]}>
          {!isMe && (
            <Avatar
              rounded
              source={{ uri: avatar || 'https://randomuser.me/api/portraits/men/1.jpg' }}
              size={30}
              containerStyle={styles.avatar}
            />
          )}
          <View style={[styles.messageBubble, isMe ? styles.myBubble : styles.theirBubble]}>
            {isImageMessage(item) ? (
              renderImageContent()
            ) : isFileMessage(item.content) ? (
              renderFileContent()
            ) : (
              <Text style={[styles.messageText, !isMe && { color: '#000' }]}>{item.content}</Text>
            )}
            {renderReactions()}
            <View style={styles.messageFooter}>
              <Text style={[styles.messageTime, !isMe && { color: 'rgba(0, 0, 0, 0.5)' }]}>
                {(() => {
                  try {
                    const date = new Date(item.createdAt);
                    if (isNaN(date.getTime())) {
                      return 'Thời gian không hợp lệ';
                    }
                    return formatDistanceToNow(date, { addSuffix: true, locale: vi });
                  } catch (error) {
                    console.error('Error formatting date:', error);
                    return 'Thời gian không hợp lệ';
                  }
                })()}
              </Text>
              {isMe && (
                <Text style={[
                  styles.messageStatus,
                  item.status === 'read' ? styles.messageStatusRead : styles.messageStatusSent
                ]}>
                  {item.status === 'read' ? '✓✓' : '✓'}
                </Text>
              )}
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // Thêm xử lý khi người dùng scroll hoặc tương tác với FlatList
  const handleUserInteraction = () => {
    if (!hasInteracted) {
      handleScreenFocus();
    }
  };

  // Add useEffect to handle forwarded message
  useEffect(() => {
    if (messageToForward) {
      handleForwardMessage(messageToForward, receiverEmail);
    }
  }, [messageToForward]);

  useEffect(() => {
    const loadMessages = async () => {
      try {
        console.log('Loading messages for:', receiverEmail);
        const response = await getMessages(receiverEmail);
        if (response.success) {
          // Sắp xếp tin nhắn theo thời gian tăng dần (cũ nhất lên đầu)
          const sortedMessages = response.data.sort((a, b) => {
            const dateA = new Date(a.createdAt).getTime();
            const dateB = new Date(b.createdAt).getTime();
            return dateA - dateB;
          });
          setMessages(sortedMessages);
          
          // Mark messages as read if user has interacted with the screen
          if (hasInteracted) {
            const unreadMessages = sortedMessages.filter(
              msg => msg.status !== 'read' && msg.senderEmail === receiverEmail
            );
            
            // Batch mark messages as read
            if (unreadMessages.length > 0) {
              const messageIds = unreadMessages.map(msg => msg.messageId);
              if (socket.current) {
                socket.current.emit('messagesRead', {
                  messageIds,
                  senderEmail: receiverEmail
                });
              }
            }
          }
        }
      } catch (error) {
        console.error('Error loading messages:', error);
      } finally {
        setLoading(false);
      }
    };

    // Load messages initially
    loadMessages();

    // Set up polling interval
    const interval = setInterval(loadMessages, 3000);

    // Clean up interval on unmount
    return () => clearInterval(interval);
  }, [receiverEmail, hasInteracted]);

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
                      setSelectedMessageForActions(selectedMessage);
                      setShowForwardModal(true);
                    }}
                  >
                    <Ionicons name="share-outline" size={24} color="#666" />
                    <Text style={styles.messageActionText}>Chuyển tiếp</Text>
                  </TouchableOpacity>

                  {/* Actions only for own messages */}
                  {selectedMessage.senderEmail !== receiverEmail && (
                    <>
                      {(() => {
                        const messageTime = new Date(selectedMessage.createdAt).getTime();
                        const currentTime = new Date().getTime();
                        const timeDiff = currentTime - messageTime;
                        const canRecall = timeDiff <= 2 * 60 * 1000; // 2 phút
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
              <Text style={styles.userName}>{fullName}</Text>
              <Text style={styles.lastSeen}>
                {lastSeen ? formatDistanceToNow(new Date(lastSeen), { addSuffix: true, locale: vi }) : 'Đang hoạt động'}
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
          <TouchableOpacity style={styles.headerIcon}>
            <Ionicons name="ellipsis-vertical" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Chat Content */}
      <View style={{ flex: 1 }}>
        <KeyboardAvoidingView
          style={styles.chatContent}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={(item) => `${item.messageId}_${item.createdAt}`}
            style={styles.flatList}
            contentContainerStyle={styles.messagesList}
            onScroll={handleUserInteraction}
            onTouchStart={handleUserInteraction}
            removeClippedSubviews={true}
            maxToRenderPerBatch={10}
            windowSize={10}
            initialNumToRender={15}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
            onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
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

          {/* Hiển thị typing indicator ở đây, trước input bar */}
          {isTyping && (
            <View style={[styles.typingContainer, { backgroundColor: '#e6f7ff', borderWidth: 1, borderColor: '#91d5ff' }]}>
              <Text style={[styles.typingText, { color: '#1890ff' }]}>Đang soạn tin nhắn...</Text>
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
                onChangeText={handleMessageChange}
                multiline
              />
              <View style={styles.inputRightIcons}>
                <TouchableOpacity style={styles.inputIcon}>
                  <Ionicons name="ellipsis-horizontal" size={24} color="#666" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.inputIcon}>
                  <Ionicons name="mic-outline" size={24} color="#666" />
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
                  onPress={handleVideoPick}
                  disabled={uploading}
                >
                  <Ionicons name="videocam-outline" size={24} color="#666" />
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

        {renderReactionAndActionModal()}

        {/* Forward Modal */}
        <Modal
          visible={showForwardModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowForwardModal(false)}
        >
          <View style={styles.forwardModalContainer}>
            <View style={styles.forwardModalContent}>
              <View style={styles.forwardModalHeader}>
                <Text style={styles.forwardModalTitle}>Chuyển tiếp tin nhắn</Text>
                <TouchableOpacity
                  onPress={() => setShowForwardModal(false)}
                  style={styles.closeButton}
                >
                  <Ionicons name="close" size={24} color="#666" />
                </TouchableOpacity>
              </View>
              
              <View style={styles.searchContainer}>
                <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Tìm kiếm bạn bè"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
              </View>

              <FlatList
                data={friends.filter(friend => 
                  friend.fullName.toLowerCase().includes(searchQuery.toLowerCase())
                )}
                keyExtractor={(item) => item.email}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.friendItem}
                    onPress={() => selectedMessageForActions && handleForwardMessage(selectedMessageForActions, item.email)}
                  >
                    <Avatar
                      rounded
                      source={{ uri: item.avatar || 'https://randomuser.me/api/portraits/men/1.jpg' }}
                      size={40}
                    />
                    <Text style={styles.friendName}>{item.fullName}</Text>
                  </TouchableOpacity>
                )}
              />
            </View>
          </View>
        </Modal>
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
  },
  myMessage: {
    justifyContent: 'flex-end',
  },
  theirMessage: {
    justifyContent: 'flex-start',
  },
  avatar: {
    marginRight: 8,
  },
  messageBubble: {
    maxWidth: '70%',
    padding: 10,
    borderRadius: 15,
  },
  myBubble: {
    backgroundColor: '#0068ff',
    borderBottomRightRadius: 5,
  },
  theirBubble: {
    backgroundColor: '#f0f0f0',
    borderBottomLeftRadius: 5,
  },
  messageText: {
    fontSize: 16,
    color: '#fff',
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
  messageStatus: {
    fontSize: 12,
    marginLeft: 2,
  },
  messageStatusSent: {
    color: 'rgba(255, 255, 255, 0.5)', // Màu xám cho tin nhắn đã gửi
  },
  messageStatusRead: {
    color: '#fff', // Màu trắng cho tin nhắn đã xem
    fontWeight: 'bold', // Thêm độ đậm để dễ nhận biết hơn
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
  typingContainer: {
    padding: 8,
    paddingHorizontal: 15,
    backgroundColor: '#f0f0f0',
    borderRadius: 16,
    marginHorizontal: 10,
    marginBottom: 8,
    alignSelf: 'flex-start',
    marginTop: 5,
    elevation: 2, // Thêm đổ bóng cho Android
    shadowColor: '#000', // Thêm đổ bóng cho iOS
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
  },
  typingText: {
    color: '#666',
    fontSize: 12,
    fontStyle: 'italic',
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
    width: '100%',
  },
  emojiButton: {
    width: '11.11%', // 9 emoji mỗi hàng thay vì 8
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
  },
  emojiText: {
    fontSize: 20, // Giảm kích thước font xuống một chút
    color: '#000',
    textAlign: 'center',
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
  imageBubble: {
    padding: 2,
    backgroundColor: 'transparent',
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
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 15,
    margin: 20,
    maxWidth: '90%',
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
    gap: 2,
  },
  reactionButton: {
    padding: 4,
    marginHorizontal: 2,
  },
  reactionEmoji: {
    fontSize: 18,
    marginHorizontal: 1,
  },
  messageActionsSection: {
    marginTop: 10,
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
  forwardModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  forwardModalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: '80%',
    padding: 20,
  },
  forwardModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  forwardModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 5,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    paddingHorizontal: 10,
    marginBottom: 15,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 16,
  },
  friendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  friendName: {
    marginLeft: 15,
    fontSize: 16,
    color: '#333',
  },
  reactionsContainer: {
    flexDirection: 'row',
    position: 'absolute',
    bottom: -8,
    backgroundColor: 'white',
    borderRadius: 6,
    paddingHorizontal: 2,
    paddingVertical: 0,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0.5 },
    shadowOpacity: 0.1,
    shadowRadius: 0.5,
    zIndex: 1,
    maxWidth: '100%',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
  },
  myReactionsContainer: {
    left: 4,
  },
  theirReactionsContainer: {
    right: 4,
  },
  reactionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderRadius: 3,
    paddingHorizontal: 1,
    paddingVertical: 0,
    marginRight: 1,
    borderWidth: 0,
  },
  reactionEmojiText: {
    fontSize: 8,
    lineHeight: 8,
  },
  reactionCount: {
    fontSize: 6,
    color: '#666',
    marginLeft: 0,
  },
  recalledBubble: {
    backgroundColor: '#f0f0f0',
    opacity: 0.8,
  },
  recalledText: {
    color: '#666',
    fontStyle: 'italic',
    fontSize: 14,
  },
});

export default ChatScreen; 
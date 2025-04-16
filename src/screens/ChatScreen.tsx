import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, SafeAreaView, TouchableOpacity, TextInput, StatusBar, FlatList, KeyboardAvoidingView, Platform, ScrollView, Alert, Image, Linking } from 'react-native';
import { Text, Avatar } from '@rneui/themed';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { getMessages, sendMessage, markMessageAsRead, Message, uploadFile } from '../services/api';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import { io } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';

// API base URL
const BASE_URL = 'http://192.168.110.77:5000/api';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

type RouteParams = {
  receiverEmail: string;
  fullName: string;
  avatar: string;
  lastSeen?: string;
};

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
  '💎', '💍', '🔔', '🎵', '🎶', '🚗', '✈️', '🚀', '⌚', '📱', '💻', '⌨️', '🖥️', '🖨️', '🖱️', '🕹️', '💡', '🔦'
];

const ChatScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute();
  const { receiverEmail, fullName, avatar, lastSeen } = route.params as RouteParams;
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const socket = useRef<any>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const [hasInteracted, setHasInteracted] = useState(false);
  const [showEmojis, setShowEmojis] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Add useEffect to monitor isTyping changes
  useEffect(() => {
    console.log('isTyping changed:', isTyping);
  }, [isTyping]);

  // Sửa lại useEffect cho auto-scrolling
  useEffect(() => {
    if (messages.length > 0 && flatListRef.current) {
      flatListRef.current.scrollToOffset({ offset: 0, animated: true });
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
        const socketUrl = 'http://192.168.110.77:5000';
        console.log('Connecting to socket server:', socketUrl);
        
        socket.current = io(socketUrl, {
          transports: ['polling', 'websocket'],
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
          console.log('Socket connected successfully');
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

        return () => {
          if (socket.current) {
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
                senderEmail: msg.senderEmail,
                receiverEmail: receiverEmail
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
        setMessages(response.data);
        // Chỉ đánh dấu đã đọc nếu người dùng đang tương tác với màn hình
        if (hasInteracted) {
          response.data.forEach(msg => {
            if (msg.status !== 'read' && msg.senderEmail === receiverEmail) {
              markMessageAsRead(msg.messageId);
              if (socket.current) {
                socket.current.emit('messageRead', {
                  messageId: msg.messageId,
                  senderEmail: msg.senderEmail
                });
              }
            }
          });
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
        // Kiểm tra trùng lặp trước khi thêm tin nhắn mới
        setMessages(prev => {
          const messageExists = prev.some(msg => msg.messageId === response.data.messageId);
          if (!messageExists) {
            return [...prev, response.data];
          }
          return prev;
        });
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

  const renderMessage = ({ item }: { item: Message }) => {
    const isMe = item.senderEmail !== receiverEmail;

    const isFileMessage = (content: string) => {
      return content.includes('uploads3cnm.s3.amazonaws.com');
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
          isCompressed: ['zip', 'rar', '7z'].includes(fileType),
          isDocument: ['doc', 'docx', 'pdf', 'txt'].includes(fileType)
        };
      } catch (error) {
        console.error('Error parsing file info:', error);
        return {
          fileName: 'Unknown file',
          fileType: '',
          isImage: false,
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

      return (
        <View style={styles.fileContainer}>
          <TouchableOpacity 
            style={[
              styles.fileContentContainer,
              { backgroundColor: isMe ? '#E3F2FD' : '#FFFFFF' },
              styles.elevation
            ]}
            onPress={handlePreview}
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
            </View>
          </TouchableOpacity>
        </View>
      );
    };

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
        <View style={[styles.messageBubble, isMe ? styles.myBubble : styles.theirBubble]}>
          {isFileMessage(item.content) ? (
            <TouchableOpacity 
              style={styles.fileContainer}
              onPress={() => {
                if (item.content) {
                  Linking.openURL(item.content);
                }
              }}
            >
              {renderFileContent()}
            </TouchableOpacity>
          ) : (
            <Text style={[styles.messageText, !isMe && { color: '#000' }]}>{item.content}</Text>
          )}
          <View style={styles.messageFooter}>
            <Text style={[styles.messageTime, !isMe && { color: 'rgba(0, 0, 0, 0.5)' }]}>
              {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true, locale: vi })}
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
    );
  };

  // Thêm xử lý khi người dùng scroll hoặc tương tác với FlatList
  const handleUserInteraction = () => {
    if (!hasInteracted) {
      handleScreenFocus();
    }
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
              <Text style={styles.userName}>{fullName}</Text>
              <Text style={styles.lastSeen}>
                {lastSeen || 'Truy cập 4 giờ trước'}
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
      <KeyboardAvoidingView
        style={styles.chatContent}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <FlatList
          ref={flatListRef}
          data={[...messages].reverse()}
          renderItem={renderMessage}
          keyExtractor={(item) => `${item.messageId}_${item.createdAt}`}
          inverted
          style={styles.flatList}
          contentContainerStyle={styles.messagesList}
          onScroll={handleUserInteraction}
          onTouchStart={handleUserInteraction}
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
              <TouchableOpacity style={styles.inputIcon}>
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
  },
  emojiButton: {
    width: '12.5%', // 8 emoji mỗi hàng
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
    width: 200,
    borderRadius: 10,
    overflow: 'hidden',
  },
  imagePreview: {
    width: '100%',
    aspectRatio: 1,
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
});

export default ChatScreen; 
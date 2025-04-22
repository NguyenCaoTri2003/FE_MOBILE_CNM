import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, SafeAreaView, TouchableOpacity, TextInput, StatusBar, FlatList, KeyboardAvoidingView, Platform, ScrollView, Alert, Image, Linking, Modal } from 'react-native';
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
  GroupMessage,
  GroupMessagesResponse,
  SendMessageResponse
} from '../services/api';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import { io } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import * as Clipboard from 'expo-clipboard';
import { API_BASE_URL } from '@env';
import { jwtDecode } from 'jwt-decode';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

type RouteParams = {
  groupId: string;
  groupName: string;
  avatar: string;
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

interface MessageReaction {
  messageId: string;
  reaction: string;
  senderEmail: string;
}

interface ExtendedGroupMessage extends Omit<GroupMessage, 'groupId'> {
  groupId: string;
  senderName?: string;
  senderAvatar?: string;
  isCurrentUser?: boolean;
  reactions?: MessageReaction[];
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

  useEffect(() => {
    const initializeSocket = async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        if (!token) return;

        socket.current = io(API_BASE_URL, {
          auth: { token },
          transports: ['websocket']
        });

        socket.current.on('connect', () => {
          console.log('Socket connected');
        });

        socket.current.on('newGroupMessage', (message: ExtendedGroupMessage) => {
          if (message.groupId === groupId) {
            setMessages(prev => [...prev, message]);
          }
        });

        socket.current.on('groupMessageReaction', (data: { messageId: string, reaction: string, senderId: string }) => {
          setMessages(prev => prev.map(msg => {
            if (msg.messageId === data.messageId) {
              const updatedMessage: ExtendedGroupMessage = {
                ...msg,
                reactions: [
                  ...(msg.reactions || []),
                  {
                    messageId: data.messageId,
                    reaction: data.reaction,
                    senderEmail: data.senderId
                  }
                ]
              };
              return updatedMessage;
            }
            return msg;
          }));
        });

        socket.current.on('groupMessageRecalled', (messageId: string) => {
          setMessages(prev => prev.map(msg => {
            if (msg.messageId === messageId) {
              const updatedMessage: ExtendedGroupMessage = {
                ...msg,
                isRecalled: true,
                content: 'Tin nhắn đã được thu hồi'
              };
              return updatedMessage;
            }
            return msg;
          }));
        });

        socket.current.on('groupMessageDeleted', (messageId: string) => {
          setMessages(prev => prev.filter(msg => msg.messageId !== messageId));
        });

        loadMessages();

        return () => {
          if (socket.current) {
            socket.current.disconnect();
          }
        };
      } catch (error) {
        console.error('Socket initialization error:', error);
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

  const loadMessages = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) return;

      const decoded = jwtDecode<{ email: string; id: string }>(token);
      console.log('Current user email in loadMessages:', decoded.email);
      
      const response = await getGroupMessages(groupId);
      console.log('Group messages response:', response);
      
      if (response.success && response.data.messages) {
        const messagesWithInfo = response.data.messages.map(message => ({
          ...message,
          groupId,
          senderName: message.senderEmail,
          senderAvatar: 'https://randomuser.me/api/portraits/men/1.jpg',
          isCurrentUser: message.senderEmail === decoded.email
        })) as ExtendedGroupMessage[];
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
      const response = await sendGroupMessage(groupId, newMessage.trim());
      if (response.success) {
        const token = await AsyncStorage.getItem('token');
        if (!token) return;

        const decoded = jwtDecode<{ email: string; id: string }>(token);
        const newMessageWithInfo: ExtendedGroupMessage = {
          ...response.data,
          groupId,
          messageId: response.data.messageId,
          senderEmail: decoded.email,
          content: newMessage.trim(),
          createdAt: new Date().toISOString(),
          status: 'sent',
          senderName: decoded.email,
          senderAvatar: 'https://randomuser.me/api/portraits/men/1.jpg',
          isCurrentUser: true
        };
        setMessages(prev => [...prev, newMessageWithInfo] as ExtendedGroupMessage[]);
        setNewMessage('');
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

      const response = await uploadGroupFile(formData);
      
      if (response.success) {
        const messageResponse = await sendGroupMessage(
          groupId,
          response.data.url,
          'file',
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
          const newMessageWithInfo: ExtendedGroupMessage = {
            ...messageResponse.data,
            groupId,
            messageId: messageResponse.data.messageId,
            senderEmail: decoded.email,
            content: response.data.url,
            createdAt: new Date().toISOString(),
            status: 'sent',
            senderName: decoded.email,
            senderAvatar: 'https://randomuser.me/api/portraits/men/1.jpg',
            isCurrentUser: true,
            type: 'file',
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

        const response = await uploadGroupFile(formData);
        
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
            const newMessageWithInfo: ExtendedGroupMessage = {
              ...messageResponse.data,
              groupId,
              messageId: messageResponse.data.messageId,
              senderEmail: decoded.email,
              content: response.data.url,
              createdAt: new Date().toISOString(),
              status: 'sent',
              senderName: decoded.email,
              senderAvatar: 'https://randomuser.me/api/portraits/men/1.jpg',
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
      const response = await addReactionToGroupMessage(messageId, emoji);
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
      const recalledMessage = response as ExtendedGroupMessage;
      setMessages(prev => 
        prev.map(msg => {
          if (msg.messageId === messageId) {
            return {
              ...msg,
              ...recalledMessage,
              reactions: msg.reactions || []
            } as ExtendedGroupMessage;
          }
          return msg;
        })
      );
      setShowMessageActions(false);
    } catch (error) {
      console.error('Error recalling message:', error);
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

  const renderMessage = ({ item }: { item: ExtendedGroupMessage }) => {
    const isMe = item.senderEmail === currentUserEmail;
    
    console.log('Rendering message:', {
      content: item.content,
      senderEmail: item.senderEmail,
      currentUserEmail,
      isMe
    });

    if (item.isRecalled) {
      return (
        <View style={[styles.messageContainer, isMe ? styles.myMessage : styles.theirMessage]}>
          {!isMe && (
            <Avatar
              rounded
              source={{ uri: item.senderAvatar || 'https://randomuser.me/api/portraits/men/1.jpg' }}
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
      return content.includes('uploads3cnm.s3.amazonaws.com') && !isImageMessage(item);
    };

    const isImageMessage = (message: ExtendedGroupMessage) => {
      if (message.type === 'image') return true;
      if (message.metadata?.fileType?.startsWith('image/')) return true;
      const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'];
      const url = message.content.toLowerCase();
      return imageExtensions.some(ext => url.endsWith(`.${ext}`));
    };

    const renderFileContent = () => {
      const fileInfo = {
        fileName: item.metadata?.fileName || 'Unknown file',
        fileType: item.metadata?.fileType || '',
        isImage: ['jpg', 'jpeg', 'png', 'gif'].includes(item.metadata?.fileType?.split('/')[1] || ''),
        isVideo: ['mp4', 'mov', 'avi'].includes(item.metadata?.fileType?.split('/')[1] || ''),
        isCompressed: ['zip', 'rar', '7z'].includes(item.metadata?.fileType?.split('/')[1] || ''),
        isDocument: ['doc', 'docx', 'pdf', 'txt'].includes(item.metadata?.fileType?.split('/')[1] || '')
      };

      const handlePreview = () => {
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
            onPress={handlePreview}
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
                {fileInfo.fileName}
              </Text>
              <Text style={styles.fileType}>
                {fileInfo.fileType.toUpperCase()}
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
                onPress={handlePreview}
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
      if (!item.reactions || item.reactions.length === 0) return null;
      
      return (
        <View style={[
          styles.reactionsContainer,
          isMe ? styles.myReactionsContainer : styles.theirReactionsContainer
        ]}>
          {item.reactions.map((reaction, index) => (
            <Text key={`${reaction.messageId}-${index}`} style={styles.reactionEmoji}>
              {reaction.reaction}
            </Text>
          ))}
        </View>
      );
    };

    return (
      <TouchableOpacity
        onLongPress={() => {
          if (isMe) {
            setSelectedMessageForActions(item);
            setShowMessageActions(true);
          } else {
            setSelectedMessage(item);
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
              source={{ uri: item.senderAvatar || 'https://randomuser.me/api/portraits/men/1.jpg' }}
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
              renderImageContent()
            ) : isFileMessage(item.content) ? (
              renderFileContent()
            ) : (
              <Text style={[styles.messageText, !isMe && styles.theirMessageText]}>
                {item.content}
              </Text>
            )}
            {renderReactions()}
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
                {messages.length} thành viên
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
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.messageId}
          style={styles.flatList}
          contentContainerStyle={styles.messagesList}
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

      {/* Reaction Modal */}
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
                    }
                  }
                }}
              >
                <Text style={styles.reactionEmoji}>{reaction.emoji}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Message Actions Modal */}
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
              onPress={() => selectedMessageForActions && handleRecall(selectedMessageForActions.messageId)}
            >
              <Ionicons name="refresh-outline" size={24} color="#0068ff" />
              <Text style={styles.messageActionText}>Thu hồi</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.messageActionButton}
              onPress={() => selectedMessageForActions && handleDelete(selectedMessageForActions.messageId)}
            >
              <Ionicons name="trash-outline" size={24} color="#ff3b30" />
              <Text style={[styles.messageActionText, { color: '#ff3b30' }]}>Xóa</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
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
  reactionMenu: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 30,
    padding: 8,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    flexWrap: 'wrap',
    maxWidth: '80%',
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
  reactionsContainer: {
    flexDirection: 'row',
    position: 'absolute',
    bottom: -15,
    backgroundColor: 'white',
    borderRadius: 12,
    paddingHorizontal: 4,
    paddingVertical: 2,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    zIndex: 1,
  },
  myReactionsContainer: {
    left: 10,
  },
  theirReactionsContainer: {
    right: 10,
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
});

export default ChatGroupScreen; 
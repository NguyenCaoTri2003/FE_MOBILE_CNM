import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, SafeAreaView, TouchableOpacity, TextInput, StatusBar, FlatList, KeyboardAvoidingView, Platform } from 'react-native';
import { Text, Avatar } from '@rneui/themed';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { getMessages, sendMessage, markMessageAsRead, Message } from '../services/api';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import { io } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

type RouteParams = {
  receiverEmail: string;
  fullName: string;
  avatar: string;
  lastSeen?: string;
};

const ChatScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute();
  const { receiverEmail, fullName, avatar, lastSeen } = route.params as RouteParams;
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const flatListRef = useRef<FlatList>(null);
  const socket = useRef<any>(null);

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
            setMessages(prev => [...prev, message]);
            scrollToBottom();
          }
        });

        socket.current.on('messageRead', (data: { messageId: string }) => {
          console.log('Message read:', data.messageId);
          setMessages(prev => prev.map(msg => 
            msg.messageId === data.messageId ? { ...msg, status: 'read' } : msg
          ));
        });

        return () => {
          if (socket.current) {
            socket.current.disconnect();
          }
        };
      } catch (error) {
        console.error('Error initializing socket:', error);
      }
    };

    initializeSocket();
  }, []);

  const loadMessages = async () => {
    try {
      console.log('Loading messages for:', receiverEmail);
      const response = await getMessages(receiverEmail);
      if (response.success) {
        setMessages(response.data);
        scrollToBottom();
        // Mark messages as read
        response.data.forEach(msg => {
          if (msg.status !== 'read' && msg.senderEmail === receiverEmail) {
            markMessageAsRead(msg.messageId);
          }
        });
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const scrollToBottom = () => {
    if (flatListRef.current) {
      flatListRef.current.scrollToEnd({ animated: true });
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;

    try {
      console.log('Sending message to:', receiverEmail);
      const response = await sendMessage(receiverEmail, newMessage.trim());
      if (response.success) {
        setMessages(prev => [...prev, response.data]);
        setNewMessage('');
        scrollToBottom();

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

  const renderMessage = ({ item }: { item: Message }) => {
    const isMe = item.senderEmail !== receiverEmail;
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
          <Text style={[styles.messageText, !isMe && { color: '#000' }]}>{item.content}</Text>
          <Text style={[styles.messageTime, !isMe && { color: 'rgba(0, 0, 0, 0.5)' }]}>
            {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true, locale: vi })}
            {item.status === 'read' && isMe && ' ✓✓'}
          </Text>
        </View>
      </View>
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
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.messageId}
          onContentSizeChange={() => scrollToBottom()}
          onLayout={() => scrollToBottom()}
          contentContainerStyle={styles.messagesList}
        />

        {/* Bottom Input Bar */}
        <View style={styles.inputContainer}>
          <View style={styles.inputWrapper}>
            <TouchableOpacity style={styles.inputIcon}>
              <Ionicons name="happy-outline" size={24} color="#666" />
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
              <TouchableOpacity style={styles.inputIcon}>
                <Ionicons name="ellipsis-horizontal" size={24} color="#666" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.inputIcon}>
                <Ionicons name="mic-outline" size={24} color="#666" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.inputIcon}>
                <Ionicons name="image-outline" size={24} color="#666" />
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
  messagesList: {
    padding: 10,
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
  messageTime: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 4,
    alignSelf: 'flex-end',
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
});

export default ChatScreen; 
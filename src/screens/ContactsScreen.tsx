import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, TextInput, StatusBar, ScrollView, ActivityIndicator, Alert, Modal, Image } from 'react-native';
import { Text, Avatar, Tab, TabView } from '@rneui/themed';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { Ionicons, MaterialIcons, FontAwesome } from '@expo/vector-icons';
import { searchUsers, sendFriendRequest, getFriendRequests, respondToFriendRequest, withdrawFriendRequest, getFriends, unfriend, getGroups } from '../services/api';
import type { FriendRequest as BaseFriendRequest, Group, GroupMember } from '../services/api';
import { socketService } from '../services/socket';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Add type definitions at the top of the file
declare global {
  var cachedContacts: ContactGroup[];
}

interface Contact {
  email: string;
  fullName: string;
  avatar: string;
  online?: boolean;
}

interface ContactGroup {
  letter: string;
  items: Contact[];
}

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface ApiSearchResponse {
  success: boolean;
  data: SearchResult;
}

interface SearchResult {
  fullName: string;
  avatar: string;
  phoneNumber?: string;
  email?: string;
  isFriend?: boolean;
  hasSentRequest?: boolean;
}

interface FriendRequest extends BaseFriendRequest {
  online?: boolean;
}

interface Friend {
  email: string;
  fullName: string;
  avatar: string;
  online?: boolean;
}

interface FriendListUpdateData {
  type: 'newFriend' | 'unfriend';
  friend?: Friend;
  email?: string;
}

// Define a type for the socket message
interface SocketGroupMessage {
  content: string;
  sender: string;
  timestamp: string;
}

function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

const ContactsScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const [activeTab, setActiveTab] = useState('contacts');
  const [contactsIndex, setContactsIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [pendingFriendRequests, setPendingFriendRequests] = useState(0);
  const [sentRequests, setSentRequests] = useState<FriendRequest[]>([]);
  const [sentRequestEmails, setSentRequestEmails] = useState<Set<string>>(new Set());
  const [friendList, setFriendList] = useState<Set<string>>(new Set());
  const [contacts, setContacts] = useState<ContactGroup[]>([]);
  const [totalFriends, setTotalFriends] = useState(0);
  const [recentlyActive, setRecentlyActive] = useState(0);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [groups, setGroups] = useState<Group[]>([]);

  useFocusEffect(
    useCallback(() => {
      setActiveTab('contacts');
    }, [])
  );

  useEffect(() => {
    // Try to load from cache first
    const cachedContacts = global.cachedContacts;
    if (cachedContacts) {
      setContacts(cachedContacts);
      setTotalFriends(cachedContacts.reduce((sum, group) => sum + group.items.length, 0));
    }

    // Load initial data without loading states
    const loadInitialData = async () => {
      try {
        // Load friend requests, friends data and groups in parallel
        const [friendRequestsResponse, friendsResponse, groupsResponse] = await Promise.all([
          getFriendRequests(),
          getFriends(),
          getGroups()
        ]);

        if (friendRequestsResponse.success) {
          const { received, sent } = friendRequestsResponse.data;
          setFriendRequests(received);
          setPendingFriendRequests(received.length);
          setSentRequests(sent);
          setSentRequestEmails(new Set(sent.map(req => req.email)));
        }

        if (friendsResponse.success && friendsResponse.data) {
          const friends = friendsResponse.data;
          // Set initial contacts without online status
          const initialGroups = groupFriendsByFirstLetter(friends.map(friend => ({
            ...friend,
            online: false // Default to offline initially
          })));

          // Cache the contacts data globally
          global.cachedContacts = initialGroups;
          
          setContacts(initialGroups);
          setTotalFriends(friends.length);
          setFriendList(new Set(friends.map((friend: Friend) => friend.email)));

          // Emit socket event to get online status updates after a small delay
          setTimeout(() => {
            socketService.emit('getFriendsList', {});
          }, 100);
        }

        if (groupsResponse.success) {
          setGroups(groupsResponse.data);
        }
      } catch (error) {
        console.error('Error loading initial data:', error);
      }
    };

    loadInitialData();

    // Socket event listeners for real-time updates
    const handleFriendListUpdate = (data: FriendListUpdateData) => {
      console.log('Received friendListUpdate:', data);
      
      if (data.type === 'newFriend' && data.friend) {
        const newFriend: Contact = {
          email: data.friend.email,
          fullName: data.friend.fullName,
          avatar: data.friend.avatar,
          online: data.friend.online || false
        };

        setContacts(prev => {
          const letter = newFriend.fullName.charAt(0).toUpperCase();
          
          const existingGroup = prev.find(group => group.letter === letter);
          if (existingGroup) {
            const newGroups = prev.map(group =>
              group.letter === letter
                ? { ...group, items: [...group.items, newFriend] }
                : group
            );
            // Update cache
            global.cachedContacts = newGroups;
            return newGroups;
          } else {
            const newGroups = [...prev, { letter, items: [newFriend] }].sort((a, b) =>
              a.letter.localeCompare(b.letter)
            );
            // Update cache
            global.cachedContacts = newGroups;
            return newGroups;
          }
        });

        setTotalFriends(prev => prev + 1);
        if (newFriend.online) {
          setRecentlyActive(prev => prev + 1);
        }
      } else if (data.type === 'unfriend' && data.email) {
        const emailToRemove = data.email;
        setContacts(prev => {
          const updatedGroups = prev.map(group => ({
            ...group,
            items: group.items.filter(friend => {
              if (friend.email === emailToRemove) {
                if (friend.online) {
                  setRecentlyActive(count => Math.max(0, count - 1));
                }
                setTotalFriends(count => Math.max(0, count - 1));
                return false;
              }
              return true;
            })
          })).filter(group => group.items.length > 0);
          
          // Update cache
          global.cachedContacts = updatedGroups;
          return updatedGroups;
        });
      }
    };

    const handleFriendStatusUpdate = (data: { email: string, online: boolean }) => {
      setContacts(prev => {
        let foundUser = false;
        const updatedGroups = prev.map(group => ({
          ...group,
          items: group.items.map(item => {
            if (item.email === data.email) {
              foundUser = true;
              if (item.online !== data.online) {
                if (data.online) {
                  setRecentlyActive(prev => prev + 1);
                } else {
                  setRecentlyActive(prev => Math.max(0, prev - 1));
                }
              }
              return { ...item, online: data.online };
            }
            return item;
          })
        }));

        // Update cache
        global.cachedContacts = updatedGroups;
        return updatedGroups;
      });
    };

    // Group chat socket event listeners
    const handleGroupList = (data: { groups: Group[] }) => {
      console.log('Received groupList:', data);
      setGroups(data.groups);
    };

    const handleGroupCreated = (data: { group: Group }) => {
      console.log('Received groupCreated:', data);
      setGroups(prev => {
        // Check if group already exists to avoid duplicates
        const groupExists = prev.some(g => g.groupId === data.group.groupId);
        if (groupExists) {
          return prev;
        }
        return [...prev, data.group];
      });
    };

    const handleGroupJoined = (data: { group: Group }) => {
      console.log('Received groupJoined:', data);
      setGroups(prev => {
        // Check if group already exists
        const groupExists = prev.some(g => g.groupId === data.group.groupId);
        if (groupExists) {
          return prev;
        }
        return [...prev, data.group];
      });
    };

    const handleGroupMembersUpdated = (data: { groupId: string, newMembers: GroupMember[] }) => {
      console.log('Received groupMembersUpdated:', data);
      setGroups(prev => 
        prev.map(group => 
          group.groupId === data.groupId 
            ? { ...group, members: [...group.members, ...data.newMembers] } 
            : group
        )
      );
    };

    const handleNewGroupMessage = (data: { groupId: string, message: SocketGroupMessage }) => {
      console.log('Received newGroupMessage:', data);
      setGroups(prev => 
        prev.map(group => 
          group.groupId === data.groupId 
            ? { 
                ...group, 
                lastMessage: {
                  content: data.message.content,
                  senderEmail: data.message.sender,
                  timestamp: data.message.timestamp
                }
              } 
            : group
        )
      );
    };

    // Subscribe to socket events
    socketService.on('friendListUpdate', handleFriendListUpdate);
    socketService.on('friendStatusUpdate', handleFriendStatusUpdate);
    socketService.on('groupList', handleGroupList);
    socketService.on('groupCreated', handleGroupCreated);
    socketService.on('groupJoined', handleGroupJoined);
    socketService.on('groupMembersUpdated', handleGroupMembersUpdated);
    socketService.on('newGroupMessage', handleNewGroupMessage);

    // Emit initial online status after a small delay
    setTimeout(() => {
      socketService.emit('userStatus', { status: 'online' });
      // Join groups to get initial group list
      socketService.emit('joinGroups', {});
    }, 100);

    const unsubscribe = navigation.addListener('focus', () => {
      setActiveTab('contacts');
      // Load from cache first
      if (global.cachedContacts) {
        setContacts(global.cachedContacts);
        setTotalFriends(global.cachedContacts.reduce((sum, group) => sum + group.items.length, 0));
      }
      loadInitialData();
      // Join groups when screen is focused
      socketService.emit('joinGroups', {});
    });

    // Cleanup
    return () => {
      socketService.off('friendListUpdate', handleFriendListUpdate);
      socketService.off('friendStatusUpdate', handleFriendStatusUpdate);
      socketService.off('groupList', handleGroupList);
      socketService.off('groupCreated', handleGroupCreated);
      socketService.off('groupJoined', handleGroupJoined);
      socketService.off('groupMembersUpdated', handleGroupMembersUpdated);
      socketService.off('newGroupMessage', handleNewGroupMessage);
      socketService.emit('userStatus', { status: 'offline' });
      unsubscribe();
    };
  }, [navigation]);

  // Add effect to load groups when tab changes
  useEffect(() => {
    if (contactsIndex === 1) { // Groups tab
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
    }
  }, [contactsIndex]);

  const debouncedSearch = useCallback(
    debounce(async (query: string) => {
      if (!query.trim()) {
        setShowSearchResults(false);
        setSearchResults([]);
        return;
      }

      try {
        const response = await searchUsers(query) as ApiSearchResponse;
        if (response.success && response.data) {
          const result = response.data;
          
          // Get latest state values
          const currentSentRequestEmails = new Set(sentRequests.map(req => req.email));
          const currentFriendList = new Set(contacts.flatMap(group => group.items.map(friend => friend.email)));
          
          const searchResult: SearchResult = {
            ...result,
            isFriend: result.email ? currentFriendList.has(result.email) : false,
            hasSentRequest: result.email ? currentSentRequestEmails.has(result.email) : false
          };
          setSearchResults([searchResult]);
          setShowSearchResults(true);
        } else {
          setSearchResults([]);
          setShowSearchResults(true);
        }
      } catch (error) {
        setSearchResults([]);
        setShowSearchResults(true);
      }
    }, 300),
    [sentRequests, contacts]
  );

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setShowSearchResults(!!query.trim());
    if (query.trim()) {
      debouncedSearch(query);
      socketService.emit('search', { query });
    } else {
      setSearchResults([]);
      setShowSearchResults(false);
    }
  };

  const renderSearchResults = () => {
    if (!showSearchResults) return null;

    if (searchResults.length === 0) {
      return (
        <View style={styles.searchResultsContainer}>
          <Text style={styles.noResultsText}>Không tìm thấy người dùng</Text>
        </View>
      );
    }

    return (
      <View style={styles.searchResultsContainer}>
        {searchResults.map((user, index) => {
          const isFriend = user.email ? friendList.has(user.email) : false;
          const hasSentRequest = user.email ? sentRequestEmails.has(user.email) : false;

          return (
            <View key={index} style={styles.searchResultItem}>
              <Avatar
                rounded
                source={{ uri: user.avatar }}
                size={50}
              />
              <View style={styles.userInfo}>
                <Text style={styles.userName}>{user.fullName}</Text>
                <Text style={styles.userPhone}>Số điện thoại: {user.phoneNumber}</Text>
              </View>
              {isFriend ? (
                <View style={[styles.friendStatusButton]}>
                  <Text style={styles.friendStatusText}>BẠN BÈ</Text>
                </View>
              ) : hasSentRequest ? (
                <View style={[styles.addFriendButton, styles.sentRequestButton]}>
                  <Text style={styles.addFriendButtonText}>ĐÃ GỬI LỜI MỜI</Text>
                </View>
              ) : (
                <TouchableOpacity 
                  style={styles.addFriendButton}
                  onPress={() => user.email && handleSendFriendRequest(user.email)}
                  disabled={!user.email}
                >
                  <Text style={styles.addFriendButtonText}>KẾT BẠN</Text>
                </TouchableOpacity>
              )}
            </View>
          );
        })}
      </View>
    );
  };

  const groupFriendsByFirstLetter = (friends: Friend[]): ContactGroup[] => {
    const grouped = friends.reduce((acc: { [key: string]: Friend[] }, friend) => {
      const firstLetter = friend.fullName.charAt(0).toUpperCase();
      if (!acc[firstLetter]) {
        acc[firstLetter] = [];
      }
      acc[firstLetter].push(friend);
      return acc;
    }, {});

    return Object.entries(grouped)
      .map(([letter, items]) => ({
        letter,
        items: items.sort((a, b) => a.fullName.localeCompare(b.fullName))
      }))
      .sort((a, b) => a.letter.localeCompare(b.letter));
  };

  const renderContactSection = ({ item }: { item: ContactGroup }) => {
    return (
      <View>
        <Text style={styles.letterHeader}>{item.letter}</Text>
        {item.items.map((contact: Contact) => (
          <TouchableOpacity key={contact.email} style={styles.contactItem}>
            <View style={styles.avatarContainer}>
              <Avatar
                rounded
                source={{ uri: contact.avatar }}
                size={50}
              />
              {contact.online && <View style={styles.onlineIndicator} />}
            </View>
            <Text style={styles.contactName}>{contact.fullName}</Text>
            <View style={styles.contactActions}>
              <TouchableOpacity style={styles.actionButton}>
                <Ionicons name="call-outline" size={24} color="#666" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionButton}>
                <Ionicons name="videocam-outline" size={24} color="#666" />
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => {
                  setSelectedContact(contact);
                  setShowOptionsModal(true);
                }}
              >
                <Ionicons name="ellipsis-vertical" size={24} color="#666" />
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const renderFriendRequest = ({ item }: { item: FriendRequest }) => (
    <View style={styles.requestItem}>
      <Avatar
        rounded
        source={{ uri: item.avatar }}
        size={50}
      />
      <View style={styles.requestInfo}>
        <Text style={styles.requestName}>{item.fullName}</Text>
        <Text style={styles.requestTime}>Muốn kết bạn</Text>
      </View>
      <View style={styles.requestActions}>
        <TouchableOpacity 
          style={[styles.requestButton, styles.rejectButton]}
          onPress={() => handleRespondToRequest(item.email, false)}
        >
          <Text style={styles.rejectButtonText}>TỪ CHỐI</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.requestButton, styles.acceptButton]}
          onPress={() => handleRespondToRequest(item.email, true)}
        >
          <Text style={styles.acceptButtonText}>ĐỒNG Ý</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderSentRequest = ({ item }: { item: FriendRequest }) => (
    <View style={styles.requestItem}>
      <Avatar
        rounded
        source={{ uri: item.avatar }}
        size={50}
      />
      <View style={styles.requestInfo}>
        <Text style={styles.requestName}>{item.fullName}</Text>
        <Text style={styles.requestTime}>Đã gửi lời mời kết bạn</Text>
      </View>
      <TouchableOpacity 
        style={styles.withdrawButton}
        onPress={() => handleWithdrawRequest(item.email)}
      >
        <Text style={styles.withdrawButtonText}>THU HỒI</Text>
      </TouchableOpacity>
    </View>
  );

  // Optimized send friend request with local state update
  const handleSendFriendRequest = async (email: string) => {
    if (sentRequestEmails.has(email)) return;

    // Optimistic update
    const tempRequest: FriendRequest = {
      email,
      fullName: 'Đang tải...',
      avatar: 'https://via.placeholder.com/50',
      timestamp: new Date().toISOString(),
      status: 'pending'
    };
    
    setSentRequests(prev => [...prev, tempRequest]);
    setSentRequestEmails(prev => new Set([...prev, email]));

    try {
      const response = await sendFriendRequest(email);
      if (response.success) {
        // Update search results immediately
        setSearchResults(prev => 
          prev.map(result => 
            result.email === email 
              ? { ...result, hasSentRequest: true }
              : result
          )
        );
        socketService.emit('friendRequestSent', { receiverEmail: email });
      } else {
        // Rollback on failure
        setSentRequests(prev => prev.filter(req => req.email !== email));
        setSentRequestEmails(prev => {
          const newSet = new Set(prev);
          newSet.delete(email);
          return newSet;
        });
        // Update search results to remove sent request status
        setSearchResults(prev => 
          prev.map(result => 
            result.email === email 
              ? { ...result, hasSentRequest: false }
              : result
          )
        );
      }
    } catch (error: any) {
      // Rollback on error
      setSentRequests(prev => prev.filter(req => req.email !== email));
      setSentRequestEmails(prev => {
        const newSet = new Set(prev);
        newSet.delete(email);
        return newSet;
      });
      // Update search results to remove sent request status
      setSearchResults(prev => 
        prev.map(result => 
          result.email === email 
            ? { ...result, hasSentRequest: false }
            : result
        )
      );
    }
  };

  // Optimized respond to request with optimistic update
  const handleRespondToRequest = async (senderEmail: string, accept: boolean) => {
    // Optimistic update
    setFriendRequests(prev => prev.filter(req => req.email !== senderEmail));
    setPendingFriendRequests(prev => Math.max(0, prev - 1));
    
    try {
      const response = await respondToFriendRequest(senderEmail, accept);
      if (response.success) {
        Alert.alert('Thành công', accept ? 'Đã chấp nhận lời mời kết bạn' : 'Đã từ chối lời mời kết bạn');
        if (accept) {
          socketService.emit('friendRequestAccepted', { email: senderEmail });
        }
      } else {
        Alert.alert('Lỗi', 'Không thể xử lý lời mời kết bạn');
      }
    } catch (error: any) {
      Alert.alert('Lỗi', error.message || 'Không thể xử lý lời mời kết bạn');
    }
  };

  const handleWithdrawRequest = async (receiverEmail: string) => {
    const originalRequest = sentRequests.find(req => req.email === receiverEmail);
    if (!originalRequest) return;

    try {
      // Optimistic update for all states
      batch(() => {
        setSentRequests(prev => prev.filter(req => req.email !== receiverEmail));
        setSentRequestEmails(prev => {
          const newSet = new Set(prev);
          newSet.delete(receiverEmail);
          return newSet;
        });
        
        setSearchResults(prev => 
          prev.map(result => 
            result.email === receiverEmail 
              ? { ...result, hasSentRequest: false }
              : result
          )
        );
      });

      // Emit socket event after optimistic update
      socketService.emit('friendRequestWithdrawn', { receiverEmail });

      const response = await withdrawFriendRequest(receiverEmail);
      if (!response.success) {
        // Rollback all states if API fails
        batch(() => {
          setSentRequests(prev => [...prev, originalRequest]);
          setSentRequestEmails(prev => new Set([...prev, receiverEmail]));
          setSearchResults(prev => 
            prev.map(result => 
              result.email === receiverEmail 
                ? { ...result, hasSentRequest: true }
                : result
            )
          );
        });
        // Re-emit socket event to restore state
        socketService.emit('friendRequestSent', { receiverEmail });
      }
    } catch (error) {
      // Rollback all states on error
      batch(() => {
        setSentRequests(prev => [...prev, originalRequest]);
        setSentRequestEmails(prev => new Set([...prev, receiverEmail]));
        setSearchResults(prev => 
          prev.map(result => 
            result.email === receiverEmail 
              ? { ...result, hasSentRequest: true }
              : result
          )
        );
      });
      // Re-emit socket event to restore state
      socketService.emit('friendRequestSent', { receiverEmail });
    }
  };

  // Add effect to update search results when friend request status changes
  useEffect(() => {
    if (searchResults.length > 0) {
      setSearchResults(prev => 
        prev.map(result => ({
          ...result,
          hasSentRequest: result.email ? sentRequestEmails.has(result.email) : false,
          isFriend: result.email ? friendList.has(result.email) : false
        }))
      );
    }
  }, [sentRequestEmails, friendList, searchResults.length]);

  // Add batch update helper
  const batch = (updates: () => void) => {
    // Execute all state updates in one go
    updates();
  };

  const handleUnfriend = async (email: string) => {
    Alert.alert(
      'Xóa bạn bè',
      'Bạn có chắc chắn muốn xóa người này khỏi danh sách bạn bè?',
      [
        {
          text: 'Hủy',
          style: 'cancel',
          onPress: () => setShowOptionsModal(false)
        },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            setShowOptionsModal(false); // Đóng modal ngay lập tức
            setIsLoading(true); // Bắt đầu loading
            try {
              const response = await unfriend(email);
              if (response.success) {
                // Cập nhật UI ngay lập tức
                setContacts(prev => {
                  const updatedGroups = prev.map(group => ({
                    ...group,
                    items: group.items.filter(contact => contact.email !== email)
                  })).filter(group => group.items.length > 0);
                  
                  // Cập nhật cache
                  global.cachedContacts = updatedGroups;
                  return updatedGroups;
                });
                setTotalFriends(prev => prev - 1);
                Alert.alert('Thành công', 'Đã xóa bạn bè');
              } else {
                Alert.alert('Lỗi', response.message || 'Không thể xóa bạn bè');
              }
            } catch (error: any) {
              Alert.alert('Lỗi', error.message || 'Không thể kết nối đến server');
            } finally {
              setIsLoading(false); // Kết thúc loading
            }
          }
        }
      ]
    );
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 60) {
      return `${minutes} phút`;
    } else if (hours < 24) {
      return `${hours} giờ`;
    } else if (days < 7) {
      return `${days} ngày`;
    } else {
      return 'T' + date.getDay();
    }
  };

  const handleCreateGroup = () => {
    navigation.navigate('CreateGroup');
  };

  // Hàm xử lý nội dung tin nhắn cuối cùng của nhóm
  const getGroupLastMessageContent = (lastMessage: any) => {
    if (!lastMessage) return 'Chưa có tin nhắn';
    // Nếu có metadata và fileType là image
    if (lastMessage.metadata?.fileType?.startsWith('image')) {
      return 'Đã gửi ảnh';
    }
    // Nếu có metadata và fileType là file (không phải image, video)
    if (lastMessage.metadata?.fileType && !lastMessage.metadata.fileType.startsWith('image') && !lastMessage.metadata.fileType.startsWith('video')) {
      return 'Đã gửi file';
    }
    // Nếu content là link amazonaws và không có metadata
    if (typeof lastMessage.content === 'string' && lastMessage.content.includes('amazonaws.com')) {
      if (lastMessage.content.match(/\.(jpg|jpeg|png|gif|bmp|webp)$/i)) {
        return 'Đã gửi ảnh';
      }
      return 'Đã gửi file';
    }
    return lastMessage.content;
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }} edges={['top', 'bottom', 'left', 'right']}>
      <StatusBar backgroundColor="#0068ff" barStyle="light-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={24} color="#fff" style={styles.searchIcon} />
          <TextInput
            placeholder="Tìm kiếm bằng email hoặc SĐT"
            placeholderTextColor="#fff"
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={handleSearch}
            autoComplete="off"
            textContentType="none"
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery ? (
            <TouchableOpacity 
              onPress={() => {
                setSearchQuery('');
                setShowSearchResults(false);
                setSearchResults([]);
              }}
              style={styles.clearButton}
            >
              <Ionicons name="close-circle" size={20} color="#fff" />
            </TouchableOpacity>
          ) : null}
        </View>
        <View style={styles.headerIcons}>
          <TouchableOpacity style={styles.addButton}>
            <Ionicons name="person-add" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Content */}
      <View style={{ flex: 1 }}>
        {showSearchResults ? (
          renderSearchResults()
        ) : (
          <>
            {/* Contacts Tabs */}
            <View style={styles.tabContainer}>
              <Tab
                value={contactsIndex}
                onChange={setContactsIndex}
                indicatorStyle={{ backgroundColor: '#0068ff', height: 3 }}
                containerStyle={{ backgroundColor: 'white' }}
              >
                <Tab.Item
                  title="Bạn bè"
                  titleStyle={(active) => ({ color: active ? '#0068ff' : '#666', fontSize: 16 })}
                />
                <Tab.Item
                  title="Nhóm"
                  titleStyle={(active) => ({ color: active ? '#0068ff' : '#666', fontSize: 16 })}
                />
                <Tab.Item
                  title="OA"
                  titleStyle={(active) => ({ color: active ? '#0068ff' : '#666', fontSize: 16 })}
                />
              </Tab>
            </View>

            <TabView value={contactsIndex} onChange={setContactsIndex} animationType="spring">
              <TabView.Item style={styles.tabContent}>
                <ScrollView>
                  {/* Friend Requests */}
                  <TouchableOpacity 
                    style={styles.specialItem}
                    onPress={() => navigation.navigate('FriendRequests')}
                  >
                    <View style={styles.specialIcon}>
                      <MaterialIcons name="person-add" size={24} color="#fff" />
                    </View>
                    <Text style={styles.specialItemText}>
                      Lời mời kết bạn ({pendingFriendRequests})
                    </Text>
                  </TouchableOpacity>

                  {/* Phone Contacts */}
                  <TouchableOpacity style={styles.specialItem}>
                    <View style={[styles.specialIcon, { backgroundColor: '#2ecc71' }]}>
                      <MaterialIcons name="contacts" size={24} color="#fff" />
                    </View>
                    <View style={styles.specialItemTextContainer}>
                      <Text style={styles.specialItemText}>Danh bạ máy</Text>
                      <Text style={styles.specialItemSubtext}>Các liên hệ có dùng Zalo</Text>
                    </View>
                  </TouchableOpacity>

                  {/* Birthdays */}
                  <TouchableOpacity style={styles.specialItem}>
                    <View style={[styles.specialIcon, { backgroundColor: '#e74c3c' }]}>
                      <FontAwesome name="birthday-cake" size={24} color="#fff" />
                    </View>
                    <Text style={styles.specialItemText}>Sinh nhật</Text>
                  </TouchableOpacity>

                  {/* Filter Options */}
                  <View style={styles.filterContainer}>
                    <TouchableOpacity style={styles.filterButton}>
                      <Text style={styles.filterButtonText}>Tất cả {totalFriends}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.filterButton, styles.outlineButton]}>
                      <Text style={styles.outlineButtonText}>Mới truy cập {recentlyActive}</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Contacts List */}
                  <FlatList
                    data={contacts}
                    renderItem={renderContactSection}
                    keyExtractor={(item) => item.letter}
                    scrollEnabled={false}
                  />
                </ScrollView>
              </TabView.Item>

              <TabView.Item style={styles.tabContent}>
                <ScrollView style={styles.groupContainer}>
                  {/* Create Group Button */}
                  <TouchableOpacity 
                    style={styles.createGroupButton}
                    onPress={handleCreateGroup}
                  >
                    <View style={styles.createGroupIcon}>
                      <Ionicons name="people" size={20} color="#fff" />
                      <Ionicons name="add" size={14} color="#fff" style={styles.addIcon} />
                    </View>
                    <View style={styles.createGroupTextContainer}>
                      <Text style={styles.createGroupText}>Tạo nhóm mới</Text>
                    </View>
                  </TouchableOpacity>

                  {/* Group Features */}
                  <View style={styles.groupFeatures}>
                    <TouchableOpacity style={styles.featureItem}>
                      <View style={[styles.featureIcon, { backgroundColor: '#2ecc71' }]}>
                        <Ionicons name="calendar" size={20} color="#fff" />
                      </View>
                      <Text style={styles.featureText}>Lịch</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.featureItem}>
                      <View style={[styles.featureIcon, { backgroundColor: '#e74c3c' }]}>
                        <Ionicons name="alarm" size={20} color="#fff" />
                      </View>
                      <Text style={styles.featureText}>Nhắc hẹn</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.featureItem}>
                      <View style={[styles.featureIcon, { backgroundColor: '#3498db' }]}>
                        <Ionicons name="people" size={20} color="#fff" />
                      </View>
                      <Text style={styles.featureText}>Nhóm Offline</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.featureItem}>
                      <View style={[styles.featureIcon, { backgroundColor: '#9b59b6' }]}>
                        <Ionicons name="images" size={20} color="#fff" />
                      </View>
                      <Text style={styles.featureText}>Chia sẻ ảnh</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Joined Groups Section */}
                  <View style={styles.joinedGroupsSection}>
                    <View style={styles.sectionHeader}>
                      <Text style={styles.sectionTitle}>Nhóm đang tham gia ({groups.length})</Text>
                      <TouchableOpacity style={styles.sortButton}>
                        <Text style={styles.sortText}>Sắp xếp</Text>
                        <Ionicons name="swap-vertical" size={16} color="#666" />
                      </TouchableOpacity>
                    </View>

                    {/* Group List */}
                    <View>
                      {groups.length === 0 ? (
                        <View style={styles.emptyGroupContainer}>
                          <Text style={styles.emptyGroupText}>Bạn chưa tham gia nhóm nào</Text>
                          <TouchableOpacity 
                            style={styles.createEmptyGroupButton}
                            onPress={handleCreateGroup}
                          >
                            <Text style={styles.createEmptyGroupButtonText}>Tạo nhóm mới</Text>
                          </TouchableOpacity>
                        </View>
                      ) : (
                        groups.map((group) => (
                          <TouchableOpacity 
                            key={group.groupId} 
                            style={styles.groupItem}
                            onPress={() => navigation.navigate('ChatGroup', { 
                              groupId: group.groupId,
                              groupName: group.name,
                              avatar: group.avatar || ''
                            })}
                          >
                            {group.avatar ? (
                              <Image 
                                source={{ uri: group.avatar }} 
                                style={styles.groupAvatar}
                              />
                            ) : (
                              <View style={[styles.groupAvatar, styles.noAvatarPlaceholder]}>
                                <Text style={styles.avatarLetter}>
                                  {group.name.charAt(0).toUpperCase()}
                                </Text>
                              </View>
                            )}
                            <View style={styles.groupItemContent}>
                              <Text style={styles.groupName}>{group.name}</Text>
                              <Text style={styles.groupLastMessage}>
                                {group.lastMessage ? getGroupLastMessageContent(group.lastMessage) : 'Chưa có tin nhắn'}
                              </Text>
                              <Text style={styles.groupTime}>
                                {group.lastMessage ? formatTime(new Date(group.lastMessage.timestamp)) : ''}
                              </Text>
                            </View>
                          </TouchableOpacity>
                        ))
                      )}
                    </View>
                  </View>
                </ScrollView>
              </TabView.Item>

              <TabView.Item style={styles.tabContent}>
                <View style={styles.emptyContent}>
                  <Text>Danh sách tài khoản chính thức</Text>
                </View>
              </TabView.Item>
            </TabView>
          </>
        )}
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

      {/* Options Modal */}
      <Modal
        visible={showOptionsModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowOptionsModal(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowOptionsModal(false)}
        >
          <View style={styles.modalContent}>
            <TouchableOpacity 
              style={styles.modalOption}
              onPress={() => selectedContact && handleUnfriend(selectedContact.email)}
            >
              <Ionicons name="person-remove" size={24} color="red" />
              <Text style={styles.modalOptionTextDanger}>Xóa bạn bè</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Loading Indicator */}
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#0068ff" />
        </View>
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
    paddingRight: 10,
  },
  headerIcons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  addButton: {},
  tabContainer: {
    backgroundColor: '#fff',
  },
  tabContent: {
    width: '100%',
    backgroundColor: '#fff',
  },
  specialItem: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 16,
    alignItems: 'center',
    borderBottomWidth: 0.5,
    borderBottomColor: '#e0e0e0',
  },
  specialIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#3498db',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  specialItemText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  specialItemTextContainer: {
    flex: 1,
  },
  specialItemSubtext: {
    fontSize: 14,
    color: '#999',
  },
  filterContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  filterButton: {
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginRight: 10,
    borderWidth: 0.5,
    borderColor: '#ddd',
  },
  outlineButton: {
    backgroundColor: 'transparent',
  },
  filterButtonText: {
    color: '#333',
    fontWeight: 'bold',
  },
  outlineButtonText: {
    color: '#999',
    fontWeight: 'bold',
  },
  letterHeader: {
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontWeight: 'bold',
    fontSize: 16,
    color: '#333',
  },
  avatarContainer: {
    position: 'relative',
  },
  onlineIndicator: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#4CAF50',
    borderWidth: 2,
    borderColor: '#fff',
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 0.5,
    borderBottomColor: '#e0e0e0',
  },
  contactName: {
    fontSize: 16,
    marginLeft: 16,
    flex: 1,
    color: '#333',
  },
  contactActions: {
    flexDirection: 'row',
    gap: 15,
  },
  actionButton: {
    padding: 5,
  },
  emptyContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
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
  activeNavItem: {},
  navText: {
    fontSize: 12,
    marginTop: 2,
    color: '#666',
  },
  activeNavText: {
    color: '#0068ff',
  },
  searchResultsContainer: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
  },
  searchResultTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  userInfo: {
    flex: 1,
    marginLeft: 16,
  },
  userName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
    marginBottom: 4,
  },
  userPhone: {
    fontSize: 14,
    color: '#666',
  },
  addFriendButton: {
    backgroundColor: '#0068ff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  addFriendButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  noResultsText: {
    textAlign: 'center',
    color: '#666',
    fontSize: 16,
    marginTop: 20,
    padding: 20,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  clearButton: {
    padding: 5,
  },
  requestItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  requestInfo: {
    flex: 1,
    marginLeft: 16,
  },
  requestName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
  },
  requestTime: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  requestActions: {
    flexDirection: 'row',
    gap: 8,
  },
  requestButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  rejectButton: {
    backgroundColor: '#f0f0f0',
  },
  acceptButton: {
    backgroundColor: '#0068ff',
  },
  rejectButtonText: {
    color: '#666',
    fontSize: 14,
    fontWeight: 'bold',
  },
  acceptButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  withdrawButton: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  withdrawButtonText: {
    color: '#666',
    fontSize: 14,
    fontWeight: 'bold',
  },
  sentRequestButton: {
    backgroundColor: '#ccc',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
    fontSize: 16,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999
  },
  friendStatusButton: {
    backgroundColor: '#e8e8e8',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  friendStatusText: {
    color: '#666',
    fontSize: 14,
    fontWeight: 'bold',
  },
  mainContent: {
    flex: 1,
    backgroundColor: '#fff',
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
  },
  refreshButton: {
    backgroundColor: '#0068ff',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  refreshButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  modalContent: {
    width: '80%',
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee'
  },
  modalOptionTextDanger: {
    color: 'red',
    fontSize: 16,
    marginLeft: 15
  },
  groupContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  createGroupButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  createGroupIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#0068ff',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  addIcon: {
    position: 'absolute',
    right: -5,
    bottom: -5,
    backgroundColor: '#0068ff',
    borderRadius: 8,
  },
  createGroupTextContainer: {
    flex: 1,
    marginLeft: 16,
  },
  createGroupText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  groupFeatures: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 8,
    backgroundColor: '#fff',
    marginTop: 8,
  },
  featureItem: {
    width: '25%',
    padding: 8,
    alignItems: 'center',
  },
  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  featureText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  joinedGroupsSection: {
    marginTop: 8,
    backgroundColor: '#fff',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sortText: {
    fontSize: 14,
    color: '#666',
    marginRight: 4,
  },
  groupItem: {
    flexDirection: 'row',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  groupAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  groupItemContent: {
    flex: 1,
  },
  groupName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  groupLastMessage: {
    fontSize: 14,
    color: '#666',
  },
  groupTime: {
    fontSize: 12,
    color: '#999',
    position: 'absolute',
    right: 12,
    top: 12,
  },
  noAvatarPlaceholder: {
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarLetter: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#666',
  },
  emptyGroupContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyGroupText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
    textAlign: 'center',
  },
  createEmptyGroupButton: {
    backgroundColor: '#0068ff',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  createEmptyGroupButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
});

export default ContactsScreen; 
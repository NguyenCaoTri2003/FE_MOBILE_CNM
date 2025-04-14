import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, TextInput, SafeAreaView, StatusBar, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { Text, Avatar, Tab, TabView } from '@rneui/themed';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { Ionicons, MaterialIcons, FontAwesome } from '@expo/vector-icons';
import { searchUsers, sendFriendRequest, getFriendRequests, respondToFriendRequest, withdrawFriendRequest, getFriends } from '../services/api';
import type { FriendRequest as BaseFriendRequest } from '../services/api';
import { socketService } from '../services/socket';

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
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [pendingFriendRequests, setPendingFriendRequests] = useState(0);
  const [sentRequests, setSentRequests] = useState<FriendRequest[]>([]);
  const [sentRequestEmails, setSentRequestEmails] = useState<Set<string>>(new Set());
  const [friendList, setFriendList] = useState<Set<string>>(new Set());
  const [contacts, setContacts] = useState<ContactGroup[]>([]);
  const [totalFriends, setTotalFriends] = useState(0);
  const [recentlyActive, setRecentlyActive] = useState(0);

  // Add focus effect to refresh data when screen is focused
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      // Refresh friend requests and sent requests
      const loadFriendRequests = async () => {
        try {
          const response = await getFriendRequests();
          if (response.success) {
            const { received, sent } = response.data;
            setFriendRequests(received);
            setPendingFriendRequests(received.length);
            setSentRequests(sent);
            setSentRequestEmails(new Set(sent.map(req => req.email)));
          }
        } catch (error) {
          // Handle error silently
          setFriendRequests([]);
          setPendingFriendRequests(0);
          setSentRequests([]);
          setSentRequestEmails(new Set());
        }
      };

      // Refresh friends list
      const loadFriends = async () => {
        try {
          const response = await getFriends();
          if (response.success) {
            const friends = response.data;
            const groupedFriends = groupFriendsByFirstLetter(friends);
            setContacts(groupedFriends);
            setTotalFriends(friends.length);
            setRecentlyActive(friends.filter((friend: Friend) => friend.online).length);
            setFriendList(new Set(friends.map((friend: Friend) => friend.email)));
          }
        } catch (error) {
          // Handle error silently
          setContacts([]);
          setTotalFriends(0);
          setRecentlyActive(0);
          setFriendList(new Set());
        }
      };

      // Refresh search results if there's an active search
      if (searchQuery.trim()) {
        debouncedSearch(searchQuery);
      }

      // Load all data
      Promise.all([loadFriendRequests(), loadFriends()]);
    });

    return unsubscribe;
  }, [navigation, searchQuery]);

  // Load initial data
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        // Emit socket event to get initial friends list
        socketService.emit('getFriendsList', {});

        // Load friend requests data
        const friendRequestsResponse = await getFriendRequests();
        if (friendRequestsResponse.success) {
          const { received, sent } = friendRequestsResponse.data;
          setFriendRequests(received);
          setPendingFriendRequests(received.length);
          setSentRequests(sent);
          setSentRequestEmails(new Set(sent.map(req => req.email)));
        }
      } catch (error) {
        setFriendRequests([]);
        setPendingFriendRequests(0);
        setSentRequests([]);
        setSentRequestEmails(new Set());
      }
    };

    loadInitialData();
  }, []);

  // Socket event handlers for real-time updates
  useEffect(() => {
    // Handle initial friends list data
    const handleInitialFriendsList = (data: Friend[]) => {
      const groupedFriends = groupFriendsByFirstLetter(data);
      setContacts(groupedFriends);
      setTotalFriends(data.length);
      setRecentlyActive(data.filter((friend: Friend) => friend.online).length);
      setFriendList(new Set(data.map((friend: Friend) => friend.email)));
    };

    // Handle friend status changes
    const handleFriendStatusChange = (data: { email: string; online: boolean }) => {
      setContacts(prev => {
        return prev.map(group => ({
          ...group,
          items: group.items.map(contact => 
            contact.email === data.email 
              ? { ...contact, online: data.online }
              : contact
          )
        }));
      });
      
      setRecentlyActive(prev => data.online ? prev + 1 : Math.max(0, prev - 1));
    };

    // Handle new friend added
    const handleFriendAdded = (newFriend: Friend) => {
      setContacts(prev => {
        const firstLetter = newFriend.fullName.charAt(0).toUpperCase();
        const existingGroupIndex = prev.findIndex(group => group.letter === firstLetter);
        
        if (existingGroupIndex !== -1) {
          const newGroups = [...prev];
          newGroups[existingGroupIndex].items.push(newFriend);
          newGroups[existingGroupIndex].items.sort((a, b) => 
            a.fullName.localeCompare(b.fullName)
          );
          return newGroups;
        } else {
          const newGroup = {
            letter: firstLetter,
            items: [newFriend]
          };
          return [...prev, newGroup].sort((a, b) => 
            a.letter.localeCompare(b.letter)
          );
        }
      });
      
      setTotalFriends(prev => prev + 1);
      if (newFriend.online) {
        setRecentlyActive(prev => prev + 1);
      }
      setFriendList(prev => new Set([...prev, newFriend.email]));
    };

    // Handle friend removed
    const handleFriendRemoved = (removedEmail: string) => {
      setContacts(prev => {
        const newGroups = prev.map(group => ({
          ...group,
          items: group.items.filter(contact => contact.email !== removedEmail)
        })).filter(group => group.items.length > 0);
        
        return newGroups;
      });
      
      setTotalFriends(prev => Math.max(0, prev - 1));
      setFriendList(prev => {
        const newSet = new Set(prev);
        newSet.delete(removedEmail);
        return newSet;
      });
      
      setRecentlyActive(prev => {
        const wasOnline = contacts.some(group => 
          group.items.some(contact => 
            contact.email === removedEmail && contact.online
          )
        );
        return wasOnline ? Math.max(0, prev - 1) : prev;
      });
    };

    // Handle real-time search updates
    const handleSearchUpdate = (data: { email: string; hasSentRequest: boolean; isFriend: boolean }) => {
      setSearchResults(prev => 
        prev.map(result => 
          result.email === data.email 
            ? { ...result, hasSentRequest: data.hasSentRequest, isFriend: data.isFriend }
            : result
        )
      );
    };

    // Handle empty state updates
    const handleEmptyStateUpdate = (data: { hasFriends: boolean }) => {
      if (data.hasFriends) {
        // Refresh contacts list
        const loadContacts = async () => {
          try {
            const friendsResponse = await getFriends();
            if (friendsResponse.success) {
              const friends = friendsResponse.data;
              const groupedFriends = groupFriendsByFirstLetter(friends);
              setContacts(groupedFriends);
              setTotalFriends(friends.length);
              setRecentlyActive(friends.filter((friend: Friend) => friend.online).length);
              setFriendList(new Set(friends.map((friend: Friend) => friend.email)));
            }
          } catch (error) {
            console.error('Error loading contacts:', error);
          }
        };
        loadContacts();
      }
    };

    // Subscribe to socket events
    socketService.on('initialFriendsList', handleInitialFriendsList);
    socketService.on('friendStatusChange', handleFriendStatusChange);
    socketService.on('friendAdded', handleFriendAdded);
    socketService.on('friendRemoved', handleFriendRemoved);
    socketService.on('searchUpdate', handleSearchUpdate);
    socketService.on('emptyStateUpdate', handleEmptyStateUpdate);

    // Cleanup socket listeners
    return () => {
      socketService.off('initialFriendsList', handleInitialFriendsList);
      socketService.off('friendStatusChange', handleFriendStatusChange);
      socketService.off('friendAdded', handleFriendAdded);
      socketService.off('friendRemoved', handleFriendRemoved);
      socketService.off('searchUpdate', handleSearchUpdate);
      socketService.off('emptyStateUpdate', handleEmptyStateUpdate);
    };
  }, []);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setShowSearchResults(!!query.trim());
    if (query.trim()) {
      debouncedSearch(query);
      // Emit search event to server for real-time updates
      socketService.emit('search', { query });
    } else {
      setSearchResults([]);
      setShowSearchResults(false);
    }
  };

  const debouncedSearch = useCallback(
    debounce(async (query: string) => {
      if (!query.trim()) {
        setShowSearchResults(false);
        setSearchResults([]);
        return;
      }

      setIsSearching(true);
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
      } finally {
        setIsSearching(false);
      }
    }, 300),
    [sentRequests, contacts]
  );

  const renderSearchResults = () => {
    if (!showSearchResults) return null;

    if (isSearching) {
      return (
        <View style={styles.searchResultsContainer}>
          <ActivityIndicator size="large" color="#0068ff" />
        </View>
      );
    }

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
          // Always check current state when rendering
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

  // Remove loading indicator component
  const LoadingIndicator = () => null;

  return (
    <SafeAreaView style={styles.container}>
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
      <View style={styles.mainContent}>
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
                <View style={styles.emptyContent}>
                  <Text>Danh sách nhóm</Text>
                </View>
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
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
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
});

export default ContactsScreen; 
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Text, Avatar, Tab, TabView } from '@rneui/themed';
import { getFriendRequests, respondToFriendRequest, withdrawFriendRequest, FriendRequest } from '../services/api';
import { socketService } from '../services/socket';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

const FriendRequestsScreen = () => {
  const navigation = useNavigation();
  const [index, setIndex] = useState(0);
  const [receivedRequests, setReceivedRequests] = useState<FriendRequest[]>([]);
  const [sentRequests, setSentRequests] = useState<FriendRequest[]>([]);

  // Initial load and socket setup
  useEffect(() => {
    // Load initial data
    const loadInitialData = async () => {
      try {
        const response = await getFriendRequests();
        if (response.success) {
          setReceivedRequests(response.data.received);
          setSentRequests(response.data.sent);
        }
      } catch (error) {
        // Handle error silently
        setReceivedRequests([]);
        setSentRequests([]);
      }
    };

    loadInitialData();

    // Socket event handlers
    const handleFriendRequestUpdate = (data: any) => {
      if (data.type === 'newRequest') {
        setReceivedRequests(prev => [...prev, data.sender]);
      }
    };

    const handleFriendRequestWithdrawn = (data: { senderEmail: string }) => {
      setReceivedRequests(prev => 
        prev.filter(req => req.email !== data.senderEmail)
      );
    };

    const handleFriendRequestResponded = (data: { senderEmail: string }) => {
      setSentRequests(prev => 
        prev.filter(req => req.email !== data.senderEmail)
      );
    };

    // Subscribe to socket events
    socketService.on('friendRequestUpdate', handleFriendRequestUpdate);
    socketService.on('friendRequestWithdrawn', handleFriendRequestWithdrawn);
    socketService.on('friendRequestResponded', handleFriendRequestResponded);

    // Cleanup
    return () => {
      socketService.off('friendRequestUpdate', handleFriendRequestUpdate);
      socketService.off('friendRequestWithdrawn', handleFriendRequestWithdrawn);
      socketService.off('friendRequestResponded', handleFriendRequestResponded);
    };
  }, []);

  // Handle respond to request
  const handleRespondToRequest = async (senderEmail: string, accept: boolean) => {
    // Optimistic update
    setReceivedRequests(prev => prev.filter(req => req.email !== senderEmail));
    
    try {
      const response = await respondToFriendRequest(senderEmail, accept);
      if (response.success) {
        Alert.alert('Thành công', accept ? 'Đã chấp nhận lời mời kết bạn' : 'Đã từ chối lời mời kết bạn');
        socketService.emit('friendRequestResponded', { senderEmail, accept });
      } else {
        // Rollback on failure
        const response = await getFriendRequests();
        if (response.success) {
          setReceivedRequests(response.data.received);
        }
        Alert.alert('Lỗi', 'Không thể xử lý lời mời kết bạn');
      }
    } catch (error) {
      // Rollback on error
      const response = await getFriendRequests();
      if (response.success) {
        setReceivedRequests(response.data.received);
      }
      Alert.alert('Lỗi', 'Không thể xử lý lời mời kết bạn');
    }
  };

  // Handle withdraw request
  const handleWithdrawRequest = async (receiverEmail: string) => {
    // Optimistic update
    setSentRequests(prev => prev.filter(req => req.email !== receiverEmail));

    try {
      const response = await withdrawFriendRequest(receiverEmail);
      if (response.success) {
        socketService.emit('friendRequestWithdrawn', { receiverEmail });
      } else {
        // Rollback on failure
        const response = await getFriendRequests();
        if (response.success) {
          setSentRequests(response.data.sent);
        }
      }
    } catch (error) {
      // Rollback on error
      const response = await getFriendRequests();
      if (response.success) {
        setSentRequests(response.data.sent);
      }
    }
  };

  const renderReceivedRequest = (request: FriendRequest) => (
    <View key={request.email} style={styles.requestItem}>
      <Avatar
        rounded
        source={{ uri: request.avatar }}
        size={50}
      />
      <View style={styles.requestInfo}>
        <Text style={styles.requestName}>{request.fullName}</Text>
        <Text style={styles.requestTime}>Muốn kết bạn</Text>
      </View>
      <View style={styles.requestActions}>
        <TouchableOpacity 
          style={[styles.requestButton, styles.rejectButton]}
          onPress={() => handleRespondToRequest(request.email, false)}
        >
          <Text style={styles.rejectButtonText}>TỪ CHỐI</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.requestButton, styles.acceptButton]}
          onPress={() => handleRespondToRequest(request.email, true)}
        >
          <Text style={styles.acceptButtonText}>ĐỒNG Ý</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderSentRequest = (request: FriendRequest) => (
    <View key={request.email} style={styles.requestItem}>
      <Avatar
        rounded
        source={{ uri: request.avatar }}
        size={50}
      />
      <View style={styles.requestInfo}>
        <Text style={styles.requestName}>{request.fullName}</Text>
        <Text style={styles.requestTime}>Đã gửi lời mời kết bạn</Text>
      </View>
      <TouchableOpacity 
        style={styles.withdrawButton}
        onPress={() => handleWithdrawRequest(request.email)}
      >
        <Text style={styles.withdrawButtonText}>THU HỒI</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }} edges={['top', 'bottom', 'left', 'right']}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#0068ff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Lời mời kết bạn</Text>
      </View>
      <Tab
        value={index}
        onChange={setIndex}
        indicatorStyle={{ backgroundColor: '#0068ff', height: 3 }}
        containerStyle={{ backgroundColor: 'white' }}
      >
        <Tab.Item
          title={`Đã nhận ${receivedRequests.length}`}
          titleStyle={(active) => ({ color: active ? '#0068ff' : '#666', fontSize: 16 })}
        />
        <Tab.Item
          title={`Đã gửi ${sentRequests.length}`}
          titleStyle={(active) => ({ color: active ? '#0068ff' : '#666', fontSize: 16 })}
        />
      </Tab>

      <TabView value={index} onChange={setIndex} animationType="spring">
        <TabView.Item style={styles.tabContent}>
          <ScrollView>
            {receivedRequests.length > 0 ? (
              receivedRequests.map(renderReceivedRequest)
            ) : (
              <Text style={styles.emptyText}>Không có lời mời kết bạn nào</Text>
            )}
          </ScrollView>
        </TabView.Item>

        <TabView.Item style={styles.tabContent}>
          <ScrollView>
            {sentRequests.length > 0 ? (
              sentRequests.map(renderSentRequest)
            ) : (
              <Text style={styles.emptyText}>Chưa gửi lời mời kết bạn nào</Text>
            )}
          </ScrollView>
        </TabView.Item>
      </TabView>
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
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginLeft: 16,
  },
  tabContent: {
    width: '100%',
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
  emptyText: {
    textAlign: 'center',
    color: '#666',
    fontSize: 16,
    marginTop: 20,
  }
});

export default FriendRequestsScreen; 
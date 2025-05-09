import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator
} from 'react-native';
import { Avatar, CheckBox } from '@rneui/themed';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';
import { createGroup, getFriends, uploadFile } from '../services/api';
import type { Friend } from '../services/api';
import { socketService } from '../services/socket';

interface Group {
  groupId: string;
  name: string;
  avatar?: string;
  members: string[];
  createdAt: string;
}

const CreateGroupScreen = () => {
  const navigation = useNavigation();
  const [groupName, setGroupName] = useState('');
  const [groupAvatar, setGroupAvatar] = useState<string | null>(null);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [selectedFriends, setSelectedFriends] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadFriends();
  }, []);

  const loadFriends = async () => {
    try {
      const response = await getFriends();
      if (response.success) {
        setFriends(response.data);
      }
    } catch (error) {
      console.error('Error loading friends:', error);
      Alert.alert('Lỗi', 'Không thể tải danh sách bạn bè');
    }
  };

  const handlePickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
      });

      if (!result.canceled && result.assets[0].uri) {
        setGroupAvatar(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể chọn ảnh');
    }
  };

  const handleCreateGroup = async () => {
    if (selectedFriends.size < 2) {
      Alert.alert('Lỗi', 'Vui lòng chọn ít nhất 2 thành viên khác');
      return;
    }

    if (!groupName.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập tên nhóm');
      return;
    }

    try {
      setIsLoading(true);
      let avatarUrl = null;

      // Upload avatar if selected
      if (groupAvatar) {
        const formData = new FormData();
        formData.append('file', {
          uri: groupAvatar,
          type: 'image/jpeg',
          name: 'group-avatar.jpg'
        } as any);

        const uploadResponse = await uploadFile(formData);
        if (uploadResponse.success) {
          avatarUrl = uploadResponse.data.url;
        }
      }

      // Create group with avatar
      const response = await createGroup(
        groupName,
        undefined,
        Array.from(selectedFriends),
        avatarUrl
      );

      if (response.success) {
        // Emit socket event for new group
        socketService.emit('createGroup', {
          name: groupName,
          members: Array.from(selectedFriends)
        });
        // Navigate back to contacts screen
        navigation.navigate('Contacts' as never);
      } else {
        Alert.alert('Lỗi', 'Không thể tạo nhóm');
      }
    } catch (error: any) {
      console.error('Error creating group:', error);
      Alert.alert('Lỗi', error.message || 'Không thể kết nối đến server');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleFriendSelection = (email: string) => {
    const newSelection = new Set(selectedFriends);
    if (newSelection.has(email)) {
      newSelection.delete(email);
    } else {
      newSelection.add(email);
    }
    setSelectedFriends(newSelection);
  };

  const filteredFriends = friends.filter(friend =>
    friend.fullName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Tạo nhóm mới</Text>
        <TouchableOpacity 
          onPress={handleCreateGroup}
          disabled={isLoading}
        >
          <Text style={styles.createButton}>Tạo</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* Group Info Section */}
        <View style={styles.groupInfoSection}>
          <TouchableOpacity style={styles.avatarContainer} onPress={handlePickImage}>
            {groupAvatar ? (
              <Image source={{ uri: groupAvatar }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Ionicons name="camera" size={32} color="#666" />
              </View>
            )}
          </TouchableOpacity>
          <TextInput
            style={styles.groupNameInput}
            placeholder="Nhập tên nhóm"
            value={groupName}
            onChangeText={setGroupName}
            maxLength={50}
          />
        </View>

        {/* Members Section */}
        <View style={styles.membersSection}>
          <Text style={styles.sectionTitle}>Thêm thành viên</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm kiếm bạn bè"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />

          {/* Selected Members Count */}
          <Text style={styles.selectedCount}>
            Đã chọn: {selectedFriends.size} thành viên
          </Text>

          {/* Friends List */}
          {filteredFriends.map((friend) => (
            <TouchableOpacity
              key={friend.email}
              style={styles.friendItem}
              onPress={() => toggleFriendSelection(friend.email)}
            >
              <Avatar
                rounded
                source={{ uri: friend.avatar }}
                size={40}
              />
              <Text style={styles.friendName}>{friend.fullName}</Text>
              <CheckBox
                checked={selectedFriends.has(friend.email)}
                onPress={() => toggleFriendSelection(friend.email)}
                checkedColor="#0068ff"
              />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#0068ff" />
        </View>
      )}
    </View>
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
    justifyContent: 'space-between',
    backgroundColor: '#0068ff',
    padding: 16,
    paddingTop: 40,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  createButton: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
  groupInfoSection: {
    backgroundColor: '#fff',
    padding: 16,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  avatarContainer: {
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  groupNameInput: {
    width: '100%',
    fontSize: 16,
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  membersSection: {
    backgroundColor: '#fff',
    marginTop: 16,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  searchInput: {
    backgroundColor: '#f5f5f5',
    padding: 8,
    borderRadius: 8,
    marginBottom: 16,
  },
  selectedCount: {
    color: '#666',
    marginBottom: 16,
  },
  friendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  friendName: {
    flex: 1,
    marginLeft: 16,
    fontSize: 16,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default CreateGroupScreen; 
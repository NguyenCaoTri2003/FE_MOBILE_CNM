import React, { useEffect, useState } from 'react';
import { View, StyleSheet, SafeAreaView, TouchableOpacity, Text, ScrollView, Alert, Image, Modal, TextInput, ActivityIndicator } from 'react-native';
import { Avatar } from '@rneui/themed';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { deleteGroup, getGroup, getGroupMembers, leaveGroup, updateGroupInfo } from '../services/api';
import { socketService } from '../services/socket';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { API_BASE_URL } from '@env';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

type RouteParams = {
  groupId: string;
  groupName: string;
  avatar: string;
};

type Member = {
  email: string;
  fullName: string;
  avatar: string;
  role: 'admin' | 'member';
};

const GroupInfoScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute();
  const { groupId, groupName: initialGroupName, avatar: initialAvatar } = route.params as RouteParams;
  const [members, setMembers] = useState<Member[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [showNameModal, setShowNameModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState(initialGroupName);
  const [groupAvatar, setGroupAvatar] = useState(initialAvatar);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    fetchGroupMembers();
    setupSocketListeners();
  }, []);

  const fetchGroupMembers = async () => {
    try {
      const response = await getGroupMembers(groupId);
      setMembers(response.data.members);
      // Check if current user is admin
      const currentUserEmail = await AsyncStorage.getItem('userEmail');
      console.log('Raw current user email from AsyncStorage:', currentUserEmail);
      console.log('Type of currentUserEmail:', typeof currentUserEmail);
      console.log('Group members:', response.data.members);
      
      const isUserAdmin = response.data.members.some((m: Member) => {
        console.log('Checking member:', m.email, 'Role:', m.role);
        console.log('Normalized member email:', m.email?.trim().toLowerCase());
        console.log('Normalized current email:', currentUserEmail?.trim().toLowerCase());
        // Normalize emails by trimming and converting to lowercase
        const normalizedMemberEmail = m.email?.trim().toLowerCase();
        const normalizedCurrentEmail = currentUserEmail?.trim().toLowerCase();
        const isMatch = m.role === 'admin' && normalizedMemberEmail === normalizedCurrentEmail;
        console.log('Is match:', isMatch);
        return isMatch;
      });
      
      console.log('Is user admin:', isUserAdmin);
      setIsAdmin(isUserAdmin);
    } catch (error: any) {
      console.error('Error fetching members:', error);
      Alert.alert('Lỗi', error.message || 'Không thể lấy danh sách thành viên');
    }
  };

  const setupSocketListeners = () => {
    socketService.on('memberLeft', (data: { groupId: string, userId: string }) => {
      if (data.groupId === groupId) {
        fetchGroupMembers(); // Refresh members list
      }
    });

    return () => {
      socketService.off('memberLeft', () => {});
    };
  };

  const handleDeleteGroup = async () => {
    try {
      await deleteGroup(groupId);
      navigation.navigate('Messages');
    } catch (error: any) {
      Alert.alert('Lỗi', error.message || 'Không thể xóa nhóm');
    }
  };

  const handleLeaveGroup = async () => {
    try {
      await leaveGroup(groupId);
      navigation.navigate('Messages');
    } catch (error: any) {
      Alert.alert('Lỗi', error.message || 'Không thể rời nhóm');
    }
  };

  const handleChangeGroupName = async () => {
    if (!newGroupName.trim()) {
      Alert.alert('Lỗi', 'Tên nhóm không được để trống');
      return;
    }

    try {
      const response = await updateGroupInfo(groupId, { name: newGroupName.trim() });
      if (response.success) {
        setShowNameModal(false);
        // Emit socket event for name change
        socketService.emit('groupNameChanged', {
          groupId,
          newName: newGroupName.trim()
        });
        // Update the group name in the UI
        navigation.setParams({ groupName: newGroupName.trim() });
      } else {
        Alert.alert('Lỗi', 'Không thể đổi tên nhóm');
      }
    } catch (error: any) {
      console.error('Error updating group name:', error);
      Alert.alert('Lỗi', error.message || 'Không thể đổi tên nhóm');
    }
  };

  const handlePickImage = async () => {
    if (!isAdmin) {
      Alert.alert('Thông báo', 'Chỉ quản trị viên mới có quyền thay đổi ảnh đại diện nhóm');
      return;
    }

    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Thông báo', 'Cần cấp quyền truy cập thư viện ảnh để thay đổi ảnh đại diện');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selectedImage = result.assets[0];
        await handleUploadAvatar(selectedImage);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Lỗi', 'Không thể chọn ảnh');
    }
  };

  const handleUploadAvatar = async (imageAsset: any) => {
    try {
      setIsUploading(true);
      
      const formData = new FormData();
      formData.append('file', {
        uri: imageAsset.uri,
        type: 'image/jpeg',
        name: 'avatar.jpg',
      } as any);

      const response = await updateGroupInfo(groupId, {
        name: newGroupName,
        avatar: {
          uri: imageAsset.uri,
          type: 'image/jpeg',
          name: 'avatar.jpg'
        }
      });

      if (response.success && response.data && response.data.avatar) {
        const newAvatar = response.data.avatar;
        setGroupAvatar(newAvatar);
        // Emit socket event for avatar change
        socketService.emit('groupAvatarChanged', {
          groupId,
          newAvatar
        });
        // Update navigation params
        navigation.setParams({ 
          avatar: newAvatar,
          group: {
            ...route.params,
            avatar: newAvatar
          }
        });
      } else {
        throw new Error('Không thể cập nhật ảnh đại diện');
      }
    } catch (error: any) {
      console.error('Error uploading avatar:', error);
      Alert.alert('Lỗi', error.message || 'Không thể tải lên ảnh đại diện');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Thông tin nhóm</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView style={styles.content}>
        {/* Group Info Section */}
        <View style={styles.groupInfoSection}>
          <View style={styles.groupAvatarContainer}>
            <Avatar
              rounded
              source={{ uri: groupAvatar || 'https://randomuser.me/api/portraits/men/1.jpg' }}
              size={100}
            />
            {isAdmin && (
              <TouchableOpacity 
                style={styles.changeAvatarButton}
                onPress={handlePickImage}
                disabled={isUploading}
              >
                {isUploading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Ionicons name="camera" size={24} color="#fff" />
                )}
              </TouchableOpacity>
            )}
          </View>
          <View style={styles.groupNameContainer}>
            <View style={styles.groupNameWrapper}>
              <Text style={styles.groupName}>{initialGroupName}</Text>
              {isAdmin && (
                <TouchableOpacity 
                  style={styles.editButton}
                  onPress={() => setShowNameModal(true)}
                >
                  <Ionicons name="pencil" size={20} color="#666" />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Members Section Header */}
          <TouchableOpacity 
            style={styles.membersHeader}
            onPress={() => setShowMembers(!showMembers)}
          >
            <Text style={styles.membersHeaderText}>Thành viên ({members.length})</Text>
            <Ionicons 
              name={showMembers ? "chevron-up" : "chevron-down"} 
              size={24} 
              color="#666" 
            />
          </TouchableOpacity>

          {/* Members List */}
          {showMembers && (
            <View style={styles.membersList}>
              {members.map((member, index) => (
                <View key={index} style={styles.memberItem}>
                  <Avatar
                    rounded
                    source={{ uri: member.avatar || 'https://randomuser.me/api/portraits/men/1.jpg' }}
                    size={50}
                  />
                  <View style={styles.memberInfo}>
                    <Text style={styles.memberName}>{member.fullName}</Text>
                    <View style={styles.roleContainer}>
                      <View style={[
                        styles.roleBadge,
                        member.role === 'admin' ? styles.adminBadge : styles.memberBadge
                      ]}>
                        <Text style={styles.roleText}>
                          {member.role === 'admin' ? 'Quản trị viên' : 'Thành viên'}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Options Section */}
        <View style={styles.optionsSection}>
          {!isAdmin ? (
            <TouchableOpacity 
              style={[styles.settingItem, styles.dangerItem]}
              onPress={() => {
                Alert.alert(
                  'Rời nhóm',
                  'Bạn có chắc chắn muốn rời nhóm này?',
                  [
                    {
                      text: 'Hủy',
                      style: 'cancel'
                    },
                    {
                      text: 'Rời nhóm',
                      style: 'destructive',
                      onPress: handleLeaveGroup
                    }
                  ]
                );
              }}
            >
              <Ionicons name="exit-outline" size={24} color="#ff3b30" />
              <Text style={[styles.settingText, styles.dangerText]}>Rời nhóm</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity 
              style={[styles.settingItem, styles.dangerItem]}
              onPress={() => {
                Alert.alert(
                  'Xóa nhóm',
                  'Bạn có chắc chắn muốn xóa nhóm này?',
                  [
                    {
                      text: 'Hủy',
                      style: 'cancel'
                    },
                    {
                      text: 'Xóa',
                      style: 'destructive',
                      onPress: handleDeleteGroup
                    }
                  ]
                );
              }}
            >
              <Ionicons name="trash-outline" size={24} color="#ff3b30" />
              <Text style={[styles.settingText, styles.dangerText]}>Xóa nhóm</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {/* Change Name Modal */}
      <Modal
        visible={showNameModal}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setShowNameModal(false);
          setNewGroupName(initialGroupName);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Đổi tên nhóm</Text>
            <TextInput
              style={styles.modalInput}
              value={newGroupName}
              onChangeText={setNewGroupName}
              placeholder="Nhập tên nhóm mới"
              placeholderTextColor="#999"
              autoFocus
              maxLength={50}
              returnKeyType="done"
              onSubmitEditing={handleChangeGroupName}
            />
            <Text style={styles.charCount}>{newGroupName.length}/50</Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowNameModal(false);
                  setNewGroupName(initialGroupName);
                }}
              >
                <Text style={styles.cancelButtonText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, styles.saveButton, !newGroupName.trim() && styles.disabledButton]}
                onPress={handleChangeGroupName}
                disabled={!newGroupName.trim()}
              >
                <Text style={[styles.saveButtonText, !newGroupName.trim() && styles.disabledButtonText]}>Lưu</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerRight: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  groupInfoSection: {
    alignItems: 'center',
    paddingVertical: 30,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  groupAvatarContainer: {
    position: 'relative',
    marginBottom: 20,
  },
  changeAvatarButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#0068ff',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  groupNameContainer: {
    alignItems: 'center',
  },
  groupNameWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  groupName: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  editIcon: {
    marginLeft: 8,
  },
  membersHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    width: '100%',
  },
  membersHeaderText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  membersList: {
    width: '100%',
    paddingHorizontal: 15,
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    paddingHorizontal: 5,
  },
  memberInfo: {
    marginLeft: 15,
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  roleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginRight: 8,
  },
  adminBadge: {
    backgroundColor: '#0068ff',
  },
  memberBadge: {
    backgroundColor: '#666',
  },
  roleText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
  optionsSection: {
    marginTop: 20,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  settingText: {
    marginLeft: 15,
    fontSize: 16,
  },
  dangerItem: {
    marginTop: 20,
  },
  dangerText: {
    color: '#ff3b30',
  },
  editButton: {
    marginLeft: 8,
    padding: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    width: '80%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    padding: 10,
    marginBottom: 5,
    fontSize: 16,
  },
  charCount: {
    textAlign: 'right',
    color: '#999',
    fontSize: 12,
    marginBottom: 15,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    padding: 10,
    borderRadius: 5,
    flex: 1,
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: '#f2f2f2',
  },
  saveButton: {
    backgroundColor: '#0068ff',
  },
  cancelButtonText: {
    color: '#333',
    textAlign: 'center',
  },
  saveButtonText: {
    color: 'white',
    textAlign: 'center',
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  disabledButtonText: {
    color: '#666',
  },
});

export default GroupInfoScreen; 
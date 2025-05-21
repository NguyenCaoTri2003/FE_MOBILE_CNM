import React, { useEffect, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, ScrollView, Alert, Image, Modal, TextInput, ActivityIndicator } from 'react-native';
import { Avatar } from '@rneui/themed';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { deleteGroup, getGroup, getGroupMembers, leaveGroup, updateGroupInfo, updateMemberRole } from '../services/api';
import { socketService } from '../services/socket';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { API_BASE_URL } from '@env';
import { jwtDecode } from 'jwt-decode';
import { removeGroupMember } from '../services/api';
import { GroupMember } from '../services/api';  // Import type from api
import { SafeAreaView } from 'react-native-safe-area-context';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

type RouteParams = {
  groupId: string;
  groupName: string;
  avatar: string;
};

type Group = {
  groupId: string;
  name: string;
  description?: string;
  avatar?: string;
  members: string[];
  admins: string[];
  createdAt: string;
  updatedAt: string;
};

// Update GroupMember type to include deputy role
type ExtendedGroupMember = GroupMember & {
  role: 'admin' | 'deputy' | 'member';
};

const GroupInfoScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute();
  const { groupId, groupName: initialGroupName, avatar: initialAvatar } = route.params as RouteParams;
  const [members, setMembers] = useState<ExtendedGroupMember[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [showNameModal, setShowNameModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState(initialGroupName);
  const [groupAvatar, setGroupAvatar] = useState(initialAvatar);
  const [isUploading, setIsUploading] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showMemberActionModal, setShowMemberActionModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<ExtendedGroupMember | null>(null);

  const handleNameChange = (data: { groupId: string, newName: string }) => {
    if (data.groupId === groupId) {
      setNewGroupName(data.newName);
      navigation.setParams({ groupName: data.newName });
    }
  };

  const handleAvatarChange = (data: { groupId: string, newAvatar: string }) => {
    if (data.groupId === groupId) {
      setGroupAvatar(data.newAvatar);
      navigation.setParams({ avatar: data.newAvatar });
    }
  };

  const handleMembersUpdate = async (data: { groupId: string, newMembers: any[] }) => {
    if (data.groupId === groupId) {
      setMembers(data.newMembers);
      const token = await AsyncStorage.getItem('token');
      if (token) {
        const decoded = jwtDecode<{ email: string }>(token);
        const currentMember = data.newMembers.find((m: ExtendedGroupMember) => m.email === decoded.email);
        if (currentMember) {
          setIsAdmin(currentMember.role === 'admin');
        }
      }
    }
  };

  useEffect(() => {
    fetchGroupMembers();
    setupSocketListeners();
    return () => {
      // Cleanup socket listeners
      socketService.off('groupNameChanged', handleNameChange);
      socketService.off('groupAvatarChanged', handleAvatarChange);
      socketService.off('groupMembersUpdated', handleMembersUpdate);
    };
  }, []);

  const setupSocketListeners = () => {
    socketService.on('groupNameChanged', handleNameChange);
    socketService.on('groupAvatarChanged', handleAvatarChange);
    socketService.on('groupMembersUpdated', handleMembersUpdate);
  };

  const fetchGroupMembers = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await getGroupMembers(groupId);
      setMembers(response.data.members);
      
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        setIsAdmin(false);
        return;
      }

      const decoded = jwtDecode<{ email: string }>(token);
      const currentMember = response.data.members.find((m: ExtendedGroupMember) => m.email === decoded.email);
      
      if (currentMember) {
        setIsAdmin(currentMember.role === 'admin');
      } else {
        setIsAdmin(false);
      }
    } catch (error: any) {
      setError(error.message || 'Không thể lấy danh sách thành viên');
      Alert.alert('Lỗi', error.message || 'Không thể lấy danh sách thành viên');
    } finally {
      setIsLoading(false);
    }
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

  const handleTransferAdmin = async (memberEmail: string) => {
    try {
      const response = await updateMemberRole(groupId, memberEmail, 'admin');
      if (response.success) {
        await fetchGroupMembers();
        Alert.alert('Thành công', 'Đã chuyển quyền trưởng nhóm. Bạn sẽ không còn là trưởng nhóm nữa.');
        // Tự động chuyển về màn hình Messages sau khi chuyển quyền
        navigation.navigate('Messages');
      } else {
        Alert.alert('Lỗi', response.message || 'Không thể chuyển quyền trưởng nhóm');
      }
    } catch (error: any) {
      console.error('Error transferring admin:', error);
      Alert.alert('Lỗi', error.message || 'Không thể chuyển quyền trưởng nhóm');
    }
  };

  const handleTransferDeputy = async (memberEmail: string) => {
    try {
      const response = await updateMemberRole(groupId, memberEmail, 'deputy');
      if (response.success) {
        await fetchGroupMembers();
        Alert.alert('Thành công', 'Đã chuyển quyền phó trưởng nhóm');
      } else {
        Alert.alert('Lỗi', response.message || 'Không thể chuyển quyền phó trưởng nhóm');
      }
    } catch (error: any) {
      console.error('Error transferring deputy:', error);
      Alert.alert('Lỗi', error.message || 'Không thể chuyển quyền phó trưởng nhóm');
    }
  };

  const handleRemoveDeputy = async (memberEmail: string) => {
    try {
      const response = await updateMemberRole(groupId, memberEmail, 'member');
      if (response.success) {
        await fetchGroupMembers();
        Alert.alert('Thành công', 'Đã thu hồi quyền phó trưởng nhóm');
      } else {
        Alert.alert('Lỗi', response.message || 'Không thể thu hồi quyền phó trưởng nhóm');
      }
    } catch (error: any) {
      console.error('Error removing deputy:', error);
      Alert.alert('Lỗi', error.message || 'Không thể thu hồi quyền phó trưởng nhóm');
    }
  };

  const handleMemberPress = (member: ExtendedGroupMember) => {
    setSelectedMember(member);
    setShowMemberActionModal(true);
  };

  const handleBlockMember = async (memberEmail: string) => {
    try {
      // TODO: Implement block member functionality
      Alert.alert('Thông báo', 'Chức năng chặn thành viên đang được phát triển');
      setShowMemberActionModal(false);
    } catch (error: any) {
      Alert.alert('Lỗi', error.message || 'Không thể chặn thành viên');
    }
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0068ff" />
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={fetchGroupMembers}
          >
            <Text style={styles.retryButtonText}>Thử lại</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <>
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

          {showMembers && (
            <View style={styles.membersList}>
              {members
                .sort((a, b) => {
                  // Sắp xếp theo thứ tự: admin -> deputy -> member
                  const roleOrder = { admin: 0, deputy: 1, member: 2 };
                  return roleOrder[a.role] - roleOrder[b.role];
                })
                .map((member, index) => (
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
                        member.role === 'admin' ? styles.adminBadge : 
                        member.role === 'deputy' ? styles.deputyBadge : 
                        styles.memberBadge
                      ]}>
                        <Text style={styles.roleText}>
                          {member.role === 'admin' ? 'Trưởng nhóm' : 
                           member.role === 'deputy' ? 'Phó trưởng nhóm' : 
                           'Thành viên'}
                        </Text>
                      </View>
                    </View>
                  </View>
                  {isAdmin && member.role !== 'admin' && (
                    <View style={styles.memberActions}>
                      <TouchableOpacity
                        onPress={() => handleMemberPress(member)}
                      >
                        <Ionicons name="ellipsis-horizontal" size={24} color="#666" />
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={styles.optionsSection}>
          {isAdmin && (
            <TouchableOpacity 
              style={styles.settingItem}
              onPress={() => setShowTransferModal(true)}
            >
              <Ionicons name="shield-checkmark" size={24} color="#0068ff" />
              <Text style={[styles.settingText, { color: '#0068ff' }]}>Chuyển quyền trưởng nhóm</Text>
            </TouchableOpacity>
          )}
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
                  'Giải tán nhóm',
                  'Bạn có chắc chắn muốn giải tán nhóm này?',
                  [
                    {
                      text: 'Hủy',
                      style: 'cancel'
                    },
                    {
                      text: 'Giải tán',
                      style: 'destructive',
                      onPress: handleDeleteGroup
                    }
                  ]
                );
              }}
            >
              <Ionicons name="trash-outline" size={24} color="#ff3b30" />
              <Text style={[styles.settingText, styles.dangerText]}>Giải tán nhóm</Text>
            </TouchableOpacity>
          )}
        </View>
      </>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }} edges={['top', 'bottom', 'left', 'right']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Thông tin nhóm</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView style={styles.content}>
        {renderContent()}
      </ScrollView>

      {/* Transfer Admin Modal */}
      <Modal
        visible={showTransferModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowTransferModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Chọn thành viên để chuyển quyền trưởng nhóm</Text>
            <ScrollView style={styles.memberSelectionList}>
              {members
                .filter(member => member.role !== 'admin')
                .map((member, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.memberSelectionItem}
                    onPress={() => {
                      setShowTransferModal(false);
                      Alert.alert(
                        'Xác nhận',
                        `Bạn có chắc chắn muốn chuyển quyền trưởng nhóm cho ${member.fullName}?`,
                        [
                          { text: 'Hủy', style: 'cancel' },
                          {
                            text: 'Chuyển quyền',
                            style: 'default',
                            onPress: () => handleTransferAdmin(member.email)
                          }
                        ]
                      );
                    }}
                  >
                    <Avatar
                      rounded
                      source={{ uri: member.avatar || 'https://randomuser.me/api/portraits/men/1.jpg' }}
                      size={40}
                    />
                    <Text style={styles.memberSelectionName}>{member.fullName}</Text>
                  </TouchableOpacity>
                ))}
            </ScrollView>
            <TouchableOpacity 
              style={[styles.modalButton, styles.cancelButton]}
              onPress={() => setShowTransferModal(false)}
            >
              <Text style={styles.cancelButtonText}>Đóng</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

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

      {/* Member Action Modal */}
      <Modal
        visible={showMemberActionModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowMemberActionModal(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowMemberActionModal(false)}
        >
          <View style={styles.memberActionModalContent}>
            <View style={styles.memberActionHeader}>
              <Avatar
                rounded
                source={{ uri: selectedMember?.avatar || 'https://randomuser.me/api/portraits/men/1.jpg' }}
                size={50}
              />
              <Text style={styles.memberActionName}>{selectedMember?.fullName}</Text>
            </View>
            
            {isAdmin && selectedMember?.role !== 'admin' && (
              <>
                {selectedMember?.role !== 'deputy' ? (
                  <TouchableOpacity
                    style={styles.memberActionItem}
                    onPress={() => {
                      setShowMemberActionModal(false);
                      Alert.alert(
                        'Xác nhận',
                        `Bổ nhiệm ${selectedMember?.fullName} làm phó trưởng nhóm?`,
                        [
                          { text: 'Hủy', style: 'cancel' },
                          {
                            text: 'Bổ nhiệm',
                            style: 'default',
                            onPress: () => handleTransferDeputy(selectedMember?.email || '')
                          }
                        ]
                      );
                    }}
                  >
                    <Ionicons name="shield" size={24} color="#0068ff" />
                    <Text style={[styles.memberActionText, { color: '#0068ff' }]}>Bổ nhiệm làm phó trưởng nhóm</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={styles.memberActionItem}
                    onPress={() => {
                      setShowMemberActionModal(false);
                      Alert.alert(
                        'Xác nhận',
                        `Thu hồi quyền phó trưởng nhóm của ${selectedMember?.fullName}?`,
                        [
                          { text: 'Hủy', style: 'cancel' },
                          {
                            text: 'Thu hồi',
                            style: 'destructive',
                            onPress: () => handleRemoveDeputy(selectedMember?.email || '')
                          }
                        ]
                      );
                    }}
                  >
                    <Ionicons name="shield-outline" size={24} color="#ff9500" />
                    <Text style={[styles.memberActionText, { color: '#ff9500' }]}>Thu hồi quyền phó trưởng nhóm</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={styles.memberActionItem}
                  onPress={() => {
                    setShowMemberActionModal(false);
                    Alert.alert(
                      'Xác nhận',
                      `Xóa ${selectedMember?.fullName} khỏi nhóm?`,
                      [
                        { text: 'Hủy', style: 'cancel' },
                        {
                          text: 'Xóa',
                          style: 'destructive',
                          onPress: async () => {
                            try {
                              const response = await removeGroupMember(groupId, selectedMember?.email || '');
                              if (response.success) {
                                setMembers(prev => prev.filter(m => m.email !== selectedMember?.email));
                                Alert.alert('Thành công', 'Đã xóa thành viên khỏi nhóm');
                              } else {
                                Alert.alert('Lỗi', response.message || 'Không thể xóa thành viên');
                              }
                            } catch (error: any) {
                              Alert.alert('Lỗi', error.message || 'Không thể xóa thành viên');
                            }
                          }
                        }
                      ]
                    );
                  }}
                >
                  <Ionicons name="person-remove" size={24} color="#ff3b30" />
                  <Text style={[styles.memberActionText, { color: '#ff3b30' }]}>Xóa khỏi nhóm</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.memberActionItem}
                  onPress={() => handleBlockMember(selectedMember?.email || '')}
                >
                  <Ionicons name="ban" size={24} color="#ff3b30" />
                  <Text style={[styles.memberActionText, { color: '#ff3b30' }]}>Chặn thành viên</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </TouchableOpacity>
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
  memberSelectionList: {
    maxHeight: 300,
    marginVertical: 10,
  },
  memberSelectionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  memberSelectionName: {
    marginLeft: 10,
    fontSize: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: '#ff3b30',
    textAlign: 'center',
    marginBottom: 10,
  },
  retryButton: {
    backgroundColor: '#0068ff',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 5,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
  },
  memberActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  deputyBadge: {
    backgroundColor: '#ff9500',
  },
  memberActionModalContent: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    width: '90%',
    maxWidth: 400,
  },
  memberActionHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  memberActionName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 10,
  },
  memberActionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  memberActionText: {
    marginLeft: 15,
    fontSize: 16,
  },
});

export default GroupInfoScreen; 
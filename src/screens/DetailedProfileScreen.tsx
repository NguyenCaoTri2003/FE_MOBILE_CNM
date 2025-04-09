import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  StatusBar,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Text, Avatar, Button } from '@rneui/themed';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { Ionicons } from '@expo/vector-icons';
import { getProfile, updateProfile, uploadAvatar } from '../services/api';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface UserProfile {
  fullName: string;
  avatar: string;
  email: string;
  gender: string;
  phoneNumber: string;
  address: string;
}

const DetailedProfileScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const [isEditing, setIsEditing] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedGender, setSelectedGender] = useState('male');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchUserProfile();
    requestMediaLibraryPermission();
  }, []);

  const fetchUserProfile = async () => {
    try {
      const response = await getProfile();
      if (response.success && response.user) {
        setUserProfile(response.user);
        setSelectedGender(response.user.gender || 'male');
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      Alert.alert('Lỗi', 'Không thể tải thông tin người dùng');
    } finally {
      setLoading(false);
    }
  };

  const requestMediaLibraryPermission = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Cảnh báo', 'Cần cấp quyền truy cập thư viện ảnh để thay đổi ảnh đại diện');
    }
  };

  const handleSave = async () => {
    try {
      const updateData = {
        ...userProfile,
        gender: selectedGender
      };
      const response = await updateProfile(updateData);
      if (response.success) {
        Alert.alert('Thành công', 'Cập nhật thông tin thành công');
        setIsEditing(false);
      } else {
        Alert.alert('Lỗi', response.message || 'Cập nhật thất bại');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Lỗi', 'Không thể cập nhật thông tin');
    }
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
        base64: false,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        await uploadNewAvatar(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Lỗi', 'Không thể chọn ảnh');
    }
  };

  const uploadNewAvatar = async (uri: string) => {
    try {
      setUploading(true);
      
      const response = await uploadAvatar(uri);
      if (response.success) {
        setUserProfile(prev => prev ? { ...prev, avatar: response.avatarUrl } : null);
        Alert.alert('Thành công', 'Cập nhật ảnh đại diện thành công');
      } else {
        Alert.alert('Lỗi', response.message || 'Cập nhật ảnh đại diện thất bại');
      }
    } catch (error: any) {
      console.error('Error uploading avatar:', error);
      let errorMessage = 'Không thể tải lên ảnh đại diện';
      
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

  const renderField = (label: string, value: string, field: keyof UserProfile) => {
    return (
      <View style={styles.fieldContainer}>
        <Text style={styles.label}>{label}</Text>
        {isEditing ? (
          <TextInput
            style={styles.input}
            value={value}
            onChangeText={(text) => setUserProfile({ ...userProfile!, [field]: text })}
          />
        ) : (
          <Text style={styles.value}>{value || 'Chưa cập nhật'}</Text>
        )}
      </View>
    );
  };

  const renderGenderSelection = () => {
    if (!isEditing) {
      return <Text style={styles.value}>{selectedGender === 'male' ? 'Nam' : 'Nữ'}</Text>;
    }

    return (
      <View style={styles.genderContainer}>
        <TouchableOpacity
          style={styles.genderOption}
          onPress={() => setSelectedGender('male')}
        >
          <View style={[
            styles.radioButton,
            selectedGender === 'male' && styles.radioButtonSelected
          ]}>
            {selectedGender === 'male' && <View style={styles.radioButtonInner} />}
          </View>
          <Text style={styles.genderLabel}>Nam</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.genderOption}
          onPress={() => setSelectedGender('female')}
        >
          <View style={[
            styles.radioButton,
            selectedGender === 'female' && styles.radioButtonSelected
          ]}>
            {selectedGender === 'female' && <View style={styles.radioButtonInner} />}
          </View>
          <Text style={styles.genderLabel}>Nữ</Text>
        </TouchableOpacity>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0068ff" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#0068ff" barStyle="light-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Trang cá nhân</Text>
        <TouchableOpacity onPress={() => setIsEditing(!isEditing)}>
          <Text style={styles.editButton}>
            {isEditing ? 'Hủy' : 'Chỉnh sửa'}
          </Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView style={styles.scrollContainer}>
          <View style={styles.profileSection}>
            <View style={styles.avatarContainer}>
              <Avatar
                rounded
                source={{ uri: userProfile?.avatar || 'https://randomuser.me/api/portraits/men/20.jpg' }}
                size={100}
              />
              {isEditing && (
                <TouchableOpacity 
                  style={styles.changeAvatarButton}
                  onPress={pickImage}
                  disabled={uploading}
                >
                  {uploading ? (
                    <ActivityIndicator color="#0068ff" />
                  ) : (
                    <Ionicons name="camera" size={24} color="#0068ff" />
                  )}
                </TouchableOpacity>
              )}
            </View>

            {renderField('Họ và tên', userProfile?.fullName || '', 'fullName')}
            {renderField('Email', userProfile?.email || '', 'email')}
            
            {/* Gender Selection */}
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>Giới tính</Text>
              {renderGenderSelection()}
            </View>

            {renderField('Số điện thoại', userProfile?.phoneNumber || '', 'phoneNumber')}
            {renderField('Địa chỉ', userProfile?.address || '', 'address')}

            {isEditing && (
              <Button
                title="Lưu thay đổi"
                onPress={handleSave}
                buttonStyle={styles.saveButton}
                titleStyle={styles.saveButtonText}
              />
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    backgroundColor: '#0068ff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  editButton: {
    color: '#fff',
    fontSize: 16,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContainer: {
    flex: 1,
  },
  profileSection: {
    padding: 16,
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  changeAvatarButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 8,
    borderWidth: 2,
    borderColor: '#0068ff',
  },
  fieldContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  value: {
    fontSize: 16,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  saveButton: {
    backgroundColor: '#0068ff',
    borderRadius: 8,
    paddingVertical: 12,
    marginTop: 24,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  genderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  genderOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  radioButton: {
    height: 24,
    width: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#0068ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  radioButtonSelected: {
    borderColor: '#0068ff',
  },
  radioButtonInner: {
    height: 12,
    width: 12,
    borderRadius: 6,
    backgroundColor: '#0068ff',
  },
  genderLabel: {
    fontSize: 16,
    color: '#333',
  },
});

export default DetailedProfileScreen;
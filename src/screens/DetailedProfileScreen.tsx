import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StatusBar,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ImageBackground
} from 'react-native';
import { Text, Avatar, Button } from '@rneui/themed';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { Ionicons } from '@expo/vector-icons';
import { getProfile, updateProfile, uploadAvatar } from '../services/api';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { LinearGradient, LinearGradientProps } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface UserProfile {
  fullName: string;
  avatar: string;
  email: string;
  gender: string;
  phoneNumber: string;
  address: string;
}

const LinearGradientView: React.FC<LinearGradientProps> = (props) => (
  <LinearGradient {...props} />
);

const DetailedProfileScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const [isEditing, setIsEditing] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedGender, setSelectedGender] = useState<string>('male');
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
        if (response.user.gender) {
          setSelectedGender(response.user.gender);
        }
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      Alert.alert('Lỗi', 'Không thể tải thông tin người dùng');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isEditing && userProfile) {
      setSelectedGender(userProfile.gender || 'male');
    }
  }, [isEditing]);

  const requestMediaLibraryPermission = async () => {
    const { status: mediaStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
    
    if (mediaStatus !== 'granted') {
      Alert.alert('Cảnh báo', 'Cần cấp quyền truy cập thư viện ảnh để thay đổi ảnh đại diện');
    }
    if (cameraStatus !== 'granted') {
      Alert.alert('Cảnh báo', 'Cần cấp quyền truy cập camera để chụp ảnh đại diện');
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
        setUserProfile(prev => prev ? { ...prev, gender: selectedGender } : null);
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
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: false,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const fileInfo = await FileSystem.getInfoAsync(result.assets[0].uri);
        
        if (!fileInfo.exists) {
          Alert.alert('Lỗi', 'Không thể truy cập file ảnh');
          return;
        }

        // Kiểm tra kích thước file (tối đa 5MB)
        if (fileInfo.size && fileInfo.size > 5 * 1024 * 1024) {
          Alert.alert('Lỗi', 'Kích thước ảnh quá lớn. Vui lòng chọn ảnh nhỏ hơn 5MB');
          return;
        }

        await uploadNewAvatar(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Lỗi', 'Không thể chọn ảnh');
    }
  };

  const handleTakePhoto = async () => {
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const fileInfo = await FileSystem.getInfoAsync(result.assets[0].uri);
        if (fileInfo.exists) {
          await uploadNewAvatar(result.assets[0].uri);
        } else {
          Alert.alert('Lỗi', 'Không thể truy cập file ảnh');
        }
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Lỗi', 'Không thể chụp ảnh');
    }
  };

  const uploadNewAvatar = async (uri: string) => {
    try {
      setUploading(true);
      
      // Lấy thông tin file
      const fileInfo = await FileSystem.getInfoAsync(uri);
      if (!fileInfo.exists) {
        throw new Error('Không thể truy cập file ảnh');
      }

      // Đọc file dưới dạng base64
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64
      });

      // Tạo form data
      const formData = new FormData();
      formData.append('avatar', {
        uri: Platform.OS === 'android' ? uri : uri.replace('file://', ''),
        type: 'image/jpeg',
        name: 'avatar.jpg',
        data: base64
      } as any);

      console.log('Uploading avatar with formData:', formData);

      const response = await uploadAvatar(formData);
      console.log('Upload response:', response);

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
    if (field === 'email') {
      return (
        <View style={styles.fieldContainer}>
          <Text style={styles.label}>{label}</Text>
          <View style={styles.emailContainer}>
            <Text style={styles.value} numberOfLines={1} ellipsizeMode="tail">
              {value || 'Chưa cập nhật'}
            </Text>
            <Ionicons name="lock-closed" size={16} color="#999" style={styles.lockIcon} />
          </View>
        </View>
      );
    }

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
    const currentGender = userProfile?.gender || selectedGender;
    
    if (!isEditing) {
      return <Text style={styles.value}>{currentGender === 'male' ? 'Nam' : 'Nữ'}</Text>;
    }

    return (
      <View style={styles.genderContainer}>
        <TouchableOpacity
          style={styles.genderOption}
          onPress={() => {
            setSelectedGender('male');
            setUserProfile(prev => prev ? { ...prev, gender: 'male' } : null);
          }}
        >
          <View style={[
            styles.radioButton,
            currentGender === 'male' && styles.radioButtonSelected
          ]}>
            {currentGender === 'male' && <View style={styles.radioButtonInner} />}
          </View>
          <Text style={styles.genderLabel}>Nam</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.genderOption}
          onPress={() => {
            setSelectedGender('female');
            setUserProfile(prev => prev ? { ...prev, gender: 'female' } : null);
          }}
        >
          <View style={[
            styles.radioButton,
            currentGender === 'female' && styles.radioButtonSelected
          ]}>
            {currentGender === 'female' && <View style={styles.radioButtonInner} />}
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
      
      {/* Header with Gradient Background */}
      <LinearGradient
        colors={['#0068ff', '#00a8ff']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.header}
      >
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Trang cá nhân</Text>
        <TouchableOpacity 
          onPress={() => setIsEditing(!isEditing)}
          style={styles.editButtonContainer}
        >
          <Text style={styles.editButton}>
            {isEditing ? 'Hủy' : 'Chỉnh sửa'}
          </Text>
        </TouchableOpacity>
      </LinearGradient>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView style={styles.scrollContainer}>
          <View style={styles.profileSection}>
            {/* Profile Card with Background Image */}
            <ImageBackground
              source={{ uri: 'https://res.cloudinary.com/ds4v3awds/image/upload/v1733805276/samples/coffee.jpg' }}
              style={styles.profileCard}
              imageStyle={styles.backgroundImage}
            >
              <View style={styles.overlayGradient}>
                <View style={styles.avatarContainer}>
                  <Avatar
                    rounded
                    source={{ uri: userProfile?.avatar || 'https://randomuser.me/api/portraits/men/20.jpg' }}
                    size={120}
                    containerStyle={styles.avatar}
                  />
                  {isEditing && (
                    <View style={styles.avatarButtons}>
                      <TouchableOpacity 
                        key="camera"
                        style={[styles.avatarButton, styles.cameraButton]}
                        onPress={handleTakePhoto}
                      >
                        <Ionicons name="camera" size={20} color="#fff" />
                      </TouchableOpacity>
                      <TouchableOpacity 
                        key="gallery"
                        style={[styles.avatarButton, styles.galleryButton]}
                        onPress={pickImage}
                      >
                        <Ionicons name="images" size={20} color="#fff" />
                      </TouchableOpacity>
                    </View>
                  )}
                </View>

                <View style={styles.nameContainer}>
                  <Text style={styles.profileName}>
                    {userProfile?.fullName || 'Đang tải...'}
                  </Text>
                  <View style={styles.genderIconContainer}>
                    <Ionicons 
                      name={userProfile?.gender === 'male' ? 'male' : 'female'} 
                      size={24} 
                      color={userProfile?.gender === 'male' ? '#0068ff' : '#ff4d94'} 
                    />
                  </View>
                </View>
                <Text style={[styles.profileEmail, { marginTop: -4 }]}>{userProfile?.email || ''}</Text>
              </View>
            </ImageBackground>

            {/* Info Section */}
            <View style={styles.infoSection}>
              <View style={styles.sectionHeader}>
                <Ionicons name="person-circle-outline" size={24} color="#0068ff" />
                <Text style={styles.sectionTitle}>Thông tin cá nhân</Text>
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
                <>
                  <Button
                    title="Lưu thay đổi"
                    onPress={handleSave}
                    buttonStyle={styles.saveButton}
                    titleStyle={styles.saveButtonText}
                    ViewComponent={LinearGradientView as any}
                    linearGradientProps={{
                      colors: ['#0068ff', '#00a8ff'],
                      start: { x: 0, y: 0 },
                      end: { x: 1, y: 0 },
                    }}
                  />
                </>
              )}
            </View>
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
  header: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  editButtonContainer: {
    padding: 8,
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
  profileCard: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 20,
    height: 200,
  },
  backgroundImage: {
    resizeMode: 'cover',
  },
  overlayGradient: {
    backgroundColor: 'rgba(0,0,0,0.4)',
    flex: 1,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
    width: 120,
    height: 120,
  },
  avatar: {
    borderWidth: 4,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  avatarButtons: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    flexDirection: 'row',
    gap: 8,
  },
  avatarButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },
  cameraButton: {
    backgroundColor: '#0068ff',
  },
  galleryButton: {
    backgroundColor: '#4CAF50',
  },
  profileName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  profileEmail: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  infoSection: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 8,
  },
  fieldContainer: {
    marginBottom: 20,
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 12,
  },
  label: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  value: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
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
  saveButton: {
    borderRadius: 12,
    paddingVertical: 12,
    marginTop: 24,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emailContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingRight: 8,
  },
  lockIcon: {
    marginLeft: 8,
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  genderIconContainer: {
    marginLeft: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
    padding: 2,
  },
});

export default DetailedProfileScreen;
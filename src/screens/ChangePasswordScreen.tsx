import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { MaterialIcons } from '@expo/vector-icons';
import { changePassword } from '../services/api';
import { RootStackParamList } from '../types/navigation';

type NavigationProp = StackNavigationProp<RootStackParamList>;

const ChangePasswordScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentPasswordError, setCurrentPasswordError] = useState('');
  const [newPasswordError, setNewPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');

  const handleChangePassword = async () => {
    // Reset errors
    setCurrentPasswordError('');
    setNewPasswordError('');
    setConfirmPasswordError('');

    // Validate current password
    if (!currentPassword) {
      setCurrentPasswordError('Vui lòng nhập mật khẩu hiện tại');
      return;
    }

    // Validate new password
    if (!newPassword) {
      setNewPasswordError('Vui lòng nhập mật khẩu mới');
      return;
    }

    if (newPassword.length < 6) {
      setNewPasswordError('Mật khẩu phải có ít nhất 6 ký tự');
      return;
    }

    // Validate confirm password
    if (!confirmPassword) {
      setConfirmPasswordError('Vui lòng xác nhận mật khẩu mới');
      return;
    }

    if (newPassword !== confirmPassword) {
      setConfirmPasswordError('Mật khẩu xác nhận không khớp');
      return;
    }

    try {
      setLoading(true);
      const response = await changePassword(currentPassword, newPassword);
      
      if (response.success) {
        Alert.alert(
          'Thành công',
          'Mật khẩu đã được thay đổi thành công',
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack()
            }
          ]
        );
      }
    } catch (error: any) {
      console.log('Change password error:', error);
      
      if (error.error === 'INVALID_PASSWORD') {
        setCurrentPasswordError('Mật khẩu hiện tại không chính xác');
      } else if (error.message) {
        Alert.alert('Lỗi', error.message);
      } else {
        Alert.alert('Lỗi', 'Không thể thay đổi mật khẩu. Vui lòng thử lại sau!');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <MaterialIcons name="arrow-back" size={24} color="#0068ff" />
        </TouchableOpacity>
        <Text style={styles.title}>Đổi mật khẩu</Text>
      </View>

      <View style={styles.form}>
        {(currentPasswordError || newPasswordError || confirmPasswordError) && (
          <View style={styles.errorContainer}>
            {currentPasswordError && <Text style={styles.errorText}>{currentPasswordError}</Text>}
            {newPasswordError && <Text style={styles.errorText}>{newPasswordError}</Text>}
            {confirmPasswordError && <Text style={styles.errorText}>{confirmPasswordError}</Text>}
          </View>
        )}

        <View style={styles.inputContainer}>
          <MaterialIcons name="lock" size={24} color="#0068ff" style={styles.icon} />
          <TextInput
            style={styles.input}
            placeholder="Mật khẩu hiện tại"
            value={currentPassword}
            onChangeText={setCurrentPassword}
            secureTextEntry
          />
        </View>

        <View style={styles.inputContainer}>
          <MaterialIcons name="lock" size={24} color="#0068ff" style={styles.icon} />
          <TextInput
            style={styles.input}
            placeholder="Mật khẩu mới"
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry
          />
        </View>

        <View style={styles.inputContainer}>
          <MaterialIcons name="lock" size={24} color="#0068ff" style={styles.icon} />
          <TextInput
            style={styles.input}
            placeholder="Xác nhận mật khẩu mới"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
          />
        </View>

        <TouchableOpacity
          style={styles.button}
          onPress={handleChangePassword}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Đổi mật khẩu</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 30,
  },
  backButton: {
    marginRight: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0068ff',
  },
  form: {
    marginTop: 20,
  },
  errorContainer: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#fff2f0',
    borderWidth: 1,
    borderColor: '#ffccc7',
    borderRadius: 4,
  },
  errorText: {
    color: '#ff4d4f',
    fontSize: 14,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d9d9d9',
    borderRadius: 4,
    marginBottom: 16,
    paddingHorizontal: 12,
  },
  icon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    height: 40,
    fontSize: 16,
  },
  button: {
    backgroundColor: '#0068ff',
    height: 40,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
});

export default ChangePasswordScreen; 
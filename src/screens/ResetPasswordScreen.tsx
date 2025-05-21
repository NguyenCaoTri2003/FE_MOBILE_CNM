import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute, RouteProp as NativeRouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { MaterialIcons } from '@expo/vector-icons';
import { resetPassword } from '../services/api';
import { RootStackParamList } from '../types/navigation';
import { SafeAreaView } from 'react-native-safe-area-context';

type NavigationProp = StackNavigationProp<RootStackParamList>;
type ResetPasswordRouteProp = NativeRouteProp<RootStackParamList, 'ResetPassword'>;

const ResetPasswordScreen = () => {
  const route = useRoute<ResetPasswordRouteProp>();
  const navigation = useNavigation<NavigationProp>();
  const { email } = route.params;
  const codeInputRef = useRef<TextInput>(null);

  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [codeError, setCodeError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');

  const resetCodeInput = () => {
    setCode('');
    if (codeInputRef.current) {
      codeInputRef.current.clear();
    }
  };

  const handleResetPassword = async () => {
    // Reset errors
    setCodeError('');
    setPasswordError('');
    setConfirmPasswordError('');

    // Validate code
    if (!code) {
      Alert.alert('Lỗi', 'Vui lòng nhập mã xác nhận');
      return;
    }

    // Validate password
    if (!password) {
      Alert.alert('Lỗi', 'Vui lòng nhập mật khẩu mới');
      return;
    }

    if (password.length < 6) {
      setPasswordError('Mật khẩu phải có ít nhất 6 ký tự');
      return;
    }

    // Validate confirm password
    if (!confirmPassword) {
      Alert.alert('Lỗi', 'Vui lòng xác nhận mật khẩu');
      return;
    }

    if (password !== confirmPassword) {
      setConfirmPasswordError('Mật khẩu xác nhận không khớp');
      return;
    }

    try {
      setLoading(true);
      const response = await resetPassword(email, code, password);
      
      if (response.success) {
        Alert.alert(
          'Thành công',
          'Mật khẩu đã được đặt lại thành công',
          [
            {
              text: 'OK',
              onPress: () => navigation.navigate('Login')
            }
          ]
        );
      }
    } catch (error: any) {
      console.log('Reset password error:', error);
      
      // Hiển thị thông báo lỗi từ server
      if (error.message) {
        Alert.alert('Lỗi', error.message);
      } else {
        Alert.alert('Lỗi', 'Không thể đặt lại mật khẩu. Vui lòng thử lại sau!');
      }

      // Xử lý các trường hợp lỗi cụ thể
      if (error.error === 'INVALID_CODE' || error.error === 'CODE_EXPIRED') {
        resetCodeInput();
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }} edges={['top', 'bottom', 'left', 'right']}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Zalo</Text>
          <Text style={styles.subtitle}>Đặt lại mật khẩu</Text>
        </View>

        <View style={styles.form}>
          {(codeError || passwordError || confirmPasswordError) && (
            <View style={styles.errorContainer}>
              {codeError && <Text style={styles.errorText}>{codeError}</Text>}
              {passwordError && <Text style={styles.errorText}>{passwordError}</Text>}
              {confirmPasswordError && <Text style={styles.errorText}>{confirmPasswordError}</Text>}
            </View>
          )}

          <View style={styles.inputContainer}>
            <MaterialIcons name="email" size={24} color="#0068ff" style={styles.icon} />
            <TextInput
              style={styles.input}
              placeholder="Email"
              value={email}
              editable={false}
            />
          </View>

          <View style={styles.inputContainer}>
            <MaterialIcons name="vpn-key" size={24} color="#0068ff" style={styles.icon} />
            <TextInput
              ref={codeInputRef}
              style={styles.input}
              placeholder="Mã xác nhận"
              value={code}
              onChangeText={setCode}
              keyboardType="number-pad"
              maxLength={6}
            />
          </View>

          <View style={styles.inputContainer}>
            <MaterialIcons name="lock" size={24} color="#0068ff" style={styles.icon} />
            <TextInput
              style={styles.input}
              placeholder="Mật khẩu mới"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>

          <View style={styles.inputContainer}>
            <MaterialIcons name="lock" size={24} color="#0068ff" style={styles.icon} />
            <TextInput
              style={styles.input}
              placeholder="Xác nhận mật khẩu"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
            />
          </View>

          <TouchableOpacity
            style={styles.button}
            onPress={handleResetPassword}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Đặt lại mật khẩu</Text>
            )}
          </TouchableOpacity>

          <View style={styles.footer}>
            <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')}>
              <Text style={styles.footerText}>Gửi lại mã xác nhận</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.footerText}>Quay lại đăng nhập</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 30,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#0068ff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(0, 0, 0, 0.45)',
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
  footer: {
    marginTop: 16,
    alignItems: 'center',
  },
  footerText: {
    color: '#0068ff',
    fontSize: 14,
    marginTop: 8,
  },
});

export default ResetPasswordScreen; 
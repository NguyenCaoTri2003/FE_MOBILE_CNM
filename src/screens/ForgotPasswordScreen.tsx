import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { MaterialIcons } from '@expo/vector-icons';
import { Input, Button } from '@rneui/themed';
import { forgotPassword } from '../services/api';
import Captcha from '../components/Captcha';
import { RootStackParamList } from '../types/navigation';
import { SafeAreaView } from 'react-native-safe-area-context';

type NavigationProp = StackNavigationProp<RootStackParamList>;

const ForgotPasswordScreen = () => {
  const [email, setEmail] = useState('');
  const [captcha, setCaptcha] = useState('');
  const [captchaCode, setCaptchaCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [captchaError, setCaptchaError] = useState('');
  const navigation = useNavigation<NavigationProp>();

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleForgotPassword = async () => {
    // Reset errors
    setEmailError('');
    setCaptchaError('');

    // Validate email
    if (!email) {
      Alert.alert('Lỗi', 'Vui lòng nhập email');
      return;
    }

    if (!validateEmail(email)) {
      setEmailError('Email không hợp lệ');
      return;
    }

    // Validate captcha
    if (!captcha) {
      Alert.alert('Lỗi', 'Vui lòng nhập mã xác nhận');
      return;
    }

    if (captcha.toLowerCase() !== captchaCode.toLowerCase()) {
      setCaptchaError('Mã xác nhận không chính xác');
      setCaptcha('');
      setCaptchaCode('');
      return;
    }

    try {
      setLoading(true);
      const response = await forgotPassword(email);
      
      if (response.success) {
        Alert.alert(
          'Thành công',
          'Mã xác nhận đã được gửi đến email của bạn',
          [
            {
              text: 'OK',
              onPress: () => navigation.navigate('ResetPassword', { email })
            }
          ]
        );
      }
    } catch (error: any) {
      if (error.response?.data?.error === 'EMAIL_NOT_FOUND') {
        setEmailError('Email không tồn tại trong hệ thống');
      } else {
        Alert.alert('Lỗi', 'Không thể gửi mã xác nhận. Vui lòng thử lại sau!');
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
          <Text style={styles.subtitle}>Khôi phục mật khẩu</Text>
        </View>

        <View style={styles.form}>
          {(emailError || captchaError) && (
            <View style={styles.errorContainer}>
              {emailError && <Text style={styles.errorText}>{emailError}</Text>}
              {captchaError && <Text style={styles.errorText}>{captchaError}</Text>}
            </View>
          )}

          <Input
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            leftIcon={<MaterialIcons name="email" size={24} color="#595959" />}
            containerStyle={styles.inputContainer}
            inputStyle={styles.input}
            errorMessage={emailError}
            errorStyle={styles.errorText}
            autoFocus={true}
            selectionColor="#0068ff"
            caretHidden={false}
            placeholderTextColor="#999"
            cursorColor="#0068ff"
          />

          <Captcha
            value={captcha}
            onChange={setCaptcha}
            onCaptchaChange={setCaptchaCode}
          />

          <Button
            title="Gửi mã xác nhận"
            onPress={handleForgotPassword}
            loading={loading}
            containerStyle={styles.buttonContainer}
            buttonStyle={styles.button}
            titleStyle={styles.buttonText}
          />

          <View style={styles.footer}>
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
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
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
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
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
    margin: 0,
    marginBottom: 16,
  },
  inputContainer: {
    marginBottom: 16,
  },
  input: {
    fontSize: 16,
    color: '#333',
    height: 40,
    paddingVertical: 0,
  },
  buttonContainer: {
    marginTop: 24,
    marginBottom: 16,
  },
  button: {
    backgroundColor: '#0068ff',
    borderRadius: 4,
    height: 48,
  },
  buttonText: {
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
  },
});

export default ForgotPasswordScreen; 
import React, { useState, useRef } from 'react';
import { View, StyleSheet, Alert, ScrollView, ImageBackground, TouchableOpacity } from 'react-native';
import { Input, Button, Text } from '@rneui/themed';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { register } from '../services/api';
import { RootStackParamList } from '../navigation/AppNavigator';
import Captcha from '../components/Captcha';
import { MaterialIcons } from '@expo/vector-icons';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface RegisterResponse {
  message: string;
  success: boolean;
}

const RegisterScreen = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [captcha, setCaptcha] = useState('');
  const [captchaCode, setCaptchaCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  const [captchaError, setCaptchaError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const navigation = useNavigation<NavigationProp>();

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePassword = (password: string) => {
    return password.length >= 6;
  };

  const validatePhone = (phone: string) => {
    // Chấp nhận số điện thoại 9 chữ số, bắt đầu bằng 3, 5, 7, 8, 9
    const phoneRegex = /^[3|5|7|8|9][0-9]{8}$/;
    return phoneRegex.test(phone);
  };

  const formatPhoneNumber = (phone: string) => {
    // Thêm mã quốc gia +84 cho số điện thoại
    return `+84${phone}`;
  };

  const handleRegister = async () => {
    // Reset errors
    setEmailError('');
    setPasswordError('');
    setConfirmPasswordError('');
    setCaptchaError('');

    // Validate all fields
    if (!name || !email || !password || !confirmPassword || !phone || !captcha) {
      Alert.alert('Lỗi', 'Vui lòng điền đầy đủ thông tin');
      return;
    }

    // Validate name
    if (name.length < 2) {
      Alert.alert('Lỗi', 'Họ tên phải có ít nhất 2 ký tự');
      return;
    }

    // Validate email
    if (!validateEmail(email)) {
      setEmailError('Email không hợp lệ');
      return;
    }

    // Validate password
    if (!validatePassword(password)) {
      setPasswordError('Mật khẩu phải có ít nhất 6 ký tự');
      return;
    }

    // Validate phone
    if (!validatePhone(phone)) {
      Alert.alert('Lỗi', 'Vui lòng nhập 9 chữ số (không bao gồm số 0 đầu)');
      return;
    }

    // Validate password match
    if (password !== confirmPassword) {
      setConfirmPasswordError('Mật khẩu xác nhận không khớp');
      return;
    }

    // Validate captcha
    if (captcha.toLowerCase() !== captchaCode.toLowerCase()) {
      setCaptchaError('Mã xác nhận không chính xác');
      // Tạo captcha mới khi người dùng nhập sai
      setCaptcha(''); // Xóa input captcha cũ
      setCaptchaCode(''); // Reset captcha code để component tự tạo mới
      return;
    }

    try {
      setLoading(true);
      const formattedPhone = formatPhoneNumber(phone);
      const response = await register(email, password, name, formattedPhone) as RegisterResponse;
      Alert.alert('Thành công', 'Đăng ký thành công! Vui lòng đăng nhập.', [
        {
          text: 'OK',
          onPress: () => navigation.navigate('Login'),
        },
      ]);
    } catch (error: any) {
      if (error.error === 'EMAIL_EXISTS') {
        setEmailError('Email đã được sử dụng');
      } else if (error.error === 'PASSWORD_TOO_SHORT') {
        setPasswordError('Mật khẩu phải có ít nhất 6 ký tự');
      } else {
        Alert.alert('Lỗi', error.message || 'Đăng ký thất bại. Vui lòng thử lại.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <ImageBackground
      source={{ uri: 'https://res.cloudinary.com/ds4v3awds/image/upload/v1743940527/p8t4hgpjuthf19sbin88.png' }}
      style={styles.background}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text h3 style={styles.title}>Zalo</Text>
            <Text style={styles.subtitle}>
              Đăng ký tài khoản Zalo{'\n'}
              để kết nối với ứng dụng Zalo Mobile
            </Text>
          </View>

          <View style={styles.form}>
            <Input
              placeholder="Họ và tên"
              value={name}
              onChangeText={setName}
              leftIcon={<MaterialIcons name="person" size={24} color="#595959" />}
              containerStyle={styles.inputContainer}
              inputStyle={styles.input}
              errorStyle={styles.errorText}
            />

            <Input
              placeholder="Email"
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                setEmailError('');
              }}
              autoCapitalize="none"
              keyboardType="email-address"
              leftIcon={<MaterialIcons name="email" size={24} color="#595959" />}
              containerStyle={styles.inputContainer}
              inputStyle={styles.input}
              errorMessage={emailError}
              errorStyle={styles.errorText}
            />

            <Input
              placeholder="Số điện thoại"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              leftIcon={<MaterialIcons name="phone" size={24} color="#595959" />}
              containerStyle={styles.inputContainer}
              inputStyle={styles.input}
              errorStyle={styles.errorText}
            />

            <Input
              placeholder="Mật khẩu"
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                setPasswordError('');
              }}
              secureTextEntry={!showPassword}
              leftIcon={<MaterialIcons name="lock" size={24} color="#595959" />}
              rightIcon={
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                  <MaterialIcons 
                    name={showPassword ? "visibility" : "visibility-off"} 
                    size={24} 
                    color="#595959" 
                  />
                </TouchableOpacity>
              }
              containerStyle={styles.inputContainer}
              inputStyle={styles.input}
              errorMessage={passwordError}
              errorStyle={styles.errorText}
            />

            <Input
              placeholder="Xác nhận mật khẩu"
              value={confirmPassword}
              onChangeText={(text) => {
                setConfirmPassword(text);
                setConfirmPasswordError('');
              }}
              secureTextEntry={!showConfirmPassword}
              leftIcon={<MaterialIcons name="lock" size={24} color="#595959" />}
              rightIcon={
                <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                  <MaterialIcons 
                    name={showConfirmPassword ? "visibility" : "visibility-off"} 
                    size={24} 
                    color="#595959" 
                  />
                </TouchableOpacity>
              }
              containerStyle={styles.inputContainer}
              inputStyle={styles.input}
              errorMessage={confirmPasswordError}
              errorStyle={styles.errorText}
            />

            <Captcha
              value={captcha}
              onChange={(text) => {
                setCaptcha(text);
                setCaptchaError('');
              }}
              onCaptchaChange={(newCaptcha) => setCaptchaCode(newCaptcha)}
            />
            {captchaError ? <Text style={styles.errorText}>{captchaError}</Text> : null}

            <Button
              title="Đăng ký"
              onPress={handleRegister}
              loading={loading}
              containerStyle={styles.buttonContainer}
              buttonStyle={styles.button}
              titleStyle={styles.buttonText}
            />

            <Button
              title="Đã có tài khoản? Đăng nhập"
              type="clear"
              onPress={() => navigation.navigate('Login')}
              titleStyle={styles.linkText}
            />
          </View>
        </View>
      </ScrollView>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  background: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    color: '#0068ff',
    marginBottom: 8,
  },
  subtitle: {
    color: '#666',
    fontSize: 16,
    textAlign: 'center',
  },
  form: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
  },
  inputContainer: {
    marginBottom: 16,
  },
  input: {
    fontSize: 16,
    color: '#333',
  },
  errorText: {
    margin: 0,
    fontSize: 14,
    color: '#ff4d4f',
    marginBottom: 16,
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
  linkText: {
    color: '#0068ff',
    fontSize: 14,
  },
});

export default RegisterScreen; 
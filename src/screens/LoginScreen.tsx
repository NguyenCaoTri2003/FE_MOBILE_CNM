import React, { useState, useRef } from 'react';
import { View, StyleSheet, Alert, ScrollView, ImageBackground, TouchableOpacity } from 'react-native';
import { Input, Button, Text } from '@rneui/themed';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { login } from '../services/api';
import { RootStackParamList } from '../navigation/AppNavigator';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Captcha from '../components/Captcha';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface LoginResponse {
  message: string;
  success: boolean;
  token: string;
}

const LoginScreen = () => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [captcha, setCaptcha] = useState('');
  const [captchaCode, setCaptchaCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [identifierError, setIdentifierError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [captchaError, setCaptchaError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const navigation = useNavigation<NavigationProp>();

  const handleLogin = async () => {
    // Reset errors
    setIdentifierError('');
    setPasswordError('');
    setCaptchaError('');

    if (!identifier || !password || !captcha) {
      Alert.alert('Lỗi', 'Vui lòng điền đầy đủ thông tin');
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
      
      // Gọi API đăng nhập thật từ backend
      const response = await login(identifier, password) as LoginResponse;
      
      // Nếu đăng nhập thành công
      if (response.success) {
        // Lưu token
        await AsyncStorage.setItem('token', response.token);
        
        // Chuyển tới màn hình tin nhắn
        navigation.reset({
          index: 0,
          routes: [{ name: 'Messages' }],
        });
      } else {
        // Xử lý lỗi từ API
        Alert.alert('Lỗi', response.message || 'Đăng nhập thất bại');
      }
    } catch (error: any) {
      // Xử lý các loại lỗi cụ thể
      if (error.error === 'EMAIL_NOT_FOUND' || error.error === 'PHONE_NOT_FOUND') {
        setIdentifierError('Tài khoản không tồn tại trong hệ thống');
      } else if (error.error === 'INVALID_PASSWORD') {
        setPasswordError('Mật khẩu không chính xác');
      } else {
        Alert.alert('Lỗi', error.message || 'Đã xảy ra lỗi khi đăng nhập. Vui lòng thử lại sau.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }} edges={['top', 'bottom', 'left', 'right']}>
      <ImageBackground
        source={{ uri: 'https://uploads3cnm.s3.us-east-1.amazonaws.com/background.png' }}
        style={styles.background}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <View style={styles.container}>
            <View style={styles.header}>
              <Text h3 style={styles.title}>Zalo</Text>
              <Text style={styles.subtitle}>
                Đăng nhập tài khoản Zalo{'\n'}
                để kết nối với ứng dụng Zalo Mobile
              </Text>
            </View>

            <View style={styles.form}>
              <Input
                placeholder="Email hoặc số điện thoại"
                value={identifier}
                onChangeText={(text) => {
                  setIdentifier(text);
                  setIdentifierError('');
                }}
                autoCapitalize="none"
                keyboardType="email-address"
                leftIcon={<MaterialIcons name="person" size={24} color="#595959" />}
                containerStyle={styles.inputContainer}
                inputStyle={[styles.input, { color: '#000' }]}
                errorMessage={identifierError}
                errorStyle={styles.errorText}
                autoFocus={true}
                selectionColor="#0068ff"
                caretHidden={false}
                placeholderTextColor="#999"
                cursorColor="#0068ff"
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
                inputStyle={[styles.input, { color: '#000' }]}
                errorMessage={passwordError}
                errorStyle={styles.errorText}
                selectionColor="#0068ff"
                caretHidden={false}
                placeholderTextColor="#999"
                cursorColor="#0068ff"
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
                title="Đăng nhập"
                onPress={handleLogin}
                loading={loading}
                containerStyle={styles.buttonContainer}
                buttonStyle={styles.button}
                titleStyle={styles.buttonText}
              />

              <View style={styles.footer}>
                <Button
                  title="Quên mật khẩu?"
                  type="clear"
                  onPress={() => navigation.navigate('ForgotPassword')}
                  titleStyle={styles.linkText}
                />
                <Button
                  title="Đăng ký tài khoản mới"
                  type="clear"
                  onPress={() => navigation.navigate('Register')}
                  titleStyle={styles.linkText}
                />
              </View>
            </View>
          </View>
        </ScrollView>
      </ImageBackground>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  background: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    justifyContent: 'center',
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
    height: 40,
    paddingVertical: 0,
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
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  linkText: {
    color: '#0068ff',
    fontSize: 14,
  },
});

export default LoginScreen; 
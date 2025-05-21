import React, { useState, useRef } from 'react';
import { View, StyleSheet, Alert, ScrollView, ImageBackground, TouchableOpacity } from 'react-native';
import { Input, Button, Text } from '@rneui/themed';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { registerSendVerification, registerVerify } from '../services/api';
import { RootStackParamList } from '../navigation/AppNavigator';
import Captcha from '../components/Captcha';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const RegisterScreen = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [captcha, setCaptcha] = useState('');
  const [captchaCode, setCaptchaCode] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  const [captchaError, setCaptchaError] = useState('');
  const [verificationError, setVerificationError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [phoneError, setPhoneError] = useState('');
  const navigation = useNavigation<NavigationProp>();

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePhone = (phone: string) => {
    // Chấp nhận số điện thoại 9 chữ số, bắt đầu bằng 3, 5, 7, 8, 9
    const phoneRegex = /^[3|5|7|8|9][0-9]{8}$/;
    if (!phoneRegex.test(phone)) {
      return { isValid: false, error: 'Số điện thoại phải có 9 chữ số và bắt đầu bằng 3, 5, 7, 8 hoặc 9' };
    }
    return { isValid: true, error: '' };
  };

  const validatePassword = (password: string) => {
    // Kiểm tra mật khẩu không được chứa khoảng trắng
    if (password.includes(' ')) {
      return { isValid: false, error: 'Mật khẩu không được chứa khoảng trắng' };
    }

    // Kiểm tra độ dài tối thiểu
    if (password.length < 8) {
      return { isValid: false, error: 'Mật khẩu phải có ít nhất 8 ký tự' };
    }

    // Kiểm tra chứa ít nhất 1 chữ hoa
    if (!/[A-Z]/.test(password)) {
      return { isValid: false, error: 'Mật khẩu phải chứa ít nhất 1 chữ hoa' };
    }

    // Kiểm tra chứa ít nhất 1 chữ thường
    if (!/[a-z]/.test(password)) {
      return { isValid: false, error: 'Mật khẩu phải chứa ít nhất 1 chữ thường' };
    }

    // Kiểm tra chứa ít nhất 1 số
    if (!/[0-9]/.test(password)) {
      return { isValid: false, error: 'Mật khẩu phải chứa ít nhất 1 số' };
    }

    // Kiểm tra chứa ít nhất 1 ký tự đặc biệt
    if (!/[@$!%*?&]/.test(password)) {
      return { isValid: false, error: 'Mật khẩu phải chứa ít nhất 1 ký tự đặc biệt (@$!%*?&)' };
    }

    return { isValid: true, error: '' };
  };

  const formatPhoneNumber = (phone: string) => {
    // Thêm mã quốc gia +84 cho số điện thoại
    return `+84${phone}`;
  };

  const handleStep1 = async () => {
    // Reset errors
    setEmailError('');
    setCaptchaError('');

    // Validate email
    if (!email) {
      setEmailError('Vui lòng nhập email');
      return;
    }

    if (!validateEmail(email)) {
      setEmailError('Email không hợp lệ');
      return;
    }

    // Validate captcha
    if (captcha.toLowerCase() !== captchaCode.toLowerCase()) {
      setCaptchaError('Mã xác nhận không chính xác');
      setCaptcha('');
      setCaptchaCode('');
      return;
    }

    try {
      setLoading(true);
      await registerSendVerification(email);
      Alert.alert('Thành công', 'Mã xác nhận đã được gửi đến email của bạn!');
      setCurrentStep(1);
    } catch (error: any) {
      if (error.error === 'EMAIL_EXISTS') {
        setEmailError('Email đã được sử dụng');
      } else {
        Alert.alert('Lỗi', error.message || 'Không thể gửi mã xác nhận. Vui lòng thử lại sau!');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleStep2 = async () => {
    // Reset errors
    setVerificationError('');
    setPasswordError('');
    setConfirmPasswordError('');
    setPhoneError('');

    // Validate all fields
    if (!name || !verificationCode || !password || !confirmPassword || !phone) {
      Alert.alert('Lỗi', 'Vui lòng điền đầy đủ thông tin');
      return;
    }

    // Validate name
    if (name.length < 2) {
      Alert.alert('Lỗi', 'Họ tên phải có ít nhất 2 ký tự');
      return;
    }

    // Validate phone
    const phoneValidation = validatePhone(phone);
    if (!phoneValidation.isValid) {
      setPhoneError(phoneValidation.error);
      return;
    }

    // Validate password
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      setPasswordError(passwordValidation.error);
      return;
    }

    // Validate password match
    if (password !== confirmPassword) {
      setConfirmPasswordError('Mật khẩu xác nhận không khớp');
      return;
    }

    try {
      setLoading(true);
      const formattedPhone = formatPhoneNumber(phone);
      await registerVerify(email, verificationCode, name, password, formattedPhone);
      Alert.alert('Thành công', 'Đăng ký thành công! Vui lòng đăng nhập.', [
        {
          text: 'OK',
          onPress: () => navigation.navigate('Login'),
        },
      ]);
    } catch (error: any) {
      if (error.error === 'INVALID_CODE') {
        setVerificationError('Mã xác nhận không chính xác');
      } else if (error.error === 'CODE_EXPIRED') {
        setVerificationError('Mã xác nhận đã hết hạn');
      } else if (error.error === 'PASSWORD_MISMATCH') {
        setConfirmPasswordError('Mật khẩu xác nhận không khớp');
      } else if (error.error === 'PASSWORD_CONTAINS_SPACE') {
        setPasswordError('Mật khẩu không được chứa khoảng trắng');
      } else if (error.error === 'PASSWORD_INVALID_FORMAT') {
        setPasswordError('Mật khẩu phải chứa ít nhất 1 chữ hoa, 1 chữ thường, 1 số và 1 ký tự đặc biệt');
      } else {
        Alert.alert('Lỗi', error.message || 'Đăng ký thất bại. Vui lòng thử lại sau.');
      }
    } finally {
      setLoading(false);
    }
  };

  const renderStep1 = () => (
    <View style={styles.form}>
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
        inputStyle={[styles.input, { color: '#000' }]}
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
        onChange={(text) => {
          setCaptcha(text);
          setCaptchaError('');
        }}
        onCaptchaChange={(newCaptcha) => setCaptchaCode(newCaptcha)}
      />
      {captchaError ? <Text style={styles.errorText}>{captchaError}</Text> : null}

      <Button
        title="Tiếp tục"
        onPress={handleStep1}
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
  );

  const renderStep2 = () => (
    <View style={styles.form}>
      <Input
        placeholder="Mã xác nhận (6 chữ số)"
        value={verificationCode}
        onChangeText={(text) => {
          setVerificationCode(text);
          setVerificationError('');
        }}
        keyboardType="numeric"
        maxLength={6}
        leftIcon={<MaterialIcons name="confirmation-number" size={24} color="#595959" />}
        containerStyle={styles.inputContainer}
        inputStyle={[styles.input, { color: '#000' }]}
        errorMessage={verificationError}
        errorStyle={styles.errorText}
        selectionColor="#0068ff"
        caretHidden={false}
        placeholderTextColor="#999"
        cursorColor="#0068ff"
      />

      <Input
        placeholder="Họ và tên"
        value={name}
        onChangeText={setName}
        leftIcon={<MaterialIcons name="person" size={24} color="#595959" />}
        containerStyle={styles.inputContainer}
        inputStyle={[styles.input, { color: '#000' }]}
        errorStyle={styles.errorText}
        selectionColor="#0068ff"
        caretHidden={false}
        placeholderTextColor="#999"
        cursorColor="#0068ff"
      />

      <Input
        placeholder="Số điện thoại"
        value={phone}
        onChangeText={(text) => {
          // Chỉ cho phép nhập số và giới hạn 9 ký tự
          const numericValue = text.replace(/[^0-9]/g, '').slice(0, 9);
          setPhone(numericValue);
          setPhoneError('');
        }}
        keyboardType="numeric"
        maxLength={9}
        leftIcon={<MaterialIcons name="phone" size={24} color="#595959" />}
        containerStyle={styles.inputContainer}
        inputStyle={[styles.input, { color: '#000' }]}
        errorMessage={phoneError}
        errorStyle={styles.errorText}
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
        inputStyle={[styles.input, { color: '#000' }]}
        errorMessage={confirmPasswordError}
        errorStyle={styles.errorText}
        selectionColor="#0068ff"
        caretHidden={false}
        placeholderTextColor="#999"
        cursorColor="#0068ff"
      />

      <Button
        title="Đăng ký"
        onPress={handleStep2}
        loading={loading}
        containerStyle={styles.buttonContainer}
        buttonStyle={styles.button}
        titleStyle={styles.buttonText}
      />
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }} edges={['top', 'bottom', 'left', 'right']}>
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

            {currentStep === 0 ? renderStep1() : renderStep2()}
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
  linkText: {
    color: '#0068ff',
    fontSize: 14,
  },
});

export default RegisterScreen; 
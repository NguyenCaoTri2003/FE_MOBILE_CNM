import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

interface CaptchaProps {
  value: string;
  onChange: (value: string) => void;
  onCaptchaChange: (captcha: string) => void;
}

const Captcha: React.FC<CaptchaProps> = ({ value, onChange, onCaptchaChange }) => {
  // Thêm state để lưu mã captcha trong component
  const [captchaCode, setCaptchaCode] = useState('');

  const generateCaptcha = () => {
    const chars = '0123456789ABCDEFGHJKMNOPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
    let captcha = '';
    for (let i = 0; i < 6; i++) {
      captcha += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setCaptchaCode(captcha);
    onCaptchaChange(captcha);
  };

  useEffect(() => {
    generateCaptcha();
  }, []);

  // Khi giá trị captcha của người dùng bị reset (trở về rỗng), tạo captcha mới
  useEffect(() => {
    if (value === '') {
      generateCaptcha();
    }
  }, [value]);

  const handleInputChange = (text: string) => {
    onChange(text);
  };

  return (
    <View style={styles.container}>
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={handleInputChange}
          placeholder="Nhập mã xác nhận"
          maxLength={6}
          autoCapitalize="none"
        />
      </View>
      <View style={styles.captchaContainer}>
        <Text style={styles.captchaText}>{captchaCode}</Text>
        <TouchableOpacity onPress={generateCaptcha} style={styles.refreshButton}>
          <MaterialIcons name="refresh" size={24} color="#0068ff" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  inputContainer: {
    flex: 1,
    marginRight: 10,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: '#d9d9d9',
    borderRadius: 4,
    paddingHorizontal: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  captchaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    padding: 8,
    borderRadius: 4,
    minWidth: 120,
    justifyContent: 'center',
  },
  captchaText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginRight: 8,
  },
  refreshButton: {
    padding: 4,
  },
});

export default Captcha; 
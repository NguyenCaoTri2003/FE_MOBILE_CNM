import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from "react-native";
import { useNavigation } from "@react-navigation/native";
import Icon from "react-native-vector-icons/FontAwesome";

const UpdateBioScreen = () => {
  const [bio, setBio] = useState("");
  const navigation = useNavigation();

  const handleSave = () => {
    alert("Cập nhật giới thiệu bản thân thành công!");
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      {/* Header với nút Quay lại */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-left" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Cập nhật giới thiệu</Text>
      </View>

      {/* Nội dung nhập liệu */}
      <View style={styles.content}>
        <Text style={styles.label}>Giới thiệu bản thân:</Text>
        <TextInput
          style={styles.input}
          placeholder="Viết một chút về bản thân bạn..."
          placeholderTextColor="#aaa"
          value={bio}
          onChangeText={setBio}
          multiline
        />
      </View>

      {/* Nút Lưu */}
      <TouchableOpacity style={styles.saveButton} onPress={handleSave} activeOpacity={0.7}>
        <Text style={styles.saveButtonText}>Lưu thay đổi</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F2F5F9",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#007AFF",
    paddingVertical: 15,
    paddingHorizontal: 15,
    width: "100%"
  },
  backButton: {
    padding: 10,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
    marginLeft: 10,
  },
  content: {
    marginTop: 20,
    padding: 15,
    backgroundColor: "#fff",
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 10,
    color: "#333",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    height: 120,
    backgroundColor: "#F9FAFB",
    textAlignVertical: "top",
    color: "#333",
  },
  saveButton: {
    marginTop: 25,
    backgroundColor: "#007AFF",
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 12,
    alignItems: "center",
    alignSelf: "center",
    shadowColor: "#007AFF",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "bold",
  },
});

export default UpdateBioScreen;

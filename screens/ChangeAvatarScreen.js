import React, { useState } from "react";
import { View, Text, TouchableOpacity, Image, StyleSheet, Modal } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useNavigation } from "@react-navigation/native";

const ChangeAvatarScreen = () => {
  const [avatar, setAvatar] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const navigation = useNavigation();

  // Chọn ảnh từ thư viện
  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (!result.canceled) {
      setAvatar(result.assets[0].uri);
      setModalVisible(false);
    }
  };

  // Chụp ảnh mới
  const takePhoto = async () => {
    let result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (!result.canceled) {
      setAvatar(result.assets[0].uri);
      setModalVisible(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Chọn ảnh đại diện</Text>

      <TouchableOpacity style={styles.imageContainer} onPress={() => setModalVisible(true)}>
        {avatar ? (
          <Image source={{ uri: avatar }} style={styles.image} />
        ) : (
          <Text style={styles.placeholder}>Nhấn để chọn ảnh</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity style={styles.saveButton} onPress={() => navigation.goBack()}>
        <Text style={styles.saveButtonText}>Lưu ảnh</Text>
      </TouchableOpacity>

      {/* Modal chọn ảnh */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Ảnh đại diện</Text>
            <TouchableOpacity style={styles.modalOption} onPress={takePhoto}>
              <Text>📷 Chụp ảnh mới</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalOption} onPress={pickImage}>
              <Text>🖼 Chọn ảnh trên máy</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalOption}>
              <Text>📁 Chọn từ ảnh đại diện cũ</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalCancel} onPress={() => setModalVisible(false)}>
              <Text style={{ color: "red" }}>Hủy</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 20,
  },
  imageContainer: {
    width: 150,
    height: 150,
    borderRadius: 75,
    borderWidth: 1,
    borderColor: "#ddd",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  placeholder: {
    color: "#aaa",
  },
  saveButton: {
    marginTop: 20,
    backgroundColor: "#007AFF",
    paddingVertical: 10,
    paddingHorizontal: 30,
    borderRadius: 5,
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  modalContainer: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContent: {
    backgroundColor: "white",
    padding: 20,
    borderTopLeftRadius: 15,
    borderTopRightRadius: 15,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 15,
  },
  modalOption: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
  },
  modalCancel: {
    paddingVertical: 10,
    alignItems: "center",
  },
});

export default ChangeAvatarScreen;
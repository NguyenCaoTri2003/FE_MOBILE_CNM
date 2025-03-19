import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView } from "react-native";
import { useNavigation } from "@react-navigation/native";

const EditProfileScreen = () => {
  const navigation = useNavigation();

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Ảnh bìa */}
      <Image 
        source={{ uri: "https://i.postimg.cc/RCj7hBPq/account.png" }} 
        style={styles.coverImage} 
      />

      {/* Ảnh đại diện */}
      <View style={styles.avatarContainer}>
        <Image 
          source={{ uri: "https://i.postimg.cc/RCj7hBPq/account.png" }} 
          style={styles.avatar} 
        />
      </View>

      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.header}>
        <Text style={styles.headerText}>THÔNG TIN CÁ NHÂN</Text>
      </TouchableOpacity>

      <View style={styles.profileSection}>
        <Text style={styles.label}>Họ và tên</Text>
        <Text style={styles.value}>Hoàng Huy Tới</Text>

        <Text style={styles.label}>Giới tính</Text>
        <Text style={styles.value}>Nam</Text>

        <Text style={styles.label}>Ngày sinh</Text>
        <Text style={styles.value}>23/10/2003</Text>

        <Text style={styles.label}>Điện thoại</Text>
        <Text style={styles.value}>+84 985 484 725</Text>
      </View>

      {/* Nút Chỉnh sửa */}
      <TouchableOpacity 
        style={styles.editButton} 
        onPress={() => navigation.navigate("EditProfileFormScreen")}
      >
        <Text style={styles.editButtonText}>Chỉnh sửa</Text>
      </TouchableOpacity>

      {/* Thêm khoảng trống */}
      <View style={{ height: 20 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  coverImage: {
    width: "100%",
    height: 150, 
  },
  avatarContainer: {
    position: "absolute",
    top: 100, 
    alignSelf: "center",
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50, 
    borderWidth: 3,
    borderColor: "#fff",
  },
  header: {
    marginTop: 60,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
    alignItems: "center",
  },
  headerText: {
    fontSize: 18,
    fontWeight: "bold",
  },
  profileSection: {
    marginTop: 20,
    paddingHorizontal: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#555",
    marginTop: 10,
  },
  value: {
    fontSize: 16,
    color: "#333",
    marginBottom: 10,
  },
  editButton: {
    marginTop: 20,
    backgroundColor: "#007AFF",
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 5,
    marginHorizontal: 20,
  },
  editButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});

export default EditProfileScreen;

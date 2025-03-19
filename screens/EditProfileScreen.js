import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useNavigation } from "@react-navigation/native";

const EditProfileScreen = () => {
  const navigation = useNavigation();

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.header}>
        <Text style={styles.headerText}>Chỉnh sửa thông tin</Text>
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

      <TouchableOpacity style={styles.editButton}>
        <Text style={styles.editButtonText}>Chỉnh sửa</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 20,
  },
  header: {
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
  },
  editButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});

export default EditProfileScreen;

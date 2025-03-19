import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from "react-native";
import { useNavigation } from "@react-navigation/native";
import Icon from "react-native-vector-icons/FontAwesome";

const SettingScreen = () => {
  const navigation = useNavigation();

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={20} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Hoàng Huy Tới</Text>
      </View>

      {/* Nội dung cài đặt */}
      <ScrollView>
        <View style={styles.section}>
            <TouchableOpacity style={styles.item} onPress={() => navigation.navigate("EditProfileScreen")}>
                <Text style={styles.itemText}>Thông tin</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.item} onPress={() => navigation.navigate("ChangeAvatarScreen")}>
                <Text style={styles.itemText}>Đổi ảnh đại diện</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.item} onPress={() => navigation.navigate("ChangeCoverScreen")}>
                <Text style={styles.itemText}>Đổi ảnh bìa</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.item} onPress={() => navigation.navigate("UpdateBioScreen")}>
                <Text style={styles.itemText}>Cập nhật giới thiệu bản thân</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.item}>
                <Text style={styles.itemText}>Ví của tôi</Text>
            </TouchableOpacity>
        </View>

        {/* Cài đặt */}
        <Text style={styles.sectionTitle}>Cài đặt</Text>
        <View style={styles.section}>
          <TouchableOpacity style={styles.item}>
            <Text style={styles.itemText}>Mã QR của tôi</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.item}>
            <Text style={styles.itemText}>Quyền riêng tư</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.item}>
            <Text style={styles.itemText}>Quản lý tài khoản</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.item}>
            <Text style={styles.itemText}>Cài đặt chung</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#007AFF",
    paddingVertical: 15,
    paddingHorizontal: 15,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "white",
    marginLeft: 15,
  },
  section: {
    backgroundColor: "white",
    marginVertical: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#007AFF",
    paddingHorizontal: 15,
    paddingVertical: 5,
  },
  item: {
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5E5",
  },
  itemText: {
    fontSize: 16,
    color: "#333",
  },
});

export default SettingScreen;

import React from "react";
import {View, Text, Image, StyleSheet, TouchableOpacity, ScrollView,} from "react-native";
import Icon from "react-native-vector-icons/FontAwesome";
import { useNavigation } from "@react-navigation/native";

const ProfileDetailScreen = () => {
  const navigation = useNavigation();

  const actionButtons = [
    { name: "paint-brush", text: "Cài zStyle" },
    { name: "image", text: "Ảnh của tôi" },
    { name: "folder", text: "Kho khoảnh khắc" },
    { name: "history", text: "Kỷ niệm năm xưa" },
    { name: "heart", text: "Yêu thích nhất" },
    { name: "video-camera", text: "Video của tôi" },
  ];

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.headerProfile}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={25} color="black" />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate("SettingScreen")}>
          <Icon name="ellipsis-v" size={20} color="black" style={{ transform: [{ rotate: "90deg" }] }} />
        </TouchableOpacity>
      </View>

      {/* Ảnh bìa & Avatar */}
      <View style={styles.headerContainer}>
        <Image
          source={{ uri: "https://i.postimg.cc/RCj7hBPq/account.png" }}
          style={styles.coverPhoto}
        />
        <View style={styles.avatarContainer}>
          <Image
            source={{ uri: "https://i.postimg.cc/RCj7hBPq/account.png" }}
            style={styles.avatar}
          />
        </View>
      </View>

      {/* Thông tin người dùng */}
      <View style={styles.infoContainer}>
        <Text style={styles.name}>Hoàng Huy Tới</Text>
        <TouchableOpacity onPress={() => navigation.navigate("UpdateBioScreen")}>
          <Text style={styles.updateInfo}>✏️ Cập nhật giới thiệu bản thân</Text>
        </TouchableOpacity>
      </View>

      {/* Nút hành động */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.actionButtons}>
        {actionButtons.map((item, index) => (
          <TouchableOpacity key={index} style={styles.button}>
            <Icon name={item.name} size={16} color="#0084FF" />
            <Text style={styles.buttonText}>{item.text}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  headerProfile: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 15,
    paddingVertical: 10,
    zIndex: 10,
    opacity: 0.9,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },
  headerContainer: {
    position: "relative",
  },
  coverPhoto: {
    width: "100%",
    height: 250,
  },
  avatarContainer: {
    position: "absolute",
    left: "50%",
    bottom: -40,
    marginLeft: -40,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: "#fff",
  },
  infoContainer: {
    alignItems: "center",
    marginTop: 50,
  },
  name: {
    fontSize: 22,
    fontWeight: "bold",
  },
  updateInfo: {
    color: "#0084FF",
    marginTop: 5,
  },
  actionButtons: {
    flexDirection: "row",
    marginTop: 15,
    paddingHorizontal: 10,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
    marginHorizontal: 5,
    backgroundColor: "#f0f0f0",
    borderRadius: 8,
    elevation: 3,
  },
  buttonText: {
    marginLeft: 5,
    fontSize: 14,
    fontWeight: "600",
    color: "#0084FF",
  },
});

export default ProfileDetailScreen;

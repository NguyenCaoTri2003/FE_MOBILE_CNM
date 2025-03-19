import React from "react";
import { View, Text, Image, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import Icon from "react-native-vector-icons/FontAwesome";
import Ionicons from "react-native-vector-icons/Ionicons";
import { useNavigation } from "@react-navigation/native";

const ProfileScreen = () => {
  const navigation = useNavigation();

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.profileContainer}>
        <Image 
          source={{ uri: "https://i.postimg.cc/RCj7hBPq/account.png" }} 
          style={styles.avatar} 
        />
        <TouchableOpacity 
          style={styles.profileInfo} 
          onPress={() => navigation.navigate("ProfileDetail")}
        >
          <Text style={styles.profileName}>Hoàng Huy Tới</Text>
          <Text style={styles.profileLink}>Xem trang cá nhân</Text>
        </TouchableOpacity>
        <TouchableOpacity>
          <Ionicons name="person-add-outline" size={24} color="#0084FF" />
        </TouchableOpacity>
      </View>

      {/* Danh sách tính năng */}
      <View style={styles.featureList}>
        <FeatureItem icon="cloud" text="zCloud" subText="Không gian lưu trữ dữ liệu trên đám mây" />
        <FeatureItem icon="magic" text="zStyle – Nổi bật trên Zalo" subText="Hình nền và nhạc cho cuộc gọi Zalo" noArrow />
        <View style={styles.separator} />
        <FeatureItem icon="cloud" text="Cloud của tôi" subText="Lưu trữ các tin nhắn quan trọng" />
        <FeatureItem icon="clock-o" text="Dữ liệu trên máy" subText="Quản lý dữ liệu Zalo của bạn" />
        <FeatureItem icon="qrcode" text="Ví QR" subText="Lưu trữ và xuất trình các mã QR quan trọng" noArrow />
        <View style={styles.separator} />
        <FeatureItem icon="shield" text="Tài khoản và bảo mật" />
        <FeatureItem icon="lock" text="Quyền riêng tư" />
      </View>
    </ScrollView>
  );
};

const FeatureItem = ({ icon, text, subText, noArrow }) => (
  <TouchableOpacity style={styles.featureItem}>
    <Icon name={icon} size={22} color="#0084FF" />
    <View style={styles.featureText}>
      <Text style={styles.featureTitle}>{text}</Text>
      {subText && <Text style={styles.featureSub}>{subText}</Text>}
    </View>
    {!noArrow && <Ionicons name="chevron-forward" size={20} color="#888" />}
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  profileContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 15,
    backgroundColor: "white",
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  profileInfo: {
    flex: 1,
    marginLeft: 15,
  },
  profileName: {
    fontSize: 18,
    fontWeight: "bold",
  },
  profileLink: {
    color: "#0084FF",
    marginTop: 3,
  },
  featureList: {
    marginTop: 10,
    backgroundColor: "white",
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
  },
  featureText: {
    flex: 1,
    marginLeft: 15,
  },
  featureTitle: {
    fontSize: 16,
  },
  featureSub: {
    fontSize: 13,
    color: "#666",
    marginTop: 3,
  },
  separator: {
    height: 10,
    backgroundColor: "#f5f5f5",
  },
});

export default ProfileScreen;

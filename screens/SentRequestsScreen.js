import React, { useState } from "react";
import { View, Text, FlatList, Image, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

const SENT_REQUESTS = [
  { id: "1", name: "Nguyen V Phong", avatar: "https://i.postimg.cc/RCj7hBPq/account.png", time: "1 phút trước" },
];

const SentRequestsScreen = ({ navigation }) => {
  const [requests, setRequests] = useState(SENT_REQUESTS);

  const handleCancel = (id) => {
    setRequests(requests.filter((item) => item.id !== id));
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Lời mời kết bạn</Text>
        <Ionicons name="settings-outline" size={24} color="#fff" />
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.tabText}>Đã nhận 7</Text>
        </TouchableOpacity>
        <Text style={[styles.tabText, styles.activeTab]}>Đã gửi 1</Text>
      </View>

      {/* Sent Requests List */}
      <FlatList
        data={requests}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.requestItem}>
            <Image source={{ uri: item.avatar }} style={styles.avatar} />
            <View style={styles.info}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.subText}>Muốn kết bạn</Text>
              <Text style={styles.time}>{item.time}</Text>
            </View>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => handleCancel(item.id)}>
              <Text style={styles.cancelText}>THU HỒI</Text>
            </TouchableOpacity>
          </View>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#0084FF",
    paddingHorizontal: 15,
    paddingVertical: 12,
  },
  headerTitle: { fontSize: 18, fontWeight: "bold", color: "#fff" },
  tabs: {
    flexDirection: "row",
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
  },
  tabText: { fontSize: 16, color: "#666", marginRight: 20 },
  activeTab: { fontWeight: "bold", color: "#000", borderBottomWidth: 2, borderBottomColor: "#0084FF", paddingBottom: 5 },
  requestItem: { flexDirection: "row", alignItems: "center", paddingVertical: 12, paddingHorizontal: 15, borderBottomWidth: 1, borderBottomColor: "#ddd" },
  avatar: { width: 50, height: 50, borderRadius: 25, marginRight: 12 },
  info: { flex: 1 },
  name: { fontSize: 16, fontWeight: "bold" },
  subText: { color: "#888" },
  time: { color: "#aaa" },
  cancelBtn: { backgroundColor: "#eee", paddingVertical: 6, paddingHorizontal: 15, borderRadius: 20 },
  cancelText: { color: "#333", fontWeight: "bold" },
});

export default SentRequestsScreen;

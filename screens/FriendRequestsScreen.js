import React, { useState } from "react";
import { View, Text, FlatList, Image, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

const FRIEND_REQUESTS = [
  { id: "1", name: "Huy", avatar: "https://i.postimg.cc/RCj7hBPq/account.png" },
  { id: "2", name: "Nguyễn Văn Tấn", avatar: "https://i.postimg.cc/RCj7hBPq/account.png" },
];

const FriendRequestsScreen = () => {
  const [requests, setRequests] = useState(FRIEND_REQUESTS);

  const handleAccept = (id) => {
    setRequests(requests.filter((item) => item.id !== id));
  };

  const handleReject = (id) => {
    setRequests(requests.filter((item) => item.id !== id));
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Ionicons name="arrow-back" size={24} color="#fff" />
        <Text style={styles.headerTitle}>Lời mời kết bạn</Text>
        <Ionicons name="settings-outline" size={24} color="#fff" />
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <Text style={[styles.tabText, styles.activeTab]}>Đã nhận 7</Text>
        <Text style={styles.tabText}>Đã gửi</Text>
      </View>

      {/* Friend Requests List */}
      <FlatList
        data={requests}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.requestItem}>
            <Image source={{ uri: item.avatar }} style={styles.avatar} />
            <View style={styles.info}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.subText}>Muốn kết bạn</Text>
            </View>
            <TouchableOpacity style={styles.rejectBtn} onPress={() => handleReject(item.id)}>
              <Text style={styles.rejectText}>TỪ CHỐI</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.acceptBtn} onPress={() => handleAccept(item.id)}>
              <Text style={styles.acceptText}>ĐỒNG Ý</Text>
            </TouchableOpacity>
          </View>
        )}
      />

      {/* Xem thêm */}
      <TouchableOpacity style={styles.loadMore}>
        <Text style={styles.loadMoreText}>XEM THÊM</Text>
        <Ionicons name="chevron-down" size={16} color="#333" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#0084FF",
    paddingHorizontal: 15,
    paddingVertical: 12,
  },
  headerTitle: { fontSize: 18, fontWeight: "bold", color: "#fff" },

  // Tabs
  tabs: {
    flexDirection: "row",
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
  },
  tabText: {
    fontSize: 16,
    color: "#666",
    marginRight: 20,
  },
  activeTab: {
    fontWeight: "bold",
    color: "#000",
    borderBottomWidth: 2,
    borderBottomColor: "#0084FF",
    paddingBottom: 5,
  },

  // Friend Request Item
  requestItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
  },
  avatar: { width: 50, height: 50, borderRadius: 25, marginRight: 12 },
  info: { flex: 1 },
  name: { fontSize: 16, fontWeight: "bold" },
  subText: { color: "#888" },

  // Buttons
  rejectBtn: {
    backgroundColor: "#eee",
    paddingVertical: 6,
    paddingHorizontal: 15,
    borderRadius: 20,
    marginRight: 8,
  },
  rejectText: { color: "#333", fontWeight: "bold" },
  acceptBtn: {
    backgroundColor: "#0084FF",
    paddingVertical: 6,
    paddingHorizontal: 15,
    borderRadius: 20,
  },
  acceptText: { color: "#fff", fontWeight: "bold" },

  // Xem thêm
  loadMore: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 15,
  },
  loadMoreText: { fontSize: 14, color: "#333", marginRight: 5 },
});

export default FriendRequestsScreen;

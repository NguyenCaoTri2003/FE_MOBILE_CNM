import React, { useState } from "react";
import {View,Text,TouchableOpacity,FlatList,StyleSheet,Image,} from "react-native";
import Icon from "react-native-vector-icons/FontAwesome";
import { useNavigation } from "@react-navigation/native";


const TABS = ["Bạn bè", "Nhóm", "OA"];
const CONTACTS = [
  { id: "1", name: "Lời mời kết bạn", icon: "user-plus", count: 7 },
  { id: "2", name: "Danh bạ máy", icon: "address-book", subtitle: "Các liên hệ có dùng Zalo" },
  { id: "3", name: "Sinh nhật", icon: "birthday-cake" },
];

const FRIENDS = [
  { id: "1", name: "Nam Tiến", avatar: "https://i.postimg.cc/RCj7hBPq/account.png" },
  { id: "2", name: "Lan Hương", avatar: "https://i.postimg.cc/RCj7hBPq/account.png" },
];

const ContactsScreen = () => {
  const navigation = useNavigation();
  const [activeTab, setActiveTab] = useState("Bạn bè");

  return (
    <View style={styles.container}>
      {/* Tabs */}
      <View style={styles.tabs}>
        {TABS.map((tab) => (
          <TouchableOpacity key={tab} onPress={() => setActiveTab(tab)}>
            <Text style={[styles.tabText, activeTab === tab && styles.activeTab]}>{tab}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Danh sách danh bạ */}
      <FlatList
      data={CONTACTS}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <TouchableOpacity
          style={styles.contactItem}
          onPress={() => {
            if (item.id === "1") navigation.navigate("FriendRequestsScreen");
          }}
        >
          <Icon name={item.icon} size={24} color="white" style={styles.contactIcon} />
          <View>
            <Text style={styles.contactName}>{item.name}</Text>
            {item.subtitle && <Text style={styles.contactSubtitle}>{item.subtitle}</Text>}
          </View>
          {item.count && <Text style={styles.contactCount}>{item.count}</Text>}
        </TouchableOpacity>
      )}
    />
    

      {/* Bộ lọc danh sách */}
      <View style={styles.filterContainer}>
        <TouchableOpacity style={[styles.filterButton, styles.activeFilter]}>
          <Text style={styles.filterText}>Tất cả</Text>
          <Text style={styles.filterBadge}>53</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.filterButton}>
          <Text style={styles.filterText}>Mới truy cập</Text>
          <Text style={styles.filterBadge}>10</Text>
        </TouchableOpacity>
      </View>

      {/* Danh sách bạn bè */}
      <FlatList
        data={FRIENDS}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.friendItem}>
            <Image source={{ uri: item.avatar }} style={styles.friendAvatar} />
            <Text style={styles.friendName}>{item.name}</Text>
            <View style={styles.friendIcons}>
              <Icon name="phone" size={20} color="#0084FF" style={styles.icon} />
              <Icon name="video-camera" size={20} color="#0084FF" style={styles.icon} />
            </View>
          </View>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "white" },
  tabs: {
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: "white",
    paddingVertical: 10,
  },
  tabText: { fontSize: 16, fontWeight: "500", color: "#888" },
  activeTab: { color: "black", borderBottomWidth: 2, borderBottomColor: "#0084FF", paddingBottom: 5 },
  contactItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
  },
  contactIcon: {
    backgroundColor: "#0084FF",
    padding: 10,
    borderRadius: 30,
    marginRight: 10,
  },
  contactName: { fontSize: 16, fontWeight: "500" },
  contactSubtitle: { fontSize: 13, color: "#888" },
  contactCount: { marginLeft: "auto", fontSize: 16, color: "#0084FF" },
  filterContainer: {
    flexDirection: "row",
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  filterButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#eee",
    borderRadius: 15,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 10,
  },
  activeFilter: { backgroundColor: "#ddd" },
  filterText: { fontSize: 14, fontWeight: "500", marginRight: 5 },
  filterBadge: { fontSize: 14, fontWeight: "bold", color: "#0084FF" },
  friendItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  friendAvatar: { width: 40, height: 40, borderRadius: 20, marginRight: 10 },
  friendName: { fontSize: 16, fontWeight: "500", flex: 1 },
  friendIcons: { flexDirection: "row" },
  icon: { marginLeft: 15 },
});

export default ContactsScreen;

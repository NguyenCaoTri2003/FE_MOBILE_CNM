import React from "react";
import { View, TextInput, TouchableOpacity, StyleSheet } from "react-native";
import Icon from "react-native-vector-icons/FontAwesome";

const NewsHeader = () => {
  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <Icon name="search" size={18} color="gray" style={styles.searchIcon} />
        <TextInput placeholder="Tìm kiếm" placeholderTextColor="#888" style={styles.searchInput} />
      </View>
      <TouchableOpacity style={styles.iconButton}>
        <Icon name="qrcode" size={24} color="white" />
      </TouchableOpacity>
      <TouchableOpacity style={styles.iconButton}>
        <Icon name="plus" size={24} color="white" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0084FF",
    paddingVertical: 10,
    paddingHorizontal: 15,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    backgroundColor: "white",
    borderRadius: 20,
    paddingHorizontal: 10,
    height: 35,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: "100%",
  },
  iconButton: {
    marginLeft: 10,
  },
});

export default NewsHeader;

import React, { useState } from "react";
import { View, Text, TextInput, StyleSheet, TouchableOpacity } from "react-native";
import { useNavigation } from "@react-navigation/native";

const EditProfileFormScreen = () => {
  const navigation = useNavigation();

  // Trạng thái lưu thông tin
  const [name, setName] = useState("Hoàng Huy Tới");
  const [gender, setGender] = useState("Nam");
  const [dob, setDob] = useState("23/10/2003");
  const [phone, setPhone] = useState("+84 985 484 725");

  return (
    <View style={styles.container}>
      <Text style={styles.headerText}>Chỉnh sửa thông tin</Text>

      <Text style={styles.label}>Họ và tên</Text>
      <TextInput style={styles.input} value={name} onChangeText={setName} />

      {/* Radio button chọn giới tính */}
      <Text style={styles.label}>Giới tính</Text>
      <View style={styles.genderContainer}>
        <TouchableOpacity 
          style={styles.genderButton} 
          onPress={() => setGender("Nam")}
        >
          <View style={styles.radioCircle}>
            {gender === "Nam" && <View style={styles.selectedRadio} />}
          </View>
          <Text style={styles.genderText}>Nam</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.genderButton} 
          onPress={() => setGender("Nữ")}
        >
          <View style={styles.radioCircle}>
            {gender === "Nữ" && <View style={styles.selectedRadio} />}
          </View>
          <Text style={styles.genderText}>Nữ</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.label}>Ngày sinh</Text>
      <TextInput style={styles.input} value={dob} onChangeText={setDob} />

      <Text style={styles.label}>Điện thoại</Text>
      <TextInput style={styles.input} value={phone} onChangeText={setPhone} keyboardType="phone-pad" />

      <TouchableOpacity 
        style={styles.saveButton} 
        onPress={() => navigation.goBack()}
      >
        <Text style={styles.saveButtonText}>Lưu</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#fff",
  },
  headerText: {
    fontSize: 20,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#555",
    marginTop: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 5,
    padding: 10,
    fontSize: 16,
    marginTop: 5,
  },
  saveButton: {
    marginTop: 20,
    backgroundColor: "#007AFF",
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 5,
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  genderContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 5,
  },
  genderButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  radioCircle: {
    height: 20,
    width: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#007AFF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  selectedRadio: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#007AFF",
  },
  genderText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
  },
});

export default EditProfileFormScreen;

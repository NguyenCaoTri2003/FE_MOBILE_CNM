import React, { useState } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, TextInput, SafeAreaView, StatusBar, ScrollView } from 'react-native';
import { Text, Avatar, Icon, Tab, TabView } from '@rneui/themed';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { Ionicons, MaterialIcons, FontAwesome, MaterialCommunityIcons } from '@expo/vector-icons';

// Mock data for contacts
const friendRequests = 5;

const contacts = [
  {
    letter: 'A',
    items: [
      {
        id: '1',
        name: 'Anh Tuấn',
        avatar: 'https://randomuser.me/api/portraits/men/1.jpg'
      }
    ]
  },
  {
    letter: 'L',
    items: [
      {
        id: '2',
        name: 'Lê Thị Hoa',
        avatar: 'https://randomuser.me/api/portraits/women/1.jpg'
      },
      {
        id: '3',
        name: 'Lý Văn Minh',
        avatar: 'https://randomuser.me/api/portraits/men/2.jpg'
      }
    ]
  },
  {
    letter: 'N',
    items: [
      {
        id: '4',
        name: 'Nguyễn Văn A',
        avatar: 'https://randomuser.me/api/portraits/men/3.jpg'
      },
      {
        id: '5',
        name: 'Nguyễn Thị B',
        avatar: 'https://randomuser.me/api/portraits/women/2.jpg'
      },
      {
        id: '6',
        name: 'Nguyễn Minh C',
        avatar: 'https://randomuser.me/api/portraits/men/4.jpg'
      }
    ]
  },
  {
    letter: 'P',
    items: [
      {
        id: '7',
        name: 'Phạm Hồng Đức',
        avatar: 'https://randomuser.me/api/portraits/men/5.jpg'
      }
    ]
  },
  {
    letter: 'T',
    items: [
      {
        id: '8',
        name: 'Trần Văn Đạt',
        avatar: 'https://randomuser.me/api/portraits/men/6.jpg'
      },
      {
        id: '9',
        name: 'Trịnh Thị Lan',
        avatar: 'https://randomuser.me/api/portraits/women/3.jpg'
      }
    ]
  },
  {
    letter: 'V',
    items: [
      {
        id: '10',
        name: 'Võ Anh Dũng',
        avatar: 'https://randomuser.me/api/portraits/men/7.jpg'
      }
    ]
  }
];

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const ContactsScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const [activeTab, setActiveTab] = useState('contacts');
  const [contactsIndex, setContactsIndex] = useState(0);

  const renderContactSection = ({ item }: { item: any }) => {
    return (
      <View>
        <Text style={styles.letterHeader}>{item.letter}</Text>
        {item.items.map((contact: any) => (
          <TouchableOpacity key={contact.id} style={styles.contactItem}>
            <Avatar
              rounded
              source={{ uri: contact.avatar }}
              size={50}
            />
            <Text style={styles.contactName}>{contact.name}</Text>
            <View style={styles.contactActions}>
              <TouchableOpacity style={styles.actionButton}>
                <Ionicons name="call-outline" size={24} color="#666" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionButton}>
                <Ionicons name="videocam-outline" size={24} color="#666" />
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#0068ff" barStyle="light-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={24} color="#fff" style={styles.searchIcon} />
          <TextInput
            placeholder="Tìm kiếm"
            placeholderTextColor="#fff"
            style={styles.searchInput}
          />
        </View>
        <View style={styles.headerIcons}>
          <TouchableOpacity style={styles.addButton}>
            <Ionicons name="person-add" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Contacts Tabs */}
      <View style={styles.tabContainer}>
        <Tab
          value={contactsIndex}
          onChange={setContactsIndex}
          indicatorStyle={{ backgroundColor: '#0068ff', height: 3 }}
          containerStyle={{ backgroundColor: 'white' }}
        >
          <Tab.Item
            title="Bạn bè"
            titleStyle={(active) => ({ color: active ? '#0068ff' : '#666', fontSize: 16 })}
          />
          <Tab.Item
            title="Nhóm"
            titleStyle={(active) => ({ color: active ? '#0068ff' : '#666', fontSize: 16 })}
          />
          <Tab.Item
            title="OA"
            titleStyle={(active) => ({ color: active ? '#0068ff' : '#666', fontSize: 16 })}
          />
        </Tab>
      </View>

      <TabView value={contactsIndex} onChange={setContactsIndex} animationType="spring">
        <TabView.Item style={styles.tabContent}>
          <ScrollView>
            {/* Friend Requests */}
            <TouchableOpacity style={styles.specialItem}>
              <View style={styles.specialIcon}>
                <MaterialIcons name="person-add" size={24} color="#fff" />
              </View>
              <Text style={styles.specialItemText}>Lời mời kết bạn ({friendRequests})</Text>
            </TouchableOpacity>

            {/* Phone Contacts */}
            <TouchableOpacity style={styles.specialItem}>
              <View style={[styles.specialIcon, { backgroundColor: '#2ecc71' }]}>
                <MaterialIcons name="contacts" size={24} color="#fff" />
              </View>
              <View style={styles.specialItemTextContainer}>
                <Text style={styles.specialItemText}>Danh bạ máy</Text>
                <Text style={styles.specialItemSubtext}>Các liên hệ có dùng Zalo</Text>
              </View>
            </TouchableOpacity>

            {/* Birthdays */}
            <TouchableOpacity style={styles.specialItem}>
              <View style={[styles.specialIcon, { backgroundColor: '#e74c3c' }]}>
                <FontAwesome name="birthday-cake" size={24} color="#fff" />
              </View>
              <Text style={styles.specialItemText}>Sinh nhật</Text>
            </TouchableOpacity>

            {/* Filter Options */}
            <View style={styles.filterContainer}>
              <TouchableOpacity style={styles.filterButton}>
                <Text style={styles.filterButtonText}>Tất cả 53</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.filterButton, styles.outlineButton]}>
                <Text style={styles.outlineButtonText}>Mới truy cập 10</Text>
              </TouchableOpacity>
            </View>

            {/* Contacts List */}
            <FlatList
              data={contacts}
              renderItem={renderContactSection}
              keyExtractor={(item) => item.letter}
              scrollEnabled={false}
            />
          </ScrollView>
        </TabView.Item>

        <TabView.Item style={styles.tabContent}>
          <View style={styles.emptyContent}>
            <Text>Danh sách nhóm của bạn</Text>
          </View>
        </TabView.Item>

        <TabView.Item style={styles.tabContent}>
          <View style={styles.emptyContent}>
            <Text>Danh sách tài khoản chính thức</Text>
          </View>
        </TabView.Item>
      </TabView>

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <TouchableOpacity 
          style={[styles.navItem, activeTab === 'messages' && styles.activeNavItem]} 
          onPress={() => {
            setActiveTab('messages');
            navigation.navigate('Messages');
          }}
        >
          <Ionicons 
            name="chatbubble-outline" 
            size={24} 
            color="#666" 
          />
          <Text style={styles.navText}>Tin nhắn</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.navItem, activeTab === 'contacts' && styles.activeNavItem]} 
        >
          <Ionicons 
            name="people" 
            size={24} 
            color="#0068ff" 
          />
          <Text style={[styles.navText, styles.activeNavText]}>Danh bạ</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.navItem, activeTab === 'discover' && styles.activeNavItem]} 
        >
          <MaterialIcons 
            name="grid-view" 
            size={24} 
            color="#666" 
          />
          <Text style={styles.navText}>Khám phá</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.navItem, activeTab === 'diary' && styles.activeNavItem]} 
          onPress={() => navigation.navigate('Diary')}
        >
          <FontAwesome 
            name="clock-o" 
            size={24} 
            color="#666" 
          />
          <Text style={styles.navText}>Nhật ký</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.navItem, activeTab === 'profile' && styles.activeNavItem]} 
          onPress={() => navigation.navigate('Profile')}
        >
          <FontAwesome 
            name="user-o" 
            size={24} 
            color="#666" 
          />
          <Text style={styles.navText}>Cá nhân</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    backgroundColor: '#0068ff',
    paddingHorizontal: 10,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchIcon: {
    marginRight: 5,
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
  },
  headerIcons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  addButton: {},
  tabContainer: {
    backgroundColor: '#fff',
  },
  tabContent: {
    width: '100%',
    backgroundColor: '#fff',
  },
  specialItem: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 16,
    alignItems: 'center',
    borderBottomWidth: 0.5,
    borderBottomColor: '#e0e0e0',
  },
  specialIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#3498db',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  specialItemText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  specialItemTextContainer: {
    flex: 1,
  },
  specialItemSubtext: {
    fontSize: 14,
    color: '#999',
  },
  filterContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  filterButton: {
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginRight: 10,
    borderWidth: 0.5,
    borderColor: '#ddd',
  },
  outlineButton: {
    backgroundColor: 'transparent',
  },
  filterButtonText: {
    color: '#333',
    fontWeight: 'bold',
  },
  outlineButtonText: {
    color: '#999',
    fontWeight: 'bold',
  },
  letterHeader: {
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontWeight: 'bold',
    fontSize: 16,
    color: '#333',
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 0.5,
    borderBottomColor: '#e0e0e0',
  },
  contactName: {
    fontSize: 16,
    marginLeft: 16,
    flex: 1,
    color: '#333',
  },
  contactActions: {
    flexDirection: 'row',
  },
  actionButton: {
    marginLeft: 15,
  },
  emptyContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingVertical: 5,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 5,
  },
  activeNavItem: {},
  navText: {
    fontSize: 12,
    marginTop: 2,
    color: '#666',
  },
  activeNavText: {
    color: '#0068ff',
  },
});

export default ContactsScreen; 
import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, StatusBar } from 'react-native';
import { Ionicons, MaterialIcons, FontAwesome, FontAwesome5 } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/AppNavigator';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const DiscoveryScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const [activeTab, setActiveTab] = useState('discover');

  useFocusEffect(
    useCallback(() => {
      setActiveTab('discover');
    }, [])
  );

  const renderNewsItem = (title: string, image: string, time: string) => (
    <TouchableOpacity style={styles.newsItem}>
      <Image source={{ uri: image }} style={styles.newsImage} />
      <View style={styles.newsContent}>
        <Text style={styles.newsTitle} numberOfLines={2}>{title}</Text>
        <Text style={styles.newsTime}>{time}</Text>
      </View>
    </TouchableOpacity>
  );

  const renderMiniApp = (icon: string, name: string) => (
    <TouchableOpacity style={styles.miniAppItem}>
      <View style={styles.miniAppIcon}>
        <Ionicons name={icon as any} size={24} color="#0068ff" />
      </View>
      <Text style={styles.miniAppName}>{name}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }} edges={['top', 'bottom', 'left', 'right']}>
      <StatusBar backgroundColor="#0068ff" barStyle="light-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Khám phá</Text>
        <TouchableOpacity>
          <Ionicons name="search" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* Mini Apps Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Mini Apps</Text>
            <TouchableOpacity>
              <Text style={styles.seeAll}>Xem tất cả</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.miniAppsContainer}>
            {renderMiniApp('calendar', 'Lịch')}
            {renderMiniApp('cloud', 'Cloud')}
            {renderMiniApp('newspaper', 'Báo')}
            {renderMiniApp('game-controller', 'Game')}
            {renderMiniApp('cart', 'Mua sắm')}
            {renderMiniApp('restaurant', 'Đặt đồ ăn')}
            {renderMiniApp('car', 'Đặt xe')}
            {renderMiniApp('ellipsis-horizontal', 'Xem thêm')}
          </View>
        </View>

        {/* News Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Tin tức</Text>
            <TouchableOpacity>
              <Text style={styles.seeAll}>Xem tất cả</Text>
            </TouchableOpacity>
          </View>
          {renderNewsItem(
            'Công nghệ mới: AI có thể thay thế con người trong tương lai?',
            'https://picsum.photos/300/200?random=1',
            '2 giờ trước'
          )}
          {renderNewsItem(
            'Xu hướng công nghệ 2024: Những điều cần biết',
            'https://picsum.photos/300/200?random=2',
            '4 giờ trước'
          )}
          {renderNewsItem(
            'Zalo ra mắt tính năng mới: Trải nghiệm người dùng được cải thiện',
            'https://picsum.photos/300/200?random=3',
            '6 giờ trước'
          )}
        </View>

        {/* Trending Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Đang thịnh hành</Text>
            <TouchableOpacity>
              <Text style={styles.seeAll}>Xem tất cả</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.trendingContainer}>
            {[1, 2, 3].map((item) => (
              <TouchableOpacity key={item} style={styles.trendingItem}>
                <Image 
                  source={{ uri: `https://picsum.photos/300/200?random=${item + 10}` }} 
                  style={styles.trendingImage} 
                />
                <View style={styles.trendingInfo}>
                  <Text style={styles.trendingTitle}>Trending #{item}</Text>
                  <Text style={styles.trendingStats}>1.2k lượt xem</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>

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
            name={activeTab === 'messages' ? "chatbubble" : "chatbubble-outline"} 
            size={24} 
            color={activeTab === 'messages' ? '#0068ff' : '#666'} 
          />
          <Text style={[styles.navText, activeTab === 'messages' && styles.activeNavText]}>Tin nhắn</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.navItem, activeTab === 'contacts' && styles.activeNavItem]} 
          onPress={() => {
            setActiveTab('contacts');
            navigation.navigate('Contacts');
          }}
        >
          <Ionicons 
            name={activeTab === 'contacts' ? "people" : "people-outline"} 
            size={24} 
            color={activeTab === 'contacts' ? '#0068ff' : '#666'} 
          />
          <Text style={[styles.navText, activeTab === 'contacts' && styles.activeNavText]}>Danh bạ</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.navItem, activeTab === 'discover' && styles.activeNavItem]} 
          onPress={() => {
            setActiveTab('discover');
            navigation.navigate('Discovery');
          }}
        >
          <MaterialIcons 
            name="grid-view" 
            size={24} 
            color={activeTab === 'discover' ? '#0068ff' : '#666'} 
          />
          <Text style={[styles.navText, activeTab === 'discover' && styles.activeNavText]}>Khám phá</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.navItem, activeTab === 'diary' && styles.activeNavItem]} 
          onPress={() => {
            setActiveTab('diary');
            navigation.navigate('Diary');
          }}
        >
          <FontAwesome 
            name="clock-o" 
            size={24} 
            color={activeTab === 'diary' ? '#0068ff' : '#666'} 
          />
          <Text style={[styles.navText, activeTab === 'diary' && styles.activeNavText]}>Nhật ký</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.navItem, activeTab === 'profile' && styles.activeNavItem]} 
          onPress={() => {
            setActiveTab('profile');
            navigation.navigate('Profile');
          }}
        >
          <FontAwesome 
            name="user-o" 
            size={24} 
            color={activeTab === 'profile' ? '#0068ff' : '#666'} 
          />
          <Text style={[styles.navText, activeTab === 'profile' && styles.activeNavText]}>Cá nhân</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#0068ff',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  content: {
    flex: 1,
  },
  section: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  seeAll: {
    color: '#0068ff',
    fontSize: 14,
  },
  miniAppsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  miniAppItem: {
    width: '23%',
    alignItems: 'center',
    marginBottom: 16,
  },
  miniAppIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#f0f8ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  miniAppName: {
    fontSize: 12,
    textAlign: 'center',
  },
  newsItem: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  newsImage: {
    width: 100,
    height: 70,
    borderRadius: 8,
  },
  newsContent: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  newsTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  newsTime: {
    fontSize: 12,
    color: '#666',
  },
  trendingContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  trendingItem: {
    width: '48%',
    marginBottom: 16,
  },
  trendingImage: {
    width: '100%',
    height: 120,
    borderRadius: 8,
  },
  trendingInfo: {
    marginTop: 8,
  },
  trendingTitle: {
    fontSize: 14,
    fontWeight: '500',
  },
  trendingStats: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingVertical: 8,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
  },
  activeNavItem: {
    borderTopWidth: 2,
    borderTopColor: '#0068ff',
  },
  navText: {
    fontSize: 12,
    marginTop: 4,
    color: '#666',
  },
  activeNavText: {
    color: '#0068ff',
  },
});

export default DiscoveryScreen; 
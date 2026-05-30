import React, { useState, useEffect } from 'react';
import {
  View, ScrollView, Text, TouchableOpacity, FlatList, Image,
  RefreshControl, ActivityIndicator, TextInput, Alert
} from 'react-native';
import {
  getMarketplaceListings, likeMarketplacePost, toggleSoldStatus, getUser, getMediaUrl
} from '../../services/api';
import { ScreenBackground } from '../../components';
import { Colors } from '../../theme';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { SF, SH, SW } from '../../utils/responsive';

const CATEGORIES = ['All', 'For Sale', 'Wanted', 'Exchange', 'Free', 'My Listings'];

export default function MarketplaceFeed({ navigation }) {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchText, setSearchText] = useState('');
  const [currentUser, setCurrentUser] = useState(null);

  // Load current user
  useEffect(() => {
    const loadUser = async () => {
      try {
        const user = await getUser();
        setCurrentUser(user);
      } catch (err) {
        console.error('Error loading user:', err.message);
      }
    };
    loadUser();
  }, []);

  // Load listings
  useEffect(() => {
    loadListings();
  }, [selectedCategory]);

  const loadListings = async () => {
    try {
      setLoading(true);
      const category = selectedCategory === 'All' ? null : selectedCategory !== 'My Listings' ? selectedCategory : null;
      const response = await getMarketplaceListings(category);
      
      let data = response.data?.data || [];
      
      // Filter by "My Listings" or exclude user's own listings
      if (selectedCategory === 'My Listings') {
        data = data.filter(item => currentUser?.id === item.author_id);
      } else {
        data = data.filter(item => currentUser?.id !== item.author_id);
      }
      
      // Filter by search text (title or description)
      if (searchText) {
        const query = searchText.toLowerCase();
        data = data.filter(item =>
          item.title?.toLowerCase().includes(query) ||
          item.description?.toLowerCase().includes(query)
        );
      }
      
      setListings(data);
    } catch (err) {
      console.error('Error loading marketplace listings:', err.message);
      Alert.alert('Error', 'Failed to load marketplace listings');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadListings();
    setRefreshing(false);
  };

  const handleLike = async (listingId) => {
    try {
      await likeMarketplacePost(listingId);
      
      // Update UI: toggle like status
      setListings(listings.map(item => {
        if (item.id === listingId) {
          return {
            ...item,
            is_liked: !item.is_liked,
            likes_count: item.is_liked ? (item.likes_count || 1) - 1 : (item.likes_count || 0) + 1
          };
        }
        return item;
      }));
    } catch (err) {
      console.error('Error liking post:', err.message);
      Alert.alert('Error', 'Failed to like this listing');
    }
  };

  const handleToggleSold = async (listingId) => {
    try {
      await toggleSoldStatus(listingId);
      
      // Update UI: toggle sold status
      setListings(listings.map(item => {
        if (item.id === listingId) {
          return { ...item, is_sold: !item.is_sold };
        }
        return item;
      }));
      
      Alert.alert('Success', 'Listing status updated');
    } catch (err) {
      console.error('Error toggling sold status:', err.message);
      Alert.alert('Error', 'Failed to update listing status');
    }
  };

  const formatTime = (createdAt) => {
    if (!createdAt) return '';
    const date = new Date(createdAt);
    const now = new Date();
    const diff = now - date;
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    
    return date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
  };

  const formatPrice = (price, negotiable) => {
    if (price === 0 || price === '0') return 'Free';
    if (negotiable) return `₹${Number(price).toLocaleString('en-IN')} (Negotiable)`;
    return `₹${Number(price).toLocaleString('en-IN')}`;
  };

  // Listing Card Component
  const ListingCard = ({ item }) => {
    const isOwner = currentUser?.id === item.author_id;
    
    return (
      <TouchableOpacity
        onPress={() => navigation.navigate('MarketplaceDetail', { id: item.id })}
        activeOpacity={0.8}
        style={{
            backgroundColor: Colors.cardGlass,
            borderRadius: SW(18),
          marginHorizontal: SW(10),
          marginVertical: SH(10),
          overflow: 'hidden',
          elevation: 3,
          shadowColor: '#0B4EA2',
          shadowOpacity: 0.12,
          shadowRadius: 6,
          shadowOffset: { width: 0, height: 3 }
        }}
      >
        {/* Image Container */}
        <View style={{ position: 'relative', height: 220, backgroundColor: '#f0f0f0', overflow: 'hidden' }}>
          {item.media_urls && item.media_urls.length > 0 ? (
            <Image
              source={{ uri: item.media_urls[0] }}
              style={{ width: '100%', height: '100%' }}
              resizeMode="cover"
              onError={async () => {
                console.warn(`⚠️ [MarketplaceFeed] Image load failed for listing ${item.id}`);
                if (item.media && item.media.length > 0) {
                  try {
                    const res = await getMediaUrl(item.media[0]);
                    if (res.data?.data?.url) {
                      console.log(`✅ [MarketplaceFeed] URL refreshed`);
                    }
                  } catch (err) {
                    console.warn(`⚠️ [MarketplaceFeed] Refresh failed:`, err.message);
                  }
                }
              }}
              onLoad={() => console.log(`✅ [MarketplaceFeed] Image loaded for listing ${item.id}`)}
            />
          ) : (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0f0f0' }}>
              <MaterialCommunityIcons name="image-outline" size={48} color="#999" />
              <Text style={{ fontSize: 12, color: '#999', marginTop: 8 }}>No image</Text>
            </View>
          )}

          {/* Status Badges */}
          <View style={{ position: 'absolute', top: 10, left: 10, right: 10, flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
            {item.is_pinned && (
              <View style={{ backgroundColor: '#FFD700', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <MaterialCommunityIcons name="pin" size={12} color="#333" />
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#333' }}>PINNED</Text>
              </View>
            )}
            {item.is_sold && (
              <View style={{ backgroundColor: '#e74c3c', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 6 }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#fff' }}>SOLD</Text>
              </View>
            )}
            {Number(item.price) === 0 && !item.is_sold && (
              <View style={{ backgroundColor: '#27ae60', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 6 }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#fff' }}>FREE</Text>
              </View>
            )}
          </View>

          {/* Image Count Badge */}
          {item.media_urls && item.media_urls.length > 1 && (
            <View style={{ position: 'absolute', bottom: 10, right: 10, backgroundColor: 'rgba(0, 0, 0, 0.7)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <MaterialCommunityIcons name="camera-outline" size={13} color="#fff" />
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#fff' }}>{item.media_urls.length}</Text>
            </View>
          )}
        </View>

        {/* Content Section */}
        <View style={{ padding: 16 }}>
          {/* Title */}
          <Text 
            style={{ fontSize: 15, fontWeight: '600', color: '#333', marginBottom: 8, lineHeight: 22 }} 
            numberOfLines={2}
          >
            {item.title}
          </Text>

          {/* Category & Price Row */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, gap: 10 }}>
            <View style={{ backgroundColor: '#EAF3FF', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, flex: 0.4 }}>
              <Text style={{ fontSize: 12, fontWeight: '500', color: '#007BFF', textAlign: 'center' }}>
                {item.category}
              </Text>
            </View>
            <Text style={{ fontSize: 17, fontWeight: '700', color: '#39B54A', flex: 0.6 }}>
              {formatPrice(item.price, item.price_negotiable)}
            </Text>
          </View>

          {/* Author & Time */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, paddingBottom: 12, borderBottomWidth: 1.5, borderBottomColor: '#ecf0f1' }}>
            <View>
              <Text style={{ fontSize: 13, fontWeight: '500', color: '#444' }}>
                {item.author_name || 'Anonymous'}
                {item.author_flat_no ? ` - Flat ${item.author_flat_no}` : ''}
              </Text>
              <Text style={{ fontSize: 12, color: '#999', marginTop: 2 }}>
                {formatTime(item.created_at)}
              </Text>
            </View>
            {!item.is_sold && (
              <TouchableOpacity
                onPress={() => handleLike(item.id)}
                style={{ paddingVertical: 8, paddingHorizontal: 12, backgroundColor: item.is_liked ? '#ffe5e5' : '#f0f0f0', borderRadius: 6 }}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons name={item.is_liked ? 'heart' : 'heart-outline'} size={20} color={item.is_liked ? '#e74c3c' : '#666'} />
              </TouchableOpacity>
            )}
          </View>

          {/* Action Buttons */}
          <View style={{ flexDirection: 'row', gap: 12 }}>
            {!isOwner && !item.is_sold && (
              <>
                <TouchableOpacity 
                  onPress={() => navigation.navigate('MarketplaceDetail', { id: item.id })}
                  style={{ flex: 1, backgroundColor: '#007BFF', paddingVertical: 12, borderRadius: 10, justifyContent: 'center', alignItems: 'center' }}
                  activeOpacity={0.7}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}><MaterialCommunityIcons name="phone-outline" size={14} color="#fff" /><Text style={{ fontSize: 14, fontWeight: '600', color: '#fff' }}>Call</Text></View>
                </TouchableOpacity>
                <TouchableOpacity 
                  onPress={() => navigation.navigate('MarketplaceDetail', { id: item.id })}
                  style={{ flex: 1, backgroundColor: '#39B54A', paddingVertical: 12, borderRadius: 10, justifyContent: 'center', alignItems: 'center' }}
                  activeOpacity={0.7}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}><MaterialCommunityIcons name="chat-outline" size={14} color="#fff" /><Text style={{ fontSize: 14, fontWeight: '600', color: '#fff' }}>Chat</Text></View>
                </TouchableOpacity>
              </>
            )}

            {isOwner && (
              <TouchableOpacity
                onPress={() => handleToggleSold(item.id)}
                style={{ flex: 1, backgroundColor: item.is_sold ? '#39B54A' : '#E53935', paddingVertical: 12, borderRadius: 10, justifyContent: 'center', alignItems: 'center' }}
                activeOpacity={0.7}
              >
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#fff' }}>
                  {item.is_sold ? '✓ Sold' : 'Mark Sold'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <ScreenBackground>
    <View style={{ flex: 1, backgroundColor: 'transparent' }}>
      {/* Header */}
      <View style={{
        backgroundColor: '#0B4EA2',
        paddingTop: SH(14),
        paddingBottom: SH(10),
        borderBottomWidth: 0,
        borderBottomColor: 'transparent',
        elevation: 2,
        zIndex: 10
      }}>
        <View style={{
          flexDirection: 'row', justifyContent: 'space-between',
          alignItems: 'center', paddingHorizontal: 14, marginBottom: 10
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <MaterialCommunityIcons name="cart-outline" size={26} color="#fff" />
            <Text style={{ fontSize: 22, fontWeight: '600', color: '#fff' }}>Marketplace</Text>
          </View>
          <TouchableOpacity
            onPress={() => navigation.navigate('NewListing')}
            style={{
              backgroundColor: '#fff',
              width: 44, height: 44,
              borderRadius: SW(22),
              justifyContent: 'center',
              alignItems: 'center'
            }}
          >
            <MaterialCommunityIcons name="plus" size={22} color="#0B4EA2" />
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View style={{
          flexDirection: 'row', alignItems: 'center',
          backgroundColor: '#EAF3FF', borderRadius: 12,
          marginHorizontal: 14, paddingHorizontal: 12, paddingVertical: 2
        }}>
          <MaterialCommunityIcons name="magnify" size={16} color="#666" style={{ marginRight: 4 }} />
          <TextInput
            placeholder="Search listings..."
            value={searchText}
            onChangeText={(text) => {
              setSearchText(text);
            }}
            style={{
              flex: 1, paddingVertical: 10, paddingHorizontal: 12,
              fontSize: 14, color: '#333'
            }}
            placeholderTextColor="#999"
          />
        </View>
      </View>

      {/* Category Tabs - Sticky at top */}
      <View
        style={{
          backgroundColor: '#fff',
          paddingHorizontal: SW(10),
          borderBottomWidth: 2,
          borderBottomColor: 'rgba(11,78,162,0.12)',
          elevation: 5,
          zIndex: 9
        }}
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          scrollEventThrottle={16}
        >
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat}
              onPress={() => {
                setSelectedCategory(cat);
                setSearchText('');
              }}
              style={{
                paddingVertical: SH(12),
                paddingHorizontal: SW(16),
                borderBottomWidth: selectedCategory === cat ? 3 : 0,
                borderBottomColor: selectedCategory === cat ? '#39B54A' : 'transparent'
              }}
            >
              <Text
                style={{
                  fontSize: SF(15),
                  fontWeight: selectedCategory === cat ? '700' : '600',
                  color: selectedCategory === cat ? '#007BFF' : '#666',
                  whiteSpace: 'nowrap'
                }}
              >
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Listings List */}
      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#007BFF" />
        </View>
      ) : listings.length === 0 ? (
        <View style={{
          flex: 1, justifyContent: 'center', alignItems: 'center',
          paddingHorizontal: SW(24)
        }}>
          <MaterialCommunityIcons name="inbox-outline" size={48} color="#ccc" style={{ marginBottom: 16 }} />
          <Text style={{
            fontSize: 16, fontWeight: '700', color: '#666',
            textAlign: 'center', marginBottom: 8
          }}>
            No listings found
          </Text>
          <Text style={{
            fontSize: 14, color: '#999', textAlign: 'center'
          }}>
            Try a different category or search term
          </Text>
        </View>
      ) : (
        <FlatList
          data={listings}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => <ListingCard item={item} />}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#007BFF']}
            />
          }
          contentContainerStyle={{ paddingVertical: 10, paddingBottom: 20 }}
          scrollEnabled={true}
        />
      )}
    </View>
    </ScreenBackground>
  );
}

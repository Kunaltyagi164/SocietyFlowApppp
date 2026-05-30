import React, { useState, useEffect } from 'react';
import {
  View, ScrollView, Text, TouchableOpacity, Image, Alert,
  ActivityIndicator, TextInput, FlatList, Linking, Share
} from 'react-native';
import {
  getMarketplaceDetail, postMarketplaceComment, getUser,
  adminDeleteListing, toggleSoldStatus, adminDeleteMarketplaceComment, getMediaUrl
} from '../../services/api';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { SF, SH, SW } from '../../utils/responsive';

export default function MarketplaceDetail({ route, navigation }) {
  const { id } = route.params;
  
  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [postingComment, setPostingComment] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    loadDetail();
    loadUser();
  }, []);

  const loadDetail = async () => {
    try {
      const response = await getMarketplaceDetail(id);
      setListing(response.data?.data);
      setComments(response.data?.data?.comments || []);
    } catch (err) {
      console.error('Error loading listing detail:', err.message);
      Alert.alert('Error', 'Failed to load listing details');
    } finally {
      setLoading(false);
    }
  };

  const loadUser = async () => {
    try {
      const user = await getUser();
      setCurrentUser(user);
    } catch (err) {
      console.error('Error loading user:', err.message);
    }
  };

  const handlePostComment = async () => {
    if (!newComment.trim()) return;

    try {
      setPostingComment(true);
      await postMarketplaceComment(id, newComment.trim());
      
      setNewComment('');
      Alert.alert('Success', 'Comment posted successfully');
      
      // Reload comments
      await loadDetail();
    } catch (err) {
      console.error('Error posting comment:', err.message);
      Alert.alert('Error', 'Failed to post comment');
    } finally {
      setPostingComment(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    Alert.alert(
      'Delete Comment',
      'Are you sure you want to delete this comment?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await adminDeleteMarketplaceComment(commentId);
              Alert.alert('Success', 'Comment deleted');
              await loadDetail();
            } catch (err) {
              console.error('Error deleting comment:', err.message);
              Alert.alert('Error', 'Failed to delete comment');
            }
          }
        }
      ]
    );
  };

  const handleDeleteListing = async () => {
    Alert.alert(
      'Delete Listing',
      'Are you sure you want to delete this listing? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await adminDeleteListing(id);
              Alert.alert('Success', 'Listing deleted');
              navigation.goBack();
            } catch (err) {
              console.error('Error deleting listing:', err.message);
              Alert.alert('Error', 'Failed to delete listing');
            }
          }
        }
      ]
    );
  };

  const handleCallSeller = async () => {
    if (!listing?.author_phone) {
      Alert.alert('Info', 'Seller phone number not available');
      return;
    }
    try {
      const phoneNumber = listing.author_phone.replace(/[^0-9+]/g, '');
      const telUrl = `tel:${phoneNumber}`;
      const canOpen = await Linking.canOpenURL(telUrl);
      if (canOpen) {
        await Linking.openURL(telUrl);
      } else {
        Alert.alert('Error', 'Cannot open phone dialer');
      }
    } catch (err) {
      console.error('Error calling:', err.message);
      Alert.alert('Error', 'Failed to open phone dialer');
    }
  };

  const handleWhatsApp = async () => {
    if (!listing?.author_phone) {
      Alert.alert('Info', 'Seller phone number not available');
      return;
    }
    try {
      const phoneNumber = listing.author_phone.replace(/[^0-9+]/g, '');
      const message = `Hi, I'm interested in your listing: "${listing.title}"`;
      const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
      const canOpen = await Linking.canOpenURL('whatsapp://send');
      if (canOpen) {
        await Linking.openURL(whatsappUrl);
      } else {
        Alert.alert('Error', 'WhatsApp is not installed. Please install WhatsApp first.');
      }
    } catch (err) {
      console.error('Error opening WhatsApp:', err.message);
      Alert.alert('Error', 'Failed to open WhatsApp');
    }
  };

  const handleShare = () => {
    if (!listing) return;
    
    Share.share({
      message: `Check out this ${listing.category} listing on SocietyFlow: "${listing.title}" - ${formatPrice(listing.price, listing.price_negotiable)}`,
      title: listing.title,
      url: `societyflow://marketplace/${listing.id}`
    }).catch(err => console.error('Error sharing:', err.message));
  };

  const formatPrice = (price, negotiable) => {
    if (price === 0 || price === '0') return 'Free';
    if (negotiable) return `₹${Number(price).toLocaleString('en-IN')} (Negotiable)`;
    return `₹${Number(price).toLocaleString('en-IN')}`;
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

  const isOwner = currentUser?.id === listing?.author_id;

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
        <ActivityIndicator size="large" color="#3498db" />
      </View>
    );
  }

  if (!listing) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
        <MaterialCommunityIcons name="alert-circle-outline" size={48} color="#e74c3c" style={{ marginBottom: 16 }} />
        <Text style={{ fontSize: 16, color: '#666' }}>Listing not found</Text>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={{ marginTop: 20, paddingVertical: 10, paddingHorizontal: 20, backgroundColor: '#3498db', borderRadius: 8 }}
        >
          <Text style={{ color: '#fff' }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const images = listing.media_urls || listing.media || [];

  return (
    <View style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
      {/* Header with back button */}
      <View style={{
        backgroundColor: '#fff',
        paddingVertical: SH(12),
        paddingHorizontal: SW(12),
        flexDirection: 'row',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#ecf0f1'
      }}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={{ paddingVertical: 8, paddingHorizontal: 4 }}
        >
          <MaterialCommunityIcons name="arrow-left" size={20} color="#333" />
        </TouchableOpacity>
        <Text style={{ flex: 1, fontSize: 18, fontWeight: '600', color: '#333', marginLeft: 8 }}>
          Listing Details
        </Text>
        <TouchableOpacity onPress={handleShare} style={{ paddingVertical: 8, paddingHorizontal: 4 }}>
          <MaterialCommunityIcons name="share-variant-outline" size={18} color="#333" />
        </TouchableOpacity>
      </View>

      <ScrollView style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
        {/* Image Carousel */}
        {images.length > 0 && (
          <View style={{
            height: SH(300),
            backgroundColor: '#f0f0f0',
            position: 'relative',
            marginBottom: SH(12)
          }}>
            <Image
              source={{ uri: listing.media_urls ? listing.media_urls[currentImageIndex] : listing.media ? listing.media[currentImageIndex] : null }}
              style={{ width: '100%', height: '100%' }}
              resizeMode="cover"
              onError={async () => {
                console.warn(`⚠️ [MarketplaceDetail] Image failed to load at index ${currentImageIndex}`);
                if (listing.media && listing.media[currentImageIndex]) {
                  try {
                    console.log(`🔄 [MarketplaceDetail] Refreshing URL for media key: ${listing.media[currentImageIndex]}`);
                    const res = await getMediaUrl(listing.media[currentImageIndex]);
                    if (res.data?.data?.url) {
                      console.log(`✅ [MarketplaceDetail] Successfully refreshed URL`);
                    }
                  } catch (err) {
                    console.warn(`⚠️ [MarketplaceDetail] Failed to refresh URL:`, err.message);
                  }
                }
              }}
              onLoad={() => {
                console.log(`✅ [MarketplaceDetail] Image ${currentImageIndex + 1}/${images.length} loaded`);
              }}
            />

            {/* Status Badges - Top Left & Right */}
            <View style={{ position: 'absolute', top: 12, left: 12, right: 12, flexDirection: 'row', justifyContent: 'space-between' }}>
              {listing.is_sold && (
                <View style={{ backgroundColor: '#e74c3c', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 }}>
                  <Text style={{ fontSize: 12, fontWeight: '600', color: '#fff' }}>SOLD</Text>
                </View>
              )}
              {listing.is_pinned && (
                <View style={{ marginLeft: 'auto', backgroundColor: '#FFD700', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <MaterialCommunityIcons name="pin" size={12} color="#333" />
                  <Text style={{ fontSize: 12, fontWeight: '600', color: '#333' }}>PINNED</Text>
                </View>
              )}
            </View>

            {/* Image Count & Indicators - Bottom Center */}
            {images.length > 1 && (
              <View style={{ position: 'absolute', bottom: 12, alignSelf: 'center', alignItems: 'center', gap: 8 }}>
                <Text style={{ fontSize: 12, fontWeight: '600', color: '#fff', backgroundColor: 'rgba(0, 0, 0, 0.6)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 }}>
                  {currentImageIndex + 1} / {images.length}
                </Text>
                <View style={{ flexDirection: 'row', gap: 6, backgroundColor: 'rgba(0, 0, 0, 0.5)', paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8 }}>
                  {images.map((_, idx) => (
                    <TouchableOpacity
                      key={idx}
                      onPress={() => setCurrentImageIndex(idx)}
                      style={{
                        width: 8, height: 8, borderRadius: 4,
                        backgroundColor: idx === currentImageIndex ? '#fff' : 'rgba(255,255,255,0.5)'
                      }}
                    />
                  ))}
                </View>
              </View>
            )}
          </View>
        )}

        {/* Title & Price Section */}
        <View style={{ backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 16, marginBottom: 8, borderBottomWidth: 1, borderBottomColor: '#ecf0f1' }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
            <Text style={{ fontSize: 22, fontWeight: '800', color: '#333', flex: 1, marginRight: 12 }}>
              {listing.title}
            </Text>
            <View style={{ backgroundColor: '#e8f4f8', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, minWidth: 70 }}>
              <Text style={{ fontSize: 11, fontWeight: '600', color: '#0c7bb8', textAlign: 'center' }}>
                {listing.category}
              </Text>
            </View>
          </View>

          <Text style={{ fontSize: 26, fontWeight: '800', color: '#27ae60' }}>
            {formatPrice(listing.price, listing.price_negotiable)}
          </Text>
        </View>

        {/* Author Info & Stats */}
        <View style={{ backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 14, marginBottom: 8, borderBottomWidth: 1, borderBottomColor: '#ecf0f1' }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13, fontWeight: '500', color: '#555', marginBottom: 4 }}>
                Posted by <Text style={{ fontWeight: '700', color: '#333' }}>{listing.author_name || 'Anonymous'}</Text>
              </Text>
              <Text style={{ fontSize: 12, color: '#999' }}>
                {formatTime(listing.created_at)}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ backgroundColor: '#ffe5e5', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, alignItems: 'center', minWidth: 65 }}>
                <MaterialCommunityIcons name="heart-outline" size={14} color="#e74c3c" style={{ marginBottom: 2 }} />
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#e74c3c' }}>
                  {listing.likes_count || 0}
                </Text>
              </View>
              <View style={{ backgroundColor: '#e8f4f8', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, alignItems: 'center', minWidth: 65 }}>
                <MaterialCommunityIcons name="chat-outline" size={14} color="#0c7bb8" style={{ marginBottom: 2 }} />
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#0c7bb8' }}>
                  {comments.length}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Description */}
        {listing.description && (
          <View style={{ backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 14, marginBottom: 8, borderBottomWidth: 1, borderBottomColor: '#ecf0f1' }}>
            <Text style={{ fontSize: 13, fontWeight: '500', color: '#666', lineHeight: 20 }}>
              {listing.description}
            </Text>
          </View>
        )}

        {/* Action Buttons */}
        {!isOwner && !listing.is_sold && (
          <View style={{ backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 14, marginBottom: 8, flexDirection: 'row', gap: 12, borderBottomWidth: 1, borderBottomColor: '#ecf0f1' }}>
            <TouchableOpacity
              onPress={handleCallSeller}
              style={{ flex: 1, backgroundColor: '#3498db', paddingVertical: 14, borderRadius: 8, justifyContent: 'center', alignItems: 'center' }}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons name="phone-outline" size={16} color="#fff" />
              <Text style={{ fontSize: 12, fontWeight: '600', color: '#fff', marginTop: 4 }}>Call</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleWhatsApp}
              style={{ flex: 1, backgroundColor: '#27ae60', paddingVertical: 14, borderRadius: 8, justifyContent: 'center', alignItems: 'center' }}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons name="whatsapp" size={16} color="#fff" />
              <Text style={{ fontSize: 12, fontWeight: '600', color: '#fff', marginTop: 4 }}>WhatsApp</Text>
            </TouchableOpacity>
          </View>
        )}

        {isOwner && (
          <View style={{ backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 12, marginBottom: 8, flexDirection: 'row', gap: 12, borderBottomWidth: 1, borderBottomColor: '#ecf0f1' }}>
            <TouchableOpacity
              style={{ flex: 1, backgroundColor: listing.is_sold ? '#27ae60' : '#e74c3c', paddingVertical: 12, borderRadius: 8, justifyContent: 'center', alignItems: 'center' }}
              onPress={async () => {
                try {
                  await toggleSoldStatus(id);
                  Alert.alert('Success', 'Listing status updated');
                  await loadDetail();
                } catch (err) {
                  console.error('Error toggling sold:', err.message);
                  Alert.alert('Error', 'Failed to update listing');
                }
              }}
            >
              <Text style={{ fontSize: 13, fontWeight: '600', color: '#fff' }}>
                {listing.is_sold ? '✓ Mark as Unsold' : 'Mark as Sold'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => handleDeleteListing()}
              style={{ flex: 1, backgroundColor: '#e74c3c', paddingVertical: 12, borderRadius: 8, justifyContent: 'center', alignItems: 'center' }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}><MaterialCommunityIcons name="delete-outline" size={14} color="#fff" /><Text style={{ fontSize: 13, fontWeight: '600', color: '#fff' }}>Delete</Text></View>
            </TouchableOpacity>
          </View>
        )}

        {/* Comments Section */}
        <View style={{ backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 14 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 14 }}>
            <MaterialCommunityIcons name="chat-outline" size={16} color="#333" />
            <Text style={{ fontSize: 16, fontWeight: '700', color: '#333' }}>Comments ({comments.length})</Text>
          </View>

          {/* Comment Input */}
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: '#ecf0f1' }}>
            <TextInput
              placeholder="Add a comment..."
              value={newComment}
              onChangeText={setNewComment}
              style={{
                flex: 1,
                borderWidth: 1, borderColor: '#ecf0f1',
                borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10,
                fontSize: 13, color: '#333', minHeight: 44
              }}
              placeholderTextColor="#999"
              multiline
              maxHeight={100}
            />
            <TouchableOpacity
              onPress={handlePostComment}
              disabled={!newComment.trim() || postingComment}
              style={{
                backgroundColor: newComment.trim() && !postingComment ? '#3498db' : '#ccc',
                borderRadius: SW(8),
                paddingHorizontal: SW(12),
                justifyContent: 'center',
                alignItems: 'center'
              }}
            >
              {postingComment ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <MaterialCommunityIcons name="send-outline" size={18} color="#fff" />
              )}
            </TouchableOpacity>
          </View>

          {/* Comments List */}
          {comments.length === 0 ? (
            <View style={{ paddingVertical: 24, alignItems: 'center' }}>
              <MaterialCommunityIcons name="comment-question-outline" size={32} color="#ccc" style={{ marginBottom: 8 }} />
              <Text style={{ fontSize: 13, color: '#999' }}>No comments yet. Be the first!</Text>
            </View>
          ) : (
            <FlatList
              data={comments}
              keyExtractor={(item) => item.id.toString()}
              scrollEnabled={false}
              renderItem={({ item }) => (
                <View style={{ marginBottom: 14, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: '#ecf0f1' }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: '#333' }}>
                      {item.author_name || 'Anonymous'}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={{ fontSize: 12, color: '#999' }}>
                        {formatTime(item.created_at)}
                      </Text>
                      {(isOwner || currentUser?.id === item.author_id) && (
                        <TouchableOpacity
                          onPress={() => handleDeleteComment(item.id)}
                          style={{ paddingVertical: 4, paddingHorizontal: 6 }}
                        >
                          <MaterialCommunityIcons name="delete-outline" size={16} color="#e74c3c" />
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                  <Text style={{ fontSize: 13, color: '#555', lineHeight: 20 }}>
                    {item.content}
                  </Text>
                </View>
              )}
            />
          )}
        </View>

        {/* Bottom Padding */}
        <View style={{ height: 20 }} />
      </ScrollView>
    </View>
  );
}

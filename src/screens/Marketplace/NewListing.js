import React, { useState, useRef, useEffect } from 'react';
import {
  View, ScrollView, Text, TouchableOpacity, TextInput, Alert,
  ActivityIndicator, Image, Modal, FlatList, Permissions
} from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import { createListing, getUser } from '../../services/api';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import RNFS from '../../utils/safeRNFS';
import { SF, SH, SW } from '../../utils/responsive';

const CATEGORIES = ['For Sale', 'Wanted', 'Exchange', 'Free'];

export default function NewListing({ navigation }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('For Sale');
  const [price, setPrice] = useState('');
  const [priceNegotiable, setPriceNegotiable] = useState(false);
  const [media, setMedia] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [showCategoryModal, setShowCategoryModal] = useState(false);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const user = await getUser();
      setCurrentUser(user);
    } catch (err) {
      console.error('Error loading user:', err.message);
    }
  };

  const handlePickImage = (useCamera = false) => {
    // Check if we already have 4 images
    if (media.length >= 4) {
      Alert.alert('Limit Reached', 'You can upload a maximum of 4 images');
      return;
    }

    const options = {
      mediaType: 'photo',
      includeBase64: true,
      maxWidth: SW(800),
      maxHeight: SH(800),
      quality: 0.8,
      selectionLimit: 1
    };

    launchImageLibrary(options, (response) => {
      try {
        console.log('📸 Image picker response:', {
          didCancel: response.didCancel,
          errorCode: response.errorCode,
          errorMessage: response.errorMessage,
          assetsLength: response.assets?.length
        });

        if (response.didCancel) {
          console.log('Image picker cancelled');
          return;
        }
        if (response.errorCode) {
          console.error('Image picker error:', response.errorCode, response.errorMessage);
          Alert.alert('Error', `Failed to pick image: ${response.errorMessage}`);
          return;
        }
        
        const asset = response.assets?.[0];
        console.log('Selected image:', {
          fileName: asset?.fileName,
          type: asset?.type,
          hasBase64: !!asset?.base64,
          base64Length: asset?.base64?.length || 0
        });
        
        if (asset && asset.base64) {
          const newImage = {
            uri: `data:${asset.type || 'image/jpeg'};base64,${asset.base64}`,
            type: asset.type,
            name: asset.fileName || `image_${Date.now()}.jpg`
          };
          console.log('✅ Adding image to media:', newImage.name);
          setMedia(prev => [...prev, newImage]);
          Alert.alert('Success', `Image added (${media.length + 1}/4)`);
        } else {
          console.error('❌ No base64 data in asset:', asset);
          Alert.alert('Error', 'Failed to encode image. Please try again.');
        }
      } catch (err) {
        console.error('Error in handlePickImage:', err.message);
        Alert.alert('Error', 'Failed to process image: ' + err.message);
      }
    });
  };

  const handleRemoveImage = (index) => {
    setMedia(media.filter((_, i) => i !== index));
  };

  const handleCreateListing = async () => {
    // Validation
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a title');
      return;
    }

    if (!description.trim()) {
      Alert.alert('Error', 'Please enter a description');
      return;
    }

    if (!category) {
      Alert.alert('Error', 'Please select a category');
      return;
    }

    // Price validation (0 is allowed for Free category)
    if ((category !== 'Free' && price === '') || (category === 'Free' && !price)) {
      Alert.alert('Error', 'Please enter a price (use 0 for Free)');
      return;
    }

    if (media.length === 0) {
      Alert.alert('Error', 'Please add at least one image');
      return;
    }

    try {
      setUploading(true);

      const listingData = {
        title: title.trim(),
        description: description.trim(),
        category,
        price: Number(price) || 0,
        price_negotiable: category !== 'Free' && priceNegotiable,
        media: media.map(m => m.uri), // Send base64 strings
        author_name: currentUser?.name,
        author_phone: currentUser?.phone
      };

      console.log('📝 Creating listing:', {
        title: listingData.title,
        category: listingData.category,
        price: listingData.price,
        mediaCount: listingData.media.length,
        dataSizes: listingData.media.map((m, i) => `Image${i + 1}: ${(m.length / 1024 / 1024).toFixed(2)}MB`)
      });

      const response = await createListing(listingData);
      console.log('📤 Listing API Response:', {
        success: response.data?.success,
        message: response.data?.message,
        status: response.status
      });

      if (response.data?.success) {
        Alert.alert('✅ Success', 'Listing created successfully!');
        navigation.goBack();
      } else {
        Alert.alert('❌ Error', response.data?.message || 'Failed to create listing');
      }
    } catch (err) {
      console.error('❌ Error creating listing:', err.message);
      console.error('Response data:', err.response?.data);
      Alert.alert('❌ Error', err.response?.data?.message || 'Failed to create listing: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
      {/* Header */}
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
          Create New Listing
        </Text>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 20 }}>
        {/* Media Upload Section */}
        <View style={{
          backgroundColor: '#fff',
          marginTop: SH(8),
          paddingHorizontal: SW(16),
          paddingVertical: SH(16),
          borderBottomWidth: 1,
          borderBottomColor: '#ecf0f1'
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <MaterialCommunityIcons name="camera-outline" size={14} color="#333" />
            <Text style={{ fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 12 }}>
              Photos ({media.length}/4)
            </Text>
          </View>

          {media.length > 0 && (
            <FlatList
              data={media}
              keyExtractor={(_, idx) => idx.toString()}
              horizontal
              showsHorizontalScrollIndicator={false}
              scrollEnabled={false}
              renderItem={({ item, index }) => (
                <View style={{ marginRight: 12, marginBottom: 12, position: 'relative' }}>
                  <Image
                    source={{ uri: item.uri }}
                    style={{
                      width: 100, height: 100,
                      borderRadius: SW(8),
                      backgroundColor: '#f0f0f0'
                    }}
                  />
                  <TouchableOpacity
                    onPress={() => handleRemoveImage(index)}
                    style={{
                      position: 'absolute',
                      top: -8, right: -8,
                      backgroundColor: '#e74c3c', borderRadius: 14,
                      width: 28, height: 28,
                      justifyContent: 'center', alignItems: 'center'
                    }}
                  >
                    <MaterialCommunityIcons name="close" size={14} color="#fff" />
                  </TouchableOpacity>
                </View>
              )}
            />
          )}

          {media.length < 4 && (
            <TouchableOpacity
              onPress={() => handlePickImage(false)}
              style={{
                borderWidth: 2, borderColor: '#3498db', borderRadius: 8,
                paddingVertical: SH(32),
                justifyContent: 'center', alignItems: 'center',
                backgroundColor: '#f0f7ff'
              }}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons name="image-outline" size={32} color="#3498db" style={{ marginBottom: 8 }} />
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#3498db' }}>
                Add Photo
              </Text>
              <Text style={{ fontSize: 12, color: '#999', marginTop: 4 }}>
                Tap to select from gallery
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Title */}
        <View style={{
          backgroundColor: '#fff',
          marginTop: SH(8),
          paddingHorizontal: SW(16),
          paddingVertical: SH(16),
          borderBottomWidth: 1,
          borderBottomColor: '#ecf0f1'
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <MaterialCommunityIcons name="format-title" size={14} color="#333" />
            <Text style={{ fontSize: 14, fontWeight: '600', color: '#333' }}>Title</Text>
          </View>
          <TextInput
            placeholder="e.g., Brand new iPhone 15"
            value={title}
            onChangeText={setTitle}
            style={{
              borderWidth: 1, borderColor: '#ecf0f1',
              borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10,
              fontSize: 14, color: '#333'
            }}
            placeholderTextColor="#999"
            maxLength={100}
          />
          <Text style={{ fontSize: 11, color: '#999', marginTop: 4 }}>
            {title.length}/100
          </Text>
        </View>

        {/* Description */}
        <View style={{
          backgroundColor: '#fff',
          marginTop: SH(8),
          paddingHorizontal: SW(16),
          paddingVertical: SH(16),
          borderBottomWidth: 1,
          borderBottomColor: '#ecf0f1'
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <MaterialCommunityIcons name="text-box-outline" size={14} color="#333" />
            <Text style={{ fontSize: 14, fontWeight: '600', color: '#333' }}>Description</Text>
          </View>
          <TextInput
            placeholder="Describe your item in detail... condition, brand, any issues, etc."
            value={description}
            onChangeText={setDescription}
            style={{
              borderWidth: 1, borderColor: '#ecf0f1',
              borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10,
              fontSize: 14, color: '#333',
              minHeight: SH(100),
              textAlignVertical: 'top'
            }}
            placeholderTextColor="#999"
            multiline
            maxLength={500}
          />
          <Text style={{ fontSize: 11, color: '#999', marginTop: 4 }}>
            {description.length}/500
          </Text>
        </View>

        {/* Category */}
        <View style={{
          backgroundColor: '#fff',
          marginTop: SH(8),
          paddingHorizontal: SW(16),
          paddingVertical: SH(16),
          borderBottomWidth: 1,
          borderBottomColor: '#ecf0f1'
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <MaterialCommunityIcons name="tag-outline" size={14} color="#333" />
            <Text style={{ fontSize: 14, fontWeight: '600', color: '#333' }}>Category</Text>
          </View>
          <TouchableOpacity
            onPress={() => setShowCategoryModal(true)}
            style={{
              borderWidth: 1, borderColor: '#ecf0f1',
              borderRadius: 8, paddingHorizontal: 12, paddingVertical: 12,
              flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'
            }}
          >
            <Text style={{ fontSize: 14, color: '#333', fontWeight: '500' }}>
              {category}
            </Text>
            <MaterialCommunityIcons name="chevron-down" size={16} color="#999" />
          </TouchableOpacity>
        </View>

        {/* Price */}
        <View style={{
          backgroundColor: '#fff',
          marginTop: SH(8),
          paddingHorizontal: SW(16),
          paddingVertical: SH(16),
          borderBottomWidth: 1,
          borderBottomColor: '#ecf0f1'
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <MaterialCommunityIcons name="currency-inr" size={14} color="#333" />
            <Text style={{ fontSize: 14, fontWeight: '600', color: '#333' }}>Price</Text>
          </View>
          
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
            <View style={{ flex: 1 }}>
              <TextInput
                placeholder={category === 'Free' ? '0' : 'Enter price'}
                value={price}
                onChangeText={setPrice}
                keyboardType="number-pad"
                editable={category !== 'Free'}
                style={{
                  borderWidth: 1, borderColor: '#ecf0f1',
                  borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10,
                  fontSize: 14, color: '#333'
                }}
                placeholderTextColor="#999"
              />
              <Text style={{ fontSize: 11, color: '#999', marginTop: 4 }}>
                {category === 'Free' ? '(Free)' : '₹'}
              </Text>
            </View>
          </View>

          {category !== 'Free' && (
            <TouchableOpacity
              onPress={() => setPriceNegotiable(!priceNegotiable)}
              style={{
                flexDirection: 'row', alignItems: 'center',
                paddingVertical: 8, paddingHorizontal: 0
              }}
            >
              <View style={{
                width: 20, height: 20,
                borderWidth: 2, borderColor: '#3498db',
                borderRadius: SW(4),
                justifyContent: 'center', alignItems: 'center',
                marginRight: SW(8),
                backgroundColor: priceNegotiable ? '#3498db' : '#fff'
              }}>
                {priceNegotiable && (
                  <Text style={{ fontSize: 12, color: '#fff', fontWeight: 'bold' }}>✓</Text>
                )}
              </View>
              <Text style={{ fontSize: 14, color: '#333' }}>
                Price is negotiable
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {/* Submit Button */}
      <View style={{
        backgroundColor: '#fff',
        paddingHorizontal: SW(16),
        paddingVertical: SH(12),
        borderTopWidth: 1,
        borderTopColor: '#ecf0f1'
      }}>
        <TouchableOpacity
          onPress={handleCreateListing}
          disabled={uploading}
          style={{
            backgroundColor: uploading ? '#ccc' : '#3498db',
            paddingVertical: SH(12),
            borderRadius: SW(8),
            justifyContent: 'center',
            alignItems: 'center'
          }}
        >
          {uploading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={{ fontSize: 16, fontWeight: '600', color: '#fff' }}>
              Create Listing
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Category Modal */}
      <Modal
        visible={showCategoryModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCategoryModal(false)}
      >
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.5)',
          justifyContent: 'flex-end'
        }}>
          <View style={{
            backgroundColor: '#fff',
            borderTopLeftRadius: SW(16),
            borderTopRightRadius: SW(16),
            paddingTop: SH(16),
            paddingBottom: SH(24)
          }}>
            <Text style={{
              fontSize: 16, fontWeight: '600', color: '#333',
              paddingHorizontal: 16, marginBottom: 16
            }}>
              Select Category
            </Text>

            <FlatList
              data={CATEGORIES}
              scrollEnabled={false}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => {
                    setCategory(item);
                    if (item === 'Free') setPrice('0');
                    setShowCategoryModal(false);
                  }}
                  style={{
                    paddingHorizontal: SW(16),
                    paddingVertical: SH(14),
                    borderBottomWidth: 1,
                    borderBottomColor: '#ecf0f1',
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <Text style={{
                    fontSize: SF(14),
                    fontWeight: category === item ? '600' : '500',
                    color: category === item ? '#3498db' : '#333'
                  }}>
                    {item}
                  </Text>
                  {category === item && (
                    <Text style={{ fontSize: 16, color: '#3498db', fontWeight: 'bold' }}>✓</Text>
                  )}
                </TouchableOpacity>
              )}
              keyExtractor={(item) => item}
            />

            <TouchableOpacity
              onPress={() => setShowCategoryModal(false)}
              style={{
                marginHorizontal: SW(16),
                marginTop: SH(8),
                paddingVertical: SH(12),
                borderRadius: SW(8),
                borderWidth: SW(1),
                borderColor: '#ecf0f1',
                justifyContent: 'center',
                alignItems: 'center'
              }}
            >
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#333' }}>
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

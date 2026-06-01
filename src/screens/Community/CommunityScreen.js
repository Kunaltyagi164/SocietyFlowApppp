// src/screens/Community/CommunityScreen.js
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl, SafeAreaView, Alert, TextInput, Modal, ActivityIndicator, FlatList } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getCommunityPosts, createCommunityPost, likeCommunityPost, getPostComments, addCommentToPost } from '../../services/api';
import { useNotifications } from '../../navigation';
import { EmptyState, ScreenLoader, ScreenBackground } from '../../components';
import { Colors, Radius, Shadow } from '../../theme';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { SF, SH, SW } from '../../utils/responsive';

const POST_TYPES = {
  GENERAL: 'General',
  LOST_FOUND: 'Lost&Found',
  FOR_SALE: 'ForSale',
  EVENTS: 'Events',
  HELP: 'Help',
};

const POST_TYPE_INFO = {
  [POST_TYPES.GENERAL]: { label: 'General', color: '#3B82F6', iconName: 'chat-outline' },
  [POST_TYPES.LOST_FOUND]: { label: 'Lost & Found', color: '#8B5CF6', iconName: 'magnify' },
  [POST_TYPES.FOR_SALE]: { label: 'For Sale', color: '#10B981', iconName: 'cart-outline' },
  [POST_TYPES.EVENTS]: { label: 'Events', color: '#F59E0B', iconName: 'calendar-outline' },
  [POST_TYPES.HELP]: { label: 'Need Help', color: '#EF4444', iconName: 'hand-heart-outline' },
};

const fmtDate = (d) => { 
  try { 
    const date = new Date(d);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  } catch { 
    return ''; 
  } 
};

export default function CommunityScreen({ navigation }) {
  const { markAsRead, loadCounts } = useNotifications();
  const [posts, setPosts] = useState([]);
  const [unreadPostIds, setUnreadPostIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [newPostTitle, setNewPostTitle] = useState('');
  const [newPostContent, setNewPostContent] = useState('');
  const [postType, setPostType] = useState(POST_TYPES.GENERAL);
  const [showPostModal, setShowPostModal] = useState(false);
  const [posting, setPosting] = useState(false);
  const [liking, setLiking] = useState(null);
  const [selectedPost, setSelectedPost] = useState(null);
  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const [comments, setComments] = useState([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [postingComment, setPostingComment] = useState(false);

  // Load unread post IDs from AsyncStorage
  const loadUnreadPostIds = async () => {
    try {
      const stored = await AsyncStorage.getItem('community_unread_posts');
      const unread = stored ? JSON.parse(stored) : [];
      setUnreadPostIds(unread);
      console.log(`📖 [CommunityScreen] Loaded ${unread.length} unread posts`);
    } catch (err) {
      console.warn('[CommunityScreen] Failed to load unread posts:', err.message);
    }
  };

  // Mark a post as read
  const markPostAsRead = async (postId) => {
    try {
      const updated = unreadPostIds.filter(id => id !== postId);
      setUnreadPostIds(updated);
      await AsyncStorage.setItem('community_unread_posts', JSON.stringify(updated));
      console.log(`✅ [CommunityScreen] Post ${postId} marked as read`);
      // Refresh the community badge count
      await loadCounts();
    } catch (err) {
      console.warn('[CommunityScreen] Failed to mark as read:', err.message);
    }
  };

  // Mark all new posts as unread when they are fetched
  const markNewPostsAsUnread = async (fetchedPosts) => {
    try {
      const stored = await AsyncStorage.getItem('community_unread_posts');
      const currentUnread = stored ? JSON.parse(stored) : [];
      
      // Get IDs of currently fetched posts
      const fetchedIds = fetchedPosts.map(p => p.id);
      
      // Add any new post IDs not already in unread list
      const newUnread = [...new Set([...currentUnread, ...fetchedIds])];
      
      setUnreadPostIds(newUnread);
      await AsyncStorage.setItem('community_unread_posts', JSON.stringify(newUnread));
      console.log(`📍 [CommunityScreen] Marked ${newUnread.length} posts as unread`);
    } catch (err) {
      console.warn('[CommunityScreen] Failed to mark posts as unread:', err.message);
    }
  };

  const load = async (quiet = false) => {
    if (!quiet) setLoading(true);
    setError(null);
    try {
      console.log('💬 [CommunityScreen] Loading community posts...');
      const r = await getCommunityPosts();
      
      const data = r.data?.data || [];
      if (!Array.isArray(data)) {
        console.warn('[CommunityScreen] Expected array of posts, got:', typeof data);
        setPosts([]);
      } else {
        setPosts(data);
        // Mark new posts as unread
        await markNewPostsAsUnread(data);
      }
      console.log('✅ [CommunityScreen] Loaded:', data.length, 'posts');
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.message || 'Failed to load community posts';
      
      if (err.response?.status === 404) {
        console.warn('ℹ️ [CommunityScreen] Endpoint not available (404).');
        setError('Community feature not available yet. Check back soon!');
        setPosts([]);
      } else if (err.response?.status === 401) {
        console.warn('⚠️ [CommunityScreen] Unauthorized.');
        setError('Please log in to view community posts');
      } else if (err.response?.status === 500) {
        console.error('❌ [CommunityScreen] Server error:', errorMsg);
        setError('Server error. Please try again later.');
      } else {
        console.error('❌ [CommunityScreen] Load error:', errorMsg);
        setError(errorMsg);
      }
      
      setPosts([]);
    }
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    loadUnreadPostIds();
    load();
    const unsub = navigation.addListener('focus', () => {
      loadUnreadPostIds();
      load(true);
    });
    return unsub;
  }, [navigation]);

  // Auto-refresh every 20 seconds
  useAutoRefresh(() => load(true), true, 20000);

  const handleCreatePost = async () => {
    if (!newPostTitle.trim() || !newPostContent.trim()) {
      Alert.alert('Error', 'Please enter title and content');
      return;
    }

    setPosting(true);
    try {
      console.log('📝 [CommunityScreen] Creating new post...');
      await createCommunityPost({
        category: postType,
        title: newPostTitle,
        content: newPostContent,
      });
      console.log('✅ [CommunityScreen] Post created successfully');
      Alert.alert('Success', `✅ ${POST_TYPE_INFO[postType].label} post created!`);
      setNewPostTitle('');
      setNewPostContent('');
      setPostType(POST_TYPES.GENERAL);
      setShowPostModal(false);
      load(true);
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Failed to create post';
      console.error('❌ [CommunityScreen] Create error:', errorMsg);
      Alert.alert('Error', errorMsg);
    } finally {
      setPosting(false);
    }
  };

  const handleLike = async (postId) => {
    setLiking(postId);
    try {
      console.log('👍 [CommunityScreen] Liking post:', postId);
      await likeCommunityPost(postId);
      load(true);
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Failed to like post';
      console.error('❌ [CommunityScreen] Like error:', errorMsg);
    } finally {
      setLiking(null);
    }
  };

  const handleOpenComments = async (post) => {
    setSelectedPost(post);
    setShowCommentsModal(true);
    setLoadingComments(true);
    try {
      console.log('💬 [CommunityScreen] Loading comments for post:', post.id);
      const res = await getPostComments(post.id);
      const commentList = res.data?.data || [];
      setComments(commentList);
      console.log('✅ Loaded', commentList.length, 'comments');
      // Mark post as read
      await markPostAsRead(post.id);
    } catch (err) {
      console.error('❌ Error loading comments:', err.message);
      Alert.alert('Error', 'Failed to load comments');
    } finally {
      setLoadingComments(false);
    }
  };

  const handlePostComment = async () => {
    if (!newComment.trim()) {
      Alert.alert('Error', 'Please enter a comment');
      return;
    }

    setPostingComment(true);
    try {
      console.log('💬 [CommunityScreen] Posting comment...');
      await addCommentToPost(selectedPost.id, { content: newComment });
      console.log('✅ Comment posted successfully');
      setNewComment('');
      await handleOpenComments(selectedPost);
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Failed to post comment';
      console.error('❌ Comment error:', errorMsg);
      Alert.alert('Error', errorMsg);
    } finally {
      setPostingComment(false);
    }
  };

  if (loading) return <ScreenLoader />;

  return (
    <ScreenBackground>
    <SafeAreaView style={{ flex: 1, backgroundColor: 'transparent' }}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Community</Text>
          <Text style={styles.subtitle}>{posts?.length || 0} posts</Text>
        </View>
        <TouchableOpacity
          style={styles.newPostBtn}
          onPress={() => setShowPostModal(true)}
        >
          <Text style={styles.newPostBtnText}>+ New</Text>
        </TouchableOpacity>
      </View>

      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}><MaterialCommunityIcons name="alert-circle-outline" size={16} color="#ef4444" /> {error}</Text>
          <TouchableOpacity onPress={() => load(true)}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {!posts || posts.length === 0 ? (
        <EmptyState 
          emoji="💬" 
          title="No posts yet" 
          subtitle={error ? 'Unable to load posts' : "Be the first to share with the community!"} 
          buttonLabel="Create Post" 
          onButton={() => setShowPostModal(true)} 
        />
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={refreshing} tintColor={Colors.teal} onRefresh={() => { setRefreshing(true); load(true); }} />}
        >
          {posts && Array.isArray(posts) && posts.map(post => {
            if (!post) return null;
            const typeInfo = POST_TYPE_INFO[post.category] || POST_TYPE_INFO[POST_TYPES.GENERAL];
            const isUnread = unreadPostIds.includes(post.id);
            
            return (
              <TouchableOpacity 
                key={post.id} 
                style={styles.postCard}
                onPress={() => handleOpenComments(post)}
                activeOpacity={0.7}
              >
                {/* Red dot for unread posts */}
                {isUnread && <View style={styles.unreadDot} />}
                
                <View style={[styles.postTypeBadge, { backgroundColor: typeInfo.color + '20', borderColor: typeInfo.color }]}>
                  <Text style={[styles.postTypeText, { color: typeInfo.color }]}>{typeInfo.label}</Text>
                </View>

                <View style={styles.postHeader}>
                  <View>
                    <Text style={styles.postAuthor}>{post.author_name || 'Anonymous'}</Text>
                    <Text style={styles.postDate}>{fmtDate(post.created_at)}</Text>
                  </View>
                </View>

                <Text style={styles.postTitle}>{post.title || 'Untitled'}</Text>
                <Text style={styles.postContent}>{post.content || 'No content'}</Text>

                <View style={styles.postFooter}>
                  <TouchableOpacity
                    style={styles.likeBtn}
                    onPress={() => handleLike(post.id)}
                    disabled={liking === post.id}
                  >
                    {liking === post.id ? (
                      <ActivityIndicator size="small" color={Colors.teal} />
                    ) : (
                      <>
                        <MaterialCommunityIcons name={post.is_liked ? 'heart' : 'heart-outline'} size={16} color={post.is_liked ? '#ef4444' : '#999'} />
                        <Text style={styles.likeBtnCount}>{post.likes || 0}</Text>
                      </>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={styles.commentBtn}
                  >
                    <MaterialCommunityIcons name="chat-outline" size={16} color="#3b82f6" />
                    <Text style={styles.commentBtnCount}>{post.comments_count || 0}</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {/* New Post Modal */}
      <Modal visible={showPostModal} animationType="slide" transparent onRequestClose={() => setShowPostModal(false)}>
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowPostModal(false)} disabled={posting}>
              <MaterialCommunityIcons name="close" size={22} color="#333" style={[posting && styles.modalCloseBtnDisabled]} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>New Post</Text>
            <TouchableOpacity
              onPress={handleCreatePost}
              disabled={posting || !newPostTitle.trim() || !newPostContent.trim()}
            >
              {posting ? (
                <ActivityIndicator size="small" color={Colors.teal} />
              ) : (
                <Text style={[styles.modalPublishBtn, (!newPostTitle.trim() || !newPostContent.trim()) && styles.modalPublishBtnDisabled]}>
                  Publish
                </Text>
              )}
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <Text style={styles.sectionLabel}>Post Type</Text>
            <View style={styles.postTypeSelector}>
              {Object.entries(POST_TYPE_INFO).map(([key, info]) => (
                <TouchableOpacity
                  key={key}
                  style={[styles.postTypeOption, postType === key && styles.postTypeOptionActive]}
                  onPress={() => setPostType(key)}
                  disabled={posting}
                >
                  <Text style={[styles.postTypeOptionText, postType === key && styles.postTypeOptionTextActive]}>
                    {info.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            
            <Text style={styles.sectionLabel}>Title</Text>
            <TextInput
              style={styles.input}
              placeholder="Post title..."
              placeholderTextColor={Colors.textLight}
              value={newPostTitle}
              onChangeText={setNewPostTitle}
              editable={!posting}
              maxLength={100}
            />
            <Text style={styles.charCount}>{newPostTitle.length}/100</Text>
            
            <Text style={styles.sectionLabel}>Description</Text>
            <TextInput
              style={[styles.input, styles.contentInput]}
              placeholder="What's on your mind?"
              placeholderTextColor={Colors.textLight}
              value={newPostContent}
              onChangeText={setNewPostContent}
              multiline
              numberOfLines={6}
              editable={!posting}
              textAlignVertical="top"
              maxLength={500}
            />
            <Text style={styles.charCount}>{newPostContent.length}/500</Text>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Comments Modal */}
      <Modal visible={showCommentsModal} animationType="slide" transparent onRequestClose={() => setShowCommentsModal(false)}>
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowCommentsModal(false)}>
              <MaterialCommunityIcons name="close" size={22} color="#333" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Comments</Text>
            <View style={{ width: 24 }} />
          </View>

          {loadingComments ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={Colors.primary} />
            </View>
          ) : (
            <>
              <ScrollView style={styles.commentsContainer}>
                {selectedPost && (
                  <View style={styles.originalPostPreview}>
                    <Text style={styles.postAuthor}>{selectedPost.author_name || 'Anonymous'}</Text>
                    <Text style={styles.postTitle}>{selectedPost.title}</Text>
                    <Text style={styles.postContent} numberOfLines={2}>{selectedPost.content}</Text>
                  </View>
                )}

                {comments && comments.length > 0 ? (
                  comments.map(comment => (
                    <View key={comment.id} style={styles.commentItem}>
                      <Text style={styles.commentAuthor}>{comment.author_name || 'Anonymous'}</Text>
                      <Text style={styles.commentDate}>{fmtDate(comment.created_at)}</Text>
                      <Text style={styles.commentText}>{comment.content}</Text>
                    </View>
                  ))
                ) : (
                  <View style={styles.noCommentsContainer}>
                    <Text style={styles.noCommentsText}>No comments yet. Be the first to comment!</Text>
                  </View>
                )}
              </ScrollView>

              <View style={styles.commentInputContainer}>
                <TextInput
                  style={styles.commentInput}
                  placeholder="Add a comment..."
                  placeholderTextColor={Colors.textLight}
                  value={newComment}
                  onChangeText={setNewComment}
                  editable={!postingComment}
                  multiline
                  maxLength={200}
                />
                <TouchableOpacity
                  style={[styles.commentSubmitBtn, postingComment && styles.commentSubmitBtnDisabled]}
                  onPress={handlePostComment}
                  disabled={postingComment || !newComment.trim()}
                >
                  {postingComment ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.commentSubmitBtnText}>Send</Text>
                  )}
                </TouchableOpacity>
              </View>
            </>
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12, backgroundColor: Colors.royalBlue, borderBottomLeftRadius: Radius.xl, borderBottomRightRadius: Radius.xl },
  title: { fontSize: 22, fontWeight: '800', color: '#FFFFFF' },
  subtitle: { fontSize: 12, color: 'rgba(255,255,255,0.85)', marginTop: 2 },
  newPostBtn: { backgroundColor: Colors.freshGreen, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12 },
  newPostBtnText: { fontSize: 12, color: Colors.textWhite, fontWeight: '700' },
  errorBanner: {
    backgroundColor: 'rgba(239,68,68,0.15)',
    borderColor: Colors.danger,
    borderWidth: SW(1),
    borderLeftWidth: 4,
    marginHorizontal: SW(16),
    marginBottom: SH(12),
    paddingHorizontal: SW(12),
    paddingVertical: SH(10),
    borderRadius: Radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  errorText: {
    color: Colors.danger,
    fontSize: SF(12),
    fontWeight: '600',
    flex: 1,
  },
  retryText: {
    color: Colors.danger,
    fontSize: SF(12),
    fontWeight: '700',
    marginLeft: SW(8),
  },
  postCard: {
    backgroundColor: Colors.cardGlass,
    borderRadius: Radius.xl,
    borderWidth: SW(1),
    borderColor: Colors.border,
    padding: SW(14),
    marginBottom: SH(12),
    ...Shadow.card,
  },
  unreadDot: {
    position: 'absolute',
    top: SH(12),
    right: SW(12),
    width: SW(10),
    height: SH(10),
    borderRadius: SW(5),
    backgroundColor: Colors.danger,
    zIndex: 10,
  },
  postTypeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: SW(10),
    paddingVertical: SH(4),
    borderRadius: SW(6),
    borderWidth: SW(1),
    marginBottom: SH(8),
  },
  postTypeText: {
    fontSize: SF(11),
    fontWeight: '700',
  },
  postHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  postAuthor: { fontSize: 14, fontWeight: '700', color: Colors.textDark },
  postDate: { fontSize: 11, color: Colors.textLight, marginTop: 2 },
  postTitle: { fontSize: 15, fontWeight: '700', color: Colors.textDark, marginBottom: 6 },
  postContent: { fontSize: 13, color: Colors.textMid, lineHeight: 18, marginBottom: 10 },
  postFooter: { flexDirection: 'row', gap: 12 },
  likeBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 6 },
  likeBtnText: { fontSize: 16 },
  likeBtnCount: { fontSize: 12, color: Colors.textLight },
  commentBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 6 },
  commentBtnText: { fontSize: 16 },
  commentBtnCount: { fontSize: 12, color: Colors.textLight },
  modalContainer: { flex: 1, backgroundColor: Colors.primaryLight },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SW(16),
    paddingVertical: SH(12),
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalCloseBtn: { fontSize: 20, color: Colors.textDark },
  modalCloseBtnDisabled: { color: Colors.textLight, opacity: 0.5 },
  modalTitle: { fontSize: 16, fontWeight: '700', color: Colors.textDark },
  modalPublishBtn: { fontSize: 13, fontWeight: '700', color: Colors.appBlue },
  modalPublishBtnDisabled: { color: Colors.textLight },
  modalContent: { flex: 1, padding: 16 },
  sectionLabel: { fontSize: 13, fontWeight: '700', color: Colors.textDark, marginBottom: 10, marginTop: 10 },
  postTypeSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SW(8),
    marginBottom: SH(12),
  },
  postTypeOption: {
    paddingHorizontal: SW(12),
    paddingVertical: SH(8),
    borderRadius: SW(20),
    backgroundColor: Colors.inputFill,
    borderWidth: SW(2),
    borderColor: 'transparent',
  },
  postTypeOptionActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '15',
  },
  postTypeOptionText: {
    fontSize: SF(12),
    fontWeight: '600',
    color: Colors.textMid,
  },
  postTypeOptionTextActive: {
    color: Colors.primary,
  },
  input: {
    backgroundColor: Colors.inputFill,
    borderRadius: Radius.lg,
    paddingHorizontal: SW(14),
    paddingVertical: SH(12),
    fontSize: SF(14),
    color: Colors.textDark,
    marginBottom: SH(6),
  },
  contentInput: { minHeight: 120 },
  charCount: {
    fontSize: SF(11),
    color: Colors.textLight,
    textAlign: 'right',
    marginBottom: SH(12),
    marginRight: SW(4),
  },
  // Comments Modal Styles
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  commentsContainer: {
    flex: 1,
    padding: SW(16),
  },
  originalPostPreview: {
    backgroundColor: Colors.inputFill,
    borderRadius: Radius.lg,
    padding: SW(12),
    marginBottom: SH(16),
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary,
  },
  commentItem: {
    backgroundColor: Colors.bgWhite,
    borderRadius: Radius.lg,
    padding: SW(12),
    marginBottom: SH(8),
    borderWidth: SW(1),
    borderColor: Colors.border,
  },
  commentAuthor: {
    fontSize: SF(13),
    fontWeight: '700',
    color: Colors.textDark,
  },
  commentDate: {
    fontSize: SF(10),
    color: Colors.textLight,
    marginTop: SH(2),
  },
  commentText: {
    fontSize: SF(12),
    color: Colors.textMid,
    marginTop: SH(6),
    lineHeight: SH(16),
  },
  noCommentsContainer: {
    padding: SW(32),
    justifyContent: 'center',
    alignItems: 'center',
  },
  noCommentsText: {
    fontSize: SF(13),
    color: Colors.textLight,
    textAlign: 'center',
  },
  commentInputContainer: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingHorizontal: SW(12),
    paddingVertical: SH(12),
    flexDirection: 'row',
    gap: SW(8),
    alignItems: 'flex-end',
  },
  commentInput: {
    flex: 1,
    backgroundColor: Colors.inputFill,
    borderRadius: Radius.lg,
    paddingHorizontal: SW(12),
    paddingVertical: SH(10),
    fontSize: SF(12),
    color: Colors.textDark,
    maxHeight: SH(100),
  },
  commentSubmitBtn: {
    backgroundColor: Colors.teal,
    borderRadius: Radius.lg,
    paddingHorizontal: SW(16),
    paddingVertical: SH(10),
    justifyContent: 'center',
    alignItems: 'center',
  },
  commentSubmitBtnDisabled: {
    opacity: 0.6,
  },
  commentSubmitBtnText: {
    color: Colors.textWhite,
    fontSize: SF(12),
    fontWeight: '700',
  },
  modalContainer: { flex: 1, backgroundColor: Colors.primaryLight },
});

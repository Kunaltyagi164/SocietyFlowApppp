// src/screens/Polling/PollingScreen.js
import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  RefreshControl, SafeAreaView, Alert, ActivityIndicator
} from 'react-native';
import { getActivePolls, getAllPolls, votePoll } from '../../services/api';
import { EmptyState, ScreenLoader, ScreenBackground } from '../../components';
import { Colors, Radius, Shadow } from '../../theme';
import LinearGradient from 'react-native-linear-gradient';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { SF, SH, SW } from '../../utils/responsive';

const fmtPct = (v, t) => t ? Math.round((v / t) * 100) : 0;
const fmtDate = (d) => {
  try { return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }); }
  catch { return ''; }
};

const POLL_ICONS = ['clipboard-text-outline', 'help-circle-outline', 'check-decagram-outline', 'party-popper', 'trophy-outline'];

export default function PollingScreen({ navigation }) {
  const [activePolls, setActivePolls] = useState([]);
  const [closedPolls, setClosedPolls] = useState([]);
  const [activeTab, setActiveTab] = useState(0); // 0=Active, 1=Closed
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [voting, setVoting] = useState(null); // pollId currently being voted on
  const [localVotedIndex, setLocalVotedIndex] = useState({}); // { [pollId]: optionIndex }

  const normalizePoll = (poll = {}) => {
    const idx = poll.user_vote_index;
    const parsedIdx = idx === null || idx === undefined || idx === '' ? null : Number(idx);
    const hasValidIdx = Number.isInteger(parsedIdx) && parsedIdx >= 0;

    return {
      ...poll,
      user_vote_index: hasValidIdx ? parsedIdx : null,
      user_voted: poll.user_voted === true || poll.user_voted === 1 || poll.user_voted === 'true' || hasValidIdx,
    };
  };

  const load = async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      // Use active endpoint for voting flow, and all endpoint for closed history.
      const [activeRes, allRes] = await Promise.all([
        getActivePolls(),
        getAllPolls(),
      ]);

      const active = activeRes.data?.data || [];
      const all = allRes.data?.data || [];
      const normalizedActive = active.map(normalizePoll);
      const closed = all.filter(p => p.is_active === false).map(normalizePoll);

      console.log('📊 [Polling] Loaded:', normalizedActive.length, 'active and', closed.length, 'closed polls');
      setActivePolls(normalizedActive);
      setClosedPolls(closed);
    } catch (err) {
      console.error('❌ [Polling] Load error:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load();
    const unsub = navigation.addListener('focus', () => load(true));
    return unsub;
  }, [navigation]);

  const handleVote = async (pollId, optionIndex) => {
    setVoting(pollId);
    try {
      console.log('🗳️ [Polling] Voting poll:', pollId, 'option index:', optionIndex);
      // API only needs option_index
      const result = await votePoll(pollId, { option_index: optionIndex });
      const updatedPoll = result.data?.data;

      if (updatedPoll) {
        const normalizedUpdated = normalizePoll({
          ...updatedPoll,
          user_voted: true,
          user_vote_index: updatedPoll.user_vote_index ?? optionIndex,
        });

        // Immediately update local state from response — no re-fetch needed
        setActivePolls(prev => prev.map(p => p.id === pollId ? normalizedUpdated : p));
        setLocalVotedIndex(prev => ({ ...prev, [pollId]: optionIndex }));
        const optText = updatedPoll.options?.[optionIndex] || 'Unknown';
        Alert.alert('Vote Recorded! ✅', `You voted for: "${optText}"`);
        console.log('✅ [Polling] Vote success. Updated total:', updatedPoll.total_votes);
      }
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.message || 'Vote failed';
      console.error('❌ [Polling] Vote failed:', errorMsg);
      Alert.alert('Error', errorMsg);
      // Refresh to sync state (handles "already voted" case)
      if (err.response?.data?.error?.includes('already voted')) {
        load(true);
      }
    } finally {
      setVoting(null);
    }
  };

  if (loading) return <ScreenLoader />;

  const polls = activeTab === 0 ? activePolls : closedPolls;

  const renderPoll = (poll, idx) => {
    const totalVotes = poll.total_votes || 0;
    const normalizedPollIndex =
      poll.user_vote_index === null || poll.user_vote_index === undefined
        ? null
        : Number(poll.user_vote_index);
    const fallbackLocalIndex = localVotedIndex[poll.id];
    const userVoteIndex = Number.isInteger(normalizedPollIndex) && normalizedPollIndex >= 0
      ? normalizedPollIndex
      : (Number.isInteger(fallbackLocalIndex) ? fallbackLocalIndex : null);
    const hasVoted = poll.user_voted === true || userVoteIndex !== null;
    const isActive = poll.is_active === true;
    const isVotingThis = voting === poll.id;

    return (
      <View key={poll.id} style={styles.pollCard}>
        {/* Poll Header */}
        <View style={styles.pollHeader}>
          <View style={styles.pollIconWrap}>
            <MaterialCommunityIcons name={POLL_ICONS[idx % 5]} size={20} color={Colors.royalBlue} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.pollTitle}>{poll.title}</Text>
            <Text style={styles.pollMeta}>{poll.created_by || 'Admin'} • {fmtDate(poll.created_at)}</Text>
          </View>
        </View>

        {/* Description */}
        {!!poll.description && (
          <Text style={styles.pollDesc}>{poll.description}</Text>
        )}

        {/* Winner badge — only when poll is closed */}
        {!isActive && !!poll.winner && (
          <View style={styles.winnerBadge}>
            <MaterialCommunityIcons name="trophy" size={14} color="#d97706" />
            <Text style={styles.winnerText}>Winner: {poll.winner}</Text>
          </View>
        )}

        {/* Options */}
        <View style={styles.optionsContainer}>
          {poll.options?.map((optText, optIdx) => {
            const optLabel = typeof optText === 'string' ? optText : (optText?.text || String(optText));
            const votes = poll.vote_counts?.[optIdx] || 0;
            const pct = fmtPct(votes, totalVotes);
            const isVoted = userVoteIndex === optIdx;
            const canVote = !hasVoted && isActive && !isVotingThis;

            return (
              <TouchableOpacity
                key={`opt_${optIdx}`}
                style={[
                  styles.optionBtn,
                  isVoted && styles.optionBtnVoted,
                  hasVoted && !isVoted && styles.optionBtnDisabledVisual,
                ]}
                onPress={() => {
                  if (canVote) {
                    handleVote(poll.id, optIdx);
                    return;
                  }

                  if (isVotingThis) return;

                  if (!isActive) {
                    Alert.alert('Poll Closed', 'This poll is closed and no longer accepts votes.');
                    return;
                  }

                  if (hasVoted) {
                    Alert.alert('Already Voted', 'You can vote only once in this poll.');
                    return;
                  }
                }}
                activeOpacity={canVote ? 0.75 : 1}
              >
                <LinearGradient
                  colors={isVoted ? [Colors.primary, Colors.primaryLight] : [Colors.inputFill, Colors.inputFill]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.optionGradient}
                >
                  {/* Radio / Check icon */}
                  <View style={styles.radioButtonContainer}>
                    {isVoted ? (
                      <MaterialCommunityIcons name="check-circle" size={22} color="#fff" />
                    ) : (
                      <View style={[styles.radioButton, (isActive && !hasVoted) && { borderColor: Colors.primary }]} />
                    )}
                  </View>

                  {/* Text + stats */}
                  <View style={styles.optionContent}>
                    <View style={styles.optionTextRow}>
                      <Text style={[styles.optionText, isVoted && styles.optionTextVoted, { flex: 1 }]}>
                        {optLabel}
                      </Text>
                      {isVoted && <Text style={styles.votedMarker}>✓ Your vote</Text>}
                    </View>

                    {!hasVoted && isActive && (
                      <Text style={styles.optionHint}>Tap to vote</Text>
                    )}

                    {/* Progress bar — ONLY after voting or when poll is closed (anti-bias) */}
                    {(hasVoted || !isActive) && (
                      <View style={styles.optionStats}>
                        <View style={styles.progressBar}>
                          <View style={[
                            styles.progressFill,
                            { width: `${pct}%`, backgroundColor: isVoted ? '#fff' : Colors.primary }
                          ]} />
                        </View>
                        <View style={{ alignItems: 'flex-end', minWidth: 60 }}>
                          <Text style={[styles.optionPct, isVoted && styles.optionPctVoted]}>{pct}%</Text>
                          <Text style={[styles.voteCountSmall, isVoted && { color: '#fff' }]}>
                            {votes} {votes === 1 ? 'vote' : 'votes'}
                          </Text>
                        </View>
                      </View>
                    )}
                  </View>

                  {isVotingThis && (
                    <ActivityIndicator size="small" color={isVoted ? '#fff' : Colors.primary} style={{ marginLeft: 8 }} />
                  )}
                </LinearGradient>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Footer */}
        <View style={styles.pollFooter}>
          <Text style={styles.voteCount}>{totalVotes} {totalVotes === 1 ? 'vote' : 'votes'}</Text>
          {hasVoted && userVoteIndex != null && (
            <Text style={styles.votedLabel} numberOfLines={1}>
              You voted: "{poll.options?.[userVoteIndex]}"
            </Text>
          )}
          <View style={[
            styles.pollStatusBadge,
            { backgroundColor: isActive ? Colors.successLight : 'rgba(148,163,184,0.15)' }
          ]}>
            <View style={styles.statusRow}>
              <MaterialCommunityIcons
                name={isActive ? 'record-circle' : 'minus-circle-outline'}
                size={12}
                color={isActive ? Colors.success : Colors.textDark}
              />
              <Text style={[styles.pollStatusText, { color: isActive ? Colors.success : Colors.textDark }]}>
                {isActive ? 'Live' : 'Closed'}
              </Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

  return (
    <ScreenBackground>
      <SafeAreaView style={{ flex: 1, backgroundColor: 'transparent' }}>
        {/* Header */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Polls</Text>
            <Text style={styles.subtitle}>{activePolls.length} active · {closedPolls.length} closed</Text>
          </View>
          <TouchableOpacity onPress={() => { setRefreshing(true); load(true); }} style={styles.refreshBtn}>
            <MaterialCommunityIcons name="refresh" size={18} color={Colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Tab Bar: Active / Closed */}
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 0 && styles.tabBtnActive]}
            onPress={() => setActiveTab(0)}
          >
            <Text style={[styles.tabText, activeTab === 0 && styles.tabTextActive]}>
              Active ({activePolls.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 1 && styles.tabBtnActive]}
            onPress={() => setActiveTab(1)}
          >
            <Text style={[styles.tabText, activeTab === 1 && styles.tabTextActive]}>
              Closed ({closedPolls.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Poll List */}
        {polls.length === 0 ? (
          <EmptyState
            iconName="chart-bar"
            title={activeTab === 0 ? 'No active polls' : 'No closed polls'}
            subtitle={activeTab === 0 ? 'Check back later for community voting!' : 'Closed polls and results appear here'}
          />
        ) : (
          <ScrollView
            contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                tintColor={Colors.accent}
                onRefresh={() => { setRefreshing(true); load(true); }}
              />
            }
          >
            {polls.map((poll, idx) => renderPoll(poll, idx))}
          </ScrollView>
        )}
      </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SW(20),
    paddingTop: SH(16),
    paddingBottom: SH(12),
    backgroundColor: Colors.royalBlue,
    borderBottomLeftRadius: Radius.xl,
    borderBottomRightRadius: Radius.xl,
  },
  title: {
    fontSize: SF(22),
    fontWeight: '800',
    color: '#FFFFFF',
  },
  subtitle: {
    fontSize: SF(12),
    color: 'rgba(255,255,255,0.85)',
    marginTop: SH(4),
  },
  refreshBtn: {
    width: SW(40),
    height: SH(40),
    borderRadius: SW(20),
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: SW(1),
    borderColor: Colors.primary,
  },
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: SW(16),
    marginTop: SH(14),
    marginBottom: SH(4),
    backgroundColor: Colors.inputFill,
    borderRadius: Radius.lg,
    padding: SW(4),
  },
  tabBtn: {
    flex: 1,
    paddingVertical: SH(8),
    alignItems: 'center',
    borderRadius: Radius.md,
  },
  tabBtnActive: {
    backgroundColor: Colors.primary,
  },
  tabText: {
    fontSize: SF(13),
    fontWeight: '600',
    color: Colors.textLight,
  },
  tabTextActive: {
    color: '#fff',
  },
  pollCard: {
    backgroundColor: Colors.cardGlass,
    borderRadius: Radius.xl,
    borderWidth: SW(1),
    borderColor: Colors.border,
    padding: SW(14),
    marginBottom: SH(12),
  },
  pollHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: SH(10),
  },
  pollIconWrap: {
    width: SW(36),
    height: SH(36),
    borderRadius: SW(12),
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SW(10),
  },
  pollTitle: {
    fontSize: SF(15),
    fontWeight: '700',
    color: Colors.textDark,
  },
  pollMeta: {
    fontSize: SF(11),
    color: Colors.textLight,
    marginTop: SH(4),
  },
  pollDesc: {
    fontSize: SF(12),
    color: Colors.textMid,
    marginBottom: SH(12),
    lineHeight: SH(16),
  },
  winnerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef3c7',
    borderRadius: Radius.md,
    paddingHorizontal: SW(10),
    paddingVertical: SH(6),
    marginBottom: SH(10),
    alignSelf: 'flex-start',
    gap: SW(6),
  },
  winnerText: {
    fontSize: SF(12),
    fontWeight: '700',
    color: '#92400e',
  },
  optionsContainer: {
    gap: SW(8),
    marginBottom: SH(10),
  },
  optionBtn: {
    overflow: 'hidden',
    borderRadius: Radius.lg,
    marginVertical: SH(4),
  },
  optionBtnVoted: {
    borderWidth: SW(2),
    borderColor: Colors.primary,
  },
  optionBtnDisabledVisual: {
    opacity: 0.65,
  },
  optionGradient: {
    padding: SW(12),
    flexDirection: 'row',
    alignItems: 'center',
  },
  radioButtonContainer: {
    paddingRight: SW(12),
  },
  radioButton: {
    width: SW(22),
    height: SH(22),
    borderRadius: SW(11),
    borderWidth: SW(2),
    borderColor: Colors.textLight,
    backgroundColor: 'transparent',
  },
  optionContent: {
    flex: 1,
  },
  optionTextRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionText: {
    fontSize: SF(13),
    fontWeight: '600',
    color: Colors.textDark,
    marginBottom: SH(4),
  },
  optionTextVoted: {
    color: '#fff',
  },
  votedMarker: {
    fontSize: SF(11),
    fontWeight: '600',
    color: '#fff',
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: SW(8),
    paddingVertical: SH(3),
    borderRadius: SW(6),
    marginLeft: SW(8),
  },
  optionHint: {
    fontSize: SF(11),
    color: Colors.primary,
    fontWeight: '500',
    marginTop: SH(2),
  },
  optionStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SW(8),
    marginTop: SH(6),
  },
  progressBar: {
    flex: 1,
    height: SH(6),
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: SW(3),
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: SW(3),
  },
  optionPct: {
    fontSize: SF(12),
    fontWeight: '600',
    color: Colors.textLight,
    minWidth: SW(35),
    textAlign: 'right',
  },
  optionPctVoted: {
    color: '#fff',
  },
  voteCountSmall: {
    fontSize: SF(10),
    color: Colors.textLight,
  },
  pollFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: SH(10),
    gap: SW(8),
  },
  voteCount: {
    fontSize: SF(12),
    color: Colors.textLight,
  },
  votedLabel: {
    fontSize: SF(12),
    color: Colors.primary,
    fontWeight: '600',
    flex: 1,
    marginHorizontal: SW(8),
  },
  pollStatusBadge: {
    paddingHorizontal: SW(10),
    paddingVertical: SH(5),
    borderRadius: SW(14),
  },
  pollStatusText: {
    fontSize: SF(11),
    fontWeight: '600',
    marginLeft: SW(4),
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});

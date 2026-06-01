// src/screens/Search/SearchScreen.js
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TextInput,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { Colors, Radius, Shadow } from '../../theme';
import * as api from '../../services/api';
import { ScreenBackground } from '../../components';
import { SF, SH, SW } from '../../utils/responsive';

export default function SearchScreen({ navigation }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) {
      setResults(null);
      return;
    }

    try {
      setLoading(true);
      const res = await api.globalSearch(query);
      setResults(res.data?.data || {});
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenBackground>
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backBtn}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>🔍 Search</Text>
        <View style={{ width: 30 }} />
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search residents, visitors, complaints..."
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={handleSearch}
          placeholderTextColor={Colors.textSecondary}
        />
        <TouchableOpacity style={styles.searchBtn} onPress={handleSearch}>
          <Text style={styles.searchBtnText}>🔍</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {loading ? (
          <ActivityIndicator size="large" color={Colors.teal} style={{ marginTop: 40 }} />
        ) : results ? (
          <>
            {/* Residents */}
            {results.residents && results.residents.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>👤 Residents ({results.residents.length})</Text>
                {results.residents.map((resident, idx) => (
                  <View key={idx} style={styles.resultCard}>
                    <Text style={styles.resultName}>{resident.name}</Text>
                    <Text style={styles.resultDetail}>Flat {resident.flat_no}</Text>
                    <Text style={styles.resultDetail}>{resident.phone}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Visitors */}
            {results.visitors && results.visitors.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>🚶 Visitors ({results.visitors.length})</Text>
                {results.visitors.map((visitor, idx) => (
                  <View key={idx} style={styles.resultCard}>
                    <Text style={styles.resultName}>{visitor.name}</Text>
                    <Text style={styles.resultDetail}>→ Flat {visitor.visiting_flat}</Text>
                    <Text style={styles.resultDetail}>{visitor.phone}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Complaints */}
            {results.complaints && results.complaints.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>💬 Complaints ({results.complaints.length})</Text>
                {results.complaints.map((complaint, idx) => (
                  <View key={idx} style={styles.resultCard}>
                    <Text style={styles.resultName}>{complaint.title}</Text>
                    <Text style={styles.resultDetail}>{complaint.category}</Text>
                    <Text style={styles.resultDetail}>Status: {complaint.status}</Text>
                  </View>
                ))}
              </View>
            )}

            {!results.residents?.length && !results.visitors?.length && !results.complaints?.length && (
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>🔍</Text>
                <Text style={styles.emptyText}>No results found</Text>
              </View>
            )}
          </>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🔍</Text>
            <Text style={styles.emptyText}>Enter search term</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SW(16),
    paddingVertical: SH(12),
    backgroundColor: Colors.bgWhite,
    ...Shadow.soft,
  },
  backBtn: {
    fontSize: SF(16),
    color: Colors.teal,
    fontWeight: '600',
  },
  title: {
    fontSize: SF(20),
    fontWeight: 'bold',
    color: Colors.textDark,
  },
  searchContainer: {
    flexDirection: 'row',
    margin: SW(16),
    gap: SW(8),
  },
  searchInput: {
    flex: 1,
    backgroundColor: Colors.bgWhite,
    borderRadius: Radius.lg,
    paddingHorizontal: SW(12),
    paddingVertical: SH(10),
    fontSize: SF(14),
    color: Colors.textDark,
  },
  searchBtn: {
    backgroundColor: Colors.teal,
    borderRadius: Radius.lg,
    width: SW(44),
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchBtnText: {
    fontSize: SF(20),
  },
  section: {
    marginHorizontal: SW(16),
    marginVertical: SH(12),
  },
  sectionTitle: {
    fontSize: SF(14),
    fontWeight: '700',
    color: Colors.textDark,
    marginBottom: SH(10),
  },
  resultCard: {
    backgroundColor: Colors.bgWhite,
    borderRadius: Radius.md,
    padding: SW(12),
    marginBottom: SH(8),
  },
  resultName: {
    fontSize: SF(14),
    fontWeight: '600',
    color: Colors.textDark,
  },
  resultDetail: {
    fontSize: SF(12),
    color: Colors.textSecondary,
    marginTop: SH(2),
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: SH(60),
  },
  emptyIcon: {
    fontSize: SF(54),
    marginBottom: SH(12),
  },
  emptyText: {
    fontSize: SF(16),
    color: Colors.textSecondary,
  },
});

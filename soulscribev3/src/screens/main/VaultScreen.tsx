import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, FONTS, SIZES, SHADOWS } from '../../constants/theme';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { auth, db } from '../../services/firebase';
import { format } from 'date-fns';

interface JournalEntry {
  id: string;
  content: string;
  createdAt: string;
}

export default function VaultScreen() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());

  useEffect(() => {
    fetchEntries();
  }, [selectedYear, selectedMonth]);

  async function fetchEntries() {
    if (!auth.currentUser) return;

    try {
      const startDate = new Date(selectedYear, selectedMonth, 1);
      const endDate = new Date(selectedYear, selectedMonth + 1, 0);

      const q = query(
        collection(db, 'journals'),
        where('userId', '==', auth.currentUser.uid),
        where('createdAt', '>=', startDate.toISOString()),
        where('createdAt', '<=', endDate.toISOString()),
        orderBy('createdAt', 'desc')
      );

      const querySnapshot = await getDocs(q);
      const journalEntries: JournalEntry[] = [];

      querySnapshot.forEach((doc) => {
        journalEntries.push({
          id: doc.id,
          ...doc.data(),
        } as JournalEntry);
      });

      setEntries(journalEntries);
    } catch (error) {
      console.error('Error fetching entries:', error);
    }
  }

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const renderEntry = ({ item }: { item: JournalEntry }) => (
    <View style={styles.entryCard}>
      <Text style={styles.entryDate}>
        {format(new Date(item.createdAt), 'MMMM d, yyyy h:mm a')}
      </Text>
      <Text style={styles.entryContent} numberOfLines={3}>
        {item.content}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>The Vault</Text>
          <Text style={styles.subtitle}>Your journal entries</Text>
        </View>

        <View style={styles.dateSelector}>
          <View style={styles.yearSelector}>
            <TouchableOpacity
              onPress={() => setSelectedYear(selectedYear - 1)}
              style={styles.yearButton}
            >
              <Text style={styles.yearButtonText}>←</Text>
            </TouchableOpacity>
            <Text style={styles.yearText}>{selectedYear}</Text>
            <TouchableOpacity
              onPress={() => setSelectedYear(selectedYear + 1)}
              style={styles.yearButton}
            >
              <Text style={styles.yearButtonText}>→</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.monthsContainer}>
            <FlatList
              data={months}
              horizontal
              showsHorizontalScrollIndicator={false}
              renderItem={({ item, index }) => (
                <TouchableOpacity
                  style={[
                    styles.monthButton,
                    selectedMonth === index && styles.selectedMonth,
                  ]}
                  onPress={() => setSelectedMonth(index)}
                >
                  <Text
                    style={[
                      styles.monthText,
                      selectedMonth === index && styles.selectedMonthText,
                    ]}
                  >
                    {item}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>

        <FlatList
          data={entries}
          renderItem={renderEntry}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.entriesList}
          ListEmptyComponent={() => (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No entries for this month</Text>
            </View>
          )}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: SIZES.padding,
    paddingVertical: SIZES.padding,
  },
  header: {
    marginBottom: SIZES.padding,
  },
  title: {
    ...FONTS.h1,
    color: COLORS.text,
    fontWeight: 'bold',
  },
  subtitle: {
    ...FONTS.body1,
    color: COLORS.textSecondary,
  },
  dateSelector: {
    marginBottom: SIZES.padding,
  },
  yearSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SIZES.padding,
  },
  yearButton: {
    padding: SIZES.base,
  },
  yearButtonText: {
    ...FONTS.h2,
    color: COLORS.primary,
  },
  yearText: {
    ...FONTS.h2,
    color: COLORS.text,
    marginHorizontal: SIZES.padding,
  },
  monthsContainer: {
    marginBottom: SIZES.padding,
  },
  monthButton: {
    paddingHorizontal: SIZES.padding,
    paddingVertical: SIZES.base,
    marginRight: SIZES.base,
    borderRadius: SIZES.radius,
    backgroundColor: COLORS.surface,
  },
  selectedMonth: {
    backgroundColor: COLORS.primary,
  },
  monthText: {
    ...FONTS.body2,
    color: COLORS.textSecondary,
  },
  selectedMonthText: {
    color: COLORS.white,
  },
  entriesList: {
    paddingBottom: SIZES.padding,
  },
  entryCard: {
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radius,
    padding: SIZES.padding,
    marginBottom: SIZES.padding,
    ...SHADOWS.small,
  },
  entryDate: {
    ...FONTS.body2,
    color: COLORS.primary,
    marginBottom: SIZES.base,
  },
  entryContent: {
    ...FONTS.body1,
    color: COLORS.text,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SIZES.padding * 2,
  },
  emptyText: {
    ...FONTS.body1,
    color: COLORS.textSecondary,
  },
}); 
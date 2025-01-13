import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, FONTS, SIZES, SHADOWS } from '../../constants/theme';
import { collection, query, where, orderBy, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { auth, db } from '../../services/firebase';
import { format } from 'date-fns';
import { Ionicons } from '@expo/vector-icons';

interface JournalEntry {
  id: string;
  content: string;
  createdAt: string;
  mood: string;
  sentiment: string;
}

export default function VaultScreen() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [editingEntry, setEditingEntry] = useState<JournalEntry | null>(null);
  const [editedContent, setEditedContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);

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

  const handleEditEntry = (entry: JournalEntry) => {
    setEditingEntry(entry);
    setEditedContent(entry.content);
  };

  const handleSaveEdit = async () => {
    if (!editingEntry || !editedContent.trim()) return;

    setIsLoading(true);
    try {
      const entryRef = doc(db, 'journals', editingEntry.id);
      await updateDoc(entryRef, {
        content: editedContent.trim()
      });

      // Update local state
      setEntries(entries.map(entry => 
        entry.id === editingEntry.id 
          ? { ...entry, content: editedContent.trim() }
          : entry
      ));

      setEditingEntry(null);
      Alert.alert('Success', 'Journal entry updated successfully');
    } catch (error) {
      console.error('Error updating entry:', error);
      Alert.alert('Error', 'Failed to update journal entry');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteEntry = async () => {
    if (!editingEntry) return;

    Alert.alert(
      'Delete Journal Entry',
      'Are you sure you want to delete this journal entry? This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setIsLoading(true);
            try {
              const entryRef = doc(db, 'journals', editingEntry.id);
              await deleteDoc(entryRef);

              // Update local state
              setEntries(entries.filter(entry => entry.id !== editingEntry.id));
              setEditingEntry(null);
              Alert.alert('Success', 'Journal entry deleted successfully');
            } catch (error) {
              console.error('Error deleting entry:', error);
              Alert.alert('Error', 'Failed to delete journal entry');
            } finally {
              setIsLoading(false);
            }
          }
        }
      ]
    );
  };

  // Function to get mood emoji
  const getMoodEmoji = (mood: string, sentiment: string) => {
    const lowerMood = mood?.toLowerCase() || '';
    const lowerSentiment = sentiment?.toLowerCase() || '';
    
    // Happy/Positive moods
    if (lowerMood.match(/happy|joy|excited|great|wonderful|fantastic|good|positive|cheerful|delighted|pleased|content|grateful|optimistic|confident/)) {
      if (lowerSentiment.includes('very positive')) return '🤗';
      return '😊';
    }
    
    // Negative moods
    if (lowerMood.match(/sad|angry|upset|frustrated|anxious|depressed|worried|stressed|tired|exhausted|disappointed|hurt|lonely|negative|fear/)) {
      if (lowerMood.match(/angry|frustrated/)) return '😤';
      if (lowerMood.match(/anxious|worried|stressed/)) return '😰';
      if (lowerMood.match(/depressed|sad|hurt|lonely/)) return '😢';
      return '😔';
    }
    
    // Neutral moods
    if (lowerSentiment.includes('slightly positive')) return '🙂';
    if (lowerSentiment.includes('slightly negative')) return '🙁';
    return '😐';
  };

  const renderEntry = ({ item }: { item: JournalEntry }) => (
    <TouchableOpacity 
      style={styles.entryCard}
      onPress={() => handleEditEntry(item)}
    >
      <View style={styles.entryHeader}>
        <Text style={styles.entryDate}>
          {format(new Date(item.createdAt), 'MMMM d, yyyy h:mm a')}
        </Text>
      </View>
      <Text style={styles.entryContent} numberOfLines={3}>
        {item.content}
      </Text>
      <View style={styles.cardFooter}>
        <View style={styles.editIconContainer}>
          <Ionicons name="pencil" size={16} color={COLORS.primary} />
        </View>
        {item.mood && (
          <View style={styles.emojiContainer}>
            <Text style={styles.emojiText}>
              {getMoodEmoji(item.mood, item.sentiment || '')}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
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
          showsVerticalScrollIndicator={true}
          ListEmptyComponent={() => (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No entries for this month</Text>
            </View>
          )}
        />

        <Modal
          visible={!!editingEntry}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setEditingEntry(null)}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <KeyboardAvoidingView 
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={styles.modalContainer}
            >
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Edit Journal Entry</Text>
                  <TouchableOpacity 
                    style={styles.closeButton}
                    onPress={() => setEditingEntry(null)}
                  >
                    <Ionicons name="close" size={24} color={COLORS.text} />
                  </TouchableOpacity>
                </View>

                <TextInput
                  style={styles.editInput}
                  value={editedContent}
                  onChangeText={setEditedContent}
                  multiline
                  autoFocus
                  placeholder="Write your thoughts..."
                  placeholderTextColor={COLORS.textSecondary}
                />

                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.deleteButton]}
                    onPress={handleDeleteEntry}
                  >
                    <Ionicons name="trash-outline" size={24} color={COLORS.error} />
                  </TouchableOpacity>
                  <View style={styles.actionButtons}>
                    <TouchableOpacity
                      style={[styles.modalButton, styles.cancelButton]}
                      onPress={() => setEditingEntry(null)}
                    >
                      <Text style={styles.cancelButtonText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.modalButton, styles.saveButton]}
                      onPress={handleSaveEdit}
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <ActivityIndicator color={COLORS.white} />
                      ) : (
                        <Text style={styles.saveButtonText}>Save Changes</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </KeyboardAvoidingView>
          </TouchableWithoutFeedback>
        </Modal>
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
    paddingTop: SIZES.padding,
  },
  header: {
    marginBottom: SIZES.padding,
    paddingHorizontal: SIZES.padding,
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
    paddingHorizontal: SIZES.padding,
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
    paddingHorizontal: SIZES.padding,
    paddingBottom: SIZES.padding * 4,
  },
  entryCard: {
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radius,
    padding: SIZES.padding,
    marginBottom: SIZES.padding,
    width: '100%',
    ...SHADOWS.small,
  },
  entryHeader: {
    marginBottom: SIZES.base,
  },
  entryDate: {
    ...FONTS.body2,
    color: COLORS.primary,
  },
  entryContent: {
    ...FONTS.body1,
    color: COLORS.text,
    marginBottom: SIZES.padding,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  editIconContainer: {
    padding: 4,
  },
  emojiContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.small,
  },
  emojiText: {
    fontSize: 20,
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
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: SIZES.radius * 2,
    borderTopRightRadius: SIZES.radius * 2,
    padding: SIZES.padding,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SIZES.padding,
  },
  modalTitle: {
    ...FONTS.h2,
    color: COLORS.text,
  },
  closeButton: {
    padding: SIZES.base,
  },
  editInput: {
    ...FONTS.body1,
    color: COLORS.text,
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radius,
    padding: SIZES.padding,
    height: 200,
    textAlignVertical: 'top',
    marginBottom: SIZES.padding,
  },
  modalActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZES.padding,
    marginTop: SIZES.padding,
  },
  actionButtons: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: SIZES.padding,
  },
  modalButton: {
    paddingVertical: SIZES.base * 1.5,
    paddingHorizontal: SIZES.padding,
    borderRadius: SIZES.radius,
    ...SHADOWS.small,
  },
  deleteButton: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.error + '30',
    padding: SIZES.base,
  },
  cancelButton: {
    backgroundColor: COLORS.surface,
  },
  saveButton: {
    backgroundColor: COLORS.primary,
  },
  cancelButtonText: {
    ...FONTS.body1,
    color: COLORS.textSecondary,
  },
  saveButtonText: {
    ...FONTS.body1,
    color: COLORS.white,
  },
}); 
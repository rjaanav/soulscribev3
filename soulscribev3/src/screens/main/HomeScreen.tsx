import React, { useMemo, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, Animated, Dimensions, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { COLORS, FONTS, SIZES, SHADOWS } from '../../constants/theme';
import { quotes } from '../../data/quotes';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { auth, db } from '../../services/firebase';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useFocusEffect } from '@react-navigation/native';

const MOOD_KEYWORDS = {
  positive: ['happy', 'excited', 'grateful', 'amazing', 'wonderful', 'blessed', 'joy', 'love', 'peaceful'],
  negative: ['sad', 'angry', 'frustrated', 'anxious', 'worried', 'stressed', 'tired', 'overwhelmed'],
  neutral: ['okay', 'fine', 'normal', 'average', 'alright']
};

const CIRCLE_SIZE = 35;
const CIRCLE_RADIUS = CIRCLE_SIZE / 2;
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CONTAINER_PADDING = SIZES.padding * 0.75;
const AVAILABLE_WIDTH = SCREEN_WIDTH - (SIZES.padding * 2) - (CONTAINER_PADDING * 2);
const CIRCLE_GAP = (AVAILABLE_WIDTH - (CIRCLE_SIZE * 7)) / 6;

const getMoodEmoji = (moodScore: number) => {
  // Very positive moods (0.7 to 1.0)
  if (moodScore >= 0.7) return '🌟';
  
  // Positive moods (0.3 to 0.7)
  if (moodScore >= 0.3) return '😄';
  
  // Slightly positive (0 to 0.3)
  if (moodScore > 0) return '🙂';
  
  // Neutral (0)
  if (moodScore === 0) return '😐';
  
  // Slightly negative (0 to -0.3)
  if (moodScore > -0.3) return '🙁';
  
  // Negative (-0.3 to -0.7)
  if (moodScore > -0.7) return '😔';
  
  // Very negative (-0.7 to -1.0)
  return '💔';
};

const getMoodColor = (moodScore: number) => {
  // Very positive moods (0.7 to 1.0)
  if (moodScore >= 0.7) return '#34C759'; // Bright green
  
  // Positive moods (0.3 to 0.7)
  if (moodScore >= 0.3) return '#90EE90'; // Light green
  
  // Slightly positive (0 to 0.3)
  if (moodScore > 0) return '#98FB98'; // Pale green
  
  // Neutral (0)
  if (moodScore === 0) return COLORS.primary;
  
  // Slightly negative (0 to -0.3)
  if (moodScore > -0.3) return '#FFA07A'; // Light salmon
  
  // Negative (-0.3 to -0.7)
  if (moodScore > -0.7) return '#FF6B6B'; // Lighter red
  
  // Very negative (-0.7 to -1.0)
  return '#FF0000'; // Pure red
};

// Helper function to get start and end of day
const getStartAndEndOfDay = (date: Date) => {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return { start, end };
};

// Helper function to normalize date to local midnight
const normalizeDate = (date: Date) => {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  return normalized;
};

// Helper function to get date key that ignores time
const getDateKey = (date: Date) => {
  const normalized = normalizeDate(date);
  return `${normalized.getFullYear()}-${String(normalized.getMonth() + 1).padStart(2, '0')}-${String(normalized.getDate()).padStart(2, '0')}`;
};

export default function HomeScreen() {
  const [streak, setStreak] = useState(0);
  const [lastEntry, setLastEntry] = useState<string | null>(null);
  const [flameSize, setFlameSize] = useState(24);
  const [isLoading, setIsLoading] = useState(true);
  const [streakAnimation] = useState(new Animated.Value(1));
  const [weeklyFeels, setWeeklyFeels] = useState<Array<{
    date: Date;
    mood: number;
    entry: string;
    energyLevel: Animated.Value;
  }>>([]);
  const [showMoodPreview, setShowMoodPreview] = useState<number | null>(null);

  // Get daily quote using the current date as seed
  const dailyQuote = useMemo(() => {
    const today = new Date();
    const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 1000 / 60 / 60 / 24);
    return quotes[dayOfYear % quotes.length];
  }, []);

  async function fetchWeeklyFeels() {
    if (!auth.currentUser) return;

    try {
      const today = new Date();
      const { start: startDate, end: endDate } = getStartAndEndOfDay(today);
      startDate.setDate(startDate.getDate() - 6); // Get last 7 days

      const journalsRef = collection(db, 'journals');
      const q = query(
        journalsRef,
        where('userId', '==', auth.currentUser.uid),
        where('createdAt', '>=', startDate.toISOString()),
        where('createdAt', '<=', endDate.toISOString()),
        orderBy('createdAt', 'desc')
      );

      const querySnapshot = await getDocs(q);
      
      // Group entries by date, using the most recent entry for each day
      const entriesByDate = new Map();
      
      querySnapshot.docs.forEach(doc => {
        const data = doc.data();
        const entryDate = new Date(data.createdAt);
        const dateKey = getDateKey(entryDate);
        
        // Only store the first entry for each date (most recent due to desc order)
        if (!entriesByDate.has(dateKey)) {
          entriesByDate.set(dateKey, {
            text: data.content || '',
            createdAt: entryDate,
            moodscore: data.moodScore || 0
          });
        }
      });

      // Create array for the last 7 days
      const feels = Array.from({ length: 7 }, (_, i) => {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateKey = getDateKey(date);
        const entry = entriesByDate.get(dateKey);

        return {
          date,
          mood: entry ? entry.moodscore : 0,
          entry: entry?.text || '',
          energyLevel: new Animated.Value(0)
        };
      }).reverse();

      setWeeklyFeels(feels);

      // Animate each circle sequentially
      feels.forEach((feel, index) => {
        Animated.sequence([
          Animated.delay(index * 100),
          Animated.spring(feel.energyLevel, {
            toValue: 1,
            useNativeDriver: true,
            tension: 50,
            friction: 3
          })
        ]).start();
      });

    } catch (error) {
      console.error('Error fetching weekly feels:', error);
    }
  }

  useFocusEffect(
    React.useCallback(() => {
      async function fetchDataAndCalculateStreak() {
        if (!auth.currentUser) return;

        try {
          // First fetch the latest data
          await fetchWeeklyFeels();

          // Helper function to normalize date to local midnight
          const normalizeDate = (date: Date) => {
            const normalized = new Date(date);
            normalized.setHours(0, 0, 0, 0);
            return normalized;
          };

          // Helper function to get date key that ignores time
          const getDateKey = (date: Date) => {
            const normalized = normalizeDate(date);
            return `${normalized.getFullYear()}-${String(normalized.getMonth() + 1).padStart(2, '0')}-${String(normalized.getDate()).padStart(2, '0')}`;
          };

          const today = new Date();
          const { start: todayStart, end: todayEnd } = getStartAndEndOfDay(today);

          // Start with last 30 days initially
          let startDate = new Date(todayStart);
          startDate.setDate(startDate.getDate() - 30);
          let hasMoreEntries = true;
          let allEntries = new Map();

          // Keep fetching older entries in 30-day chunks until we find a gap
          while (hasMoreEntries) {
            const journalsRef = collection(db, 'journals');
            const q = query(
              journalsRef,
              where('userId', '==', auth.currentUser.uid),
              where('createdAt', '>=', startDate.toISOString()),
              where('createdAt', '<=', todayEnd.toISOString()),
              orderBy('createdAt', 'desc')
            );

            const querySnapshot = await getDocs(q);
            const entries = querySnapshot.docs.map(doc => ({
              createdAt: new Date(doc.data().createdAt)
            }));

            if (entries.length === 0) {
              break;
            }

            // Group entries by normalized date
            entries.forEach(entry => {
              const dateKey = getDateKey(entry.createdAt);
              if (!allEntries.has(dateKey)) {
                allEntries.set(dateKey, entry.createdAt);
              }
            });

            // Get oldest entry date in current batch
            const oldestEntry = entries[entries.length - 1].createdAt;
            
            // Check if we need to look further back
            let checkDate = new Date(oldestEntry);
            checkDate.setDate(checkDate.getDate() - 1);
            
            // If we have a continuous streak up to the oldest entry, look further back
            if (allEntries.has(getDateKey(checkDate))) {
              startDate.setDate(startDate.getDate() - 30);
            } else {
              hasMoreEntries = false;
            }
          }

          if (allEntries.size === 0) {
            setStreak(0);
            return;
          }

          let currentStreak = 0;
          let checkDate = new Date(today);
          
          // Check if there's an entry today
          const todayKey = getDateKey(checkDate);
          const hasEntryToday = allEntries.has(todayKey);
          
          // If no entry today, check if there was one yesterday
          if (!hasEntryToday) {
            checkDate.setDate(checkDate.getDate() - 1);
            const yesterdayKey = getDateKey(checkDate);
            const hasEntryYesterday = allEntries.has(yesterdayKey);
            
            if (!hasEntryYesterday) {
              setStreak(0);
              return;
            }
          }

          // Count consecutive days
          const dates: string[] = [];
          while (allEntries.has(getDateKey(checkDate))) {
            currentStreak++;
            dates.push(getDateKey(checkDate));
            checkDate.setDate(checkDate.getDate() - 1);
          }

          setStreak(currentStreak);
        } catch (error) {
          console.error('Error calculating streak:', error);
        } finally {
          setIsLoading(false);
        }
      }

      fetchDataAndCalculateStreak();
    }, [])
  );

  // Animate streak counter
  useEffect(() => {
    Animated.sequence([
      Animated.timing(streakAnimation, {
        toValue: 1.2,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(streakAnimation, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, [streak]);

  useEffect(() => {
    const interval = setInterval(() => {
      setFlameSize((size) => (size === 24 ? 28 : 24));
    }, 1500);
    return () => clearInterval(interval);
  }, []);

  const getStreakMessage = () => {
    if (streak === 0) return "Start your streak today!";
    if (streak < 3) return "You're building momentum!";
    if (streak < 7) return "You're on fire! 🔥";
    if (streak < 14) return "Unstoppable! 🚀";
    if (streak < 30) return "You're a journaling master! 👑";
    return "Legendary streak! 🌟";
  };

  const getWeeklyInsight = (feels: typeof weeklyFeels) => {
    if (feels.length === 0) return "Start journaling to see your emotional patterns.";

    const hasEntries = feels.some(f => f.entry);
    if (!hasEntries) return "No entries this week. Take a moment to reflect on your day.";

    const averageMood = feels.reduce((sum, f) => sum + f.mood, 0) / feels.length;
    const entriesCount = feels.filter(f => f.entry).length;
    const positiveCount = feels.filter(f => f.mood > 0).length;
    const negativeCount = feels.filter(f => f.mood < 0).length;

    if (averageMood > 0.3) {
      return `A positive week with ${entriesCount} reflections. Keep nurturing this upward trend!`;
    } else if (averageMood < -0.3) {
      return `A challenging week with ${entriesCount} entries. Remember, every reflection is a step toward growth.`;
    } else {
      return `A balanced week with ${positiveCount} positive and ${negativeCount} challenging moments. Keep reflecting!`;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Home</Text>
            <Text style={styles.subtitle}>Your daily overview</Text>
          </View>
          <Image 
            source={require('../../../assets/soulscribelogowhite.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        <View style={styles.quoteContainer}>
          <View style={styles.quoteHeader}>
            <Text style={styles.quoteHeaderTitle}>Wellness Whispers</Text>
            <Text style={styles.quoteHeaderSubtitle}>Your daily dose of inspiration</Text>
          </View>
          <View style={styles.quoteContent}>
            <Text style={styles.quoteText}>"{dailyQuote.text}"</Text>
            <View style={styles.quoteAuthorContainer}>
              <View style={styles.quoteLine} />
              <Text style={styles.quoteAuthor}>— {dailyQuote.author}</Text>
            </View>
          </View>
        </View>

        <View style={styles.streakContainer}>
          <Animated.View 
            style={[
              styles.streakIconContainer,
              { transform: [{ scale: streakAnimation }] }
            ]}
          >
            <Ionicons 
              name="flame" 
              size={flameSize} 
              color={streak > 0 ? COLORS.primary : COLORS.textSecondary} 
            />
          </Animated.View>
          <View style={styles.streakTextContainer}>
            <Text style={styles.streakCount}>{streak} Day{streak !== 1 ? 's' : ''}</Text>
            <Text style={styles.streakMessage}>{getStreakMessage()}</Text>
          </View>
        </View>

        <View style={styles.weeklyFeelsContainer}>
          <View style={styles.weeklyFeelsHeader}>
            <Text style={styles.weeklyFeelsTitle}>The Weekly Feels</Text>
            <Text style={styles.weeklyFeelsSubtitle}>Your week in reflection</Text>
          </View>
          
          <View style={styles.moodVisualizerContainer}>
            {weeklyFeels.map((feel, index) => {
              const moodIntensity = Math.abs(feel.mood);
              const isPositive = feel.mood >= 0;
              const dayName = feel.date.toLocaleDateString('en-US', { weekday: 'short' });
              
              // Calculate rotation in degrees
              const degrees = Math.min(Math.abs(feel.mood * 360), 360);
              const rotation = feel.energyLevel.interpolate({
                inputRange: [0, 1],
                outputRange: [0, degrees]
              });

              // Calculate colors based on mood
              const baseColor = getMoodColor(feel.mood);
              const moodOpacity = Math.min(0.3 + (moodIntensity * 0.7), 1);
              
              return (
                <React.Fragment key={index}>
                  <TouchableOpacity 
                    style={styles.dayCircleContainer}
                    onPressIn={() => {
                      setShowMoodPreview(index);
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                    onPressOut={() => setShowMoodPreview(null)}
                  >
                    {/* Circular Progress */}
                    <Animated.View 
                      style={[
                        styles.circleProgress,
                        {
                          transform: [{ 
                            rotate: rotation.interpolate({
                              inputRange: [0, 360],
                              outputRange: ['0deg', '360deg']
                            })
                          }],
                          backgroundColor: baseColor,
                          opacity: feel.energyLevel.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0, moodOpacity]
                          })
                        }
                      ]}
                    >
                    </Animated.View>

                    {/* Inner Circle with Day Info */}
                    <View style={styles.innerCircle}>
                      <Text style={styles.dayLabel}>{dayName}</Text>
                      {feel.entry && (
                        <View 
                          style={[
                            styles.entryDot, 
                            { 
                              backgroundColor: baseColor,
                              opacity: moodOpacity
                            }
                          ]} 
                        />
                      )}
                    </View>
                    {feel.entry && (
                      <Text style={styles.moodEmoji}>
                        {getMoodEmoji(feel.mood)}
                      </Text>
                    )}
                  </TouchableOpacity>
                  
                  {/* Connector Line between circles */}
                  {index < weeklyFeels.length - 1 && (
                    <Animated.View 
                      style={[
                        styles.connector,
                        {
                          backgroundColor: baseColor,
                          opacity: feel.energyLevel.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0, 0.2]
                          })
                        }
                      ]}
                    />
                  )}
                </React.Fragment>
              );
            })}
          </View>
        </View>
      </View>

      {/* Mood Preview with full-screen blur - Moved to root level */}
      {showMoodPreview !== null && weeklyFeels[showMoodPreview]?.entry && (
        <View style={StyleSheet.absoluteFill}>
          <BlurView 
            intensity={20} 
            tint="light" 
            style={[StyleSheet.absoluteFill, { zIndex: 998 }]}
          />
          <View style={[styles.moodPreview, { zIndex: 999 }]}>
            <View style={styles.moodPreviewHeader}>
              <Text style={styles.moodPreviewDate}>
                {weeklyFeels[showMoodPreview].date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
              </Text>
            </View>
            <Text style={styles.moodPreviewText}>
              {weeklyFeels[showMoodPreview].entry.length > 300 
                ? weeklyFeels[showMoodPreview].entry.substring(0, 300) + '...'
                : weeklyFeels[showMoodPreview].entry}
            </Text>
          </View>
        </View>
      )}
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
    paddingBottom: SIZES.padding * 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SIZES.padding * 2,
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
  quoteContainer: {
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radius,
    padding: CONTAINER_PADDING,
    marginBottom: SIZES.padding,
    ...SHADOWS.small,
  },
  quoteHeader: {
    marginBottom: SIZES.padding * 0.5,
  },
  quoteHeaderTitle: {
    ...FONTS.h3,
    color: '#1F2937',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: 'bold',
  },
  quoteHeaderSubtitle: {
    ...FONTS.body2,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 2,
    fontSize: 11,
  },
  quoteIconContainer: {
    position: 'absolute',
    top: -10,
    left: SIZES.padding,
    backgroundColor: COLORS.surface,
    padding: 4,
    borderRadius: 12,
    ...SHADOWS.small,
  },
  quoteContent: {
    paddingTop: 0,
  },
  quoteText: {
    ...FONTS.body1,
    fontSize: 14,
    color: '#374151',
    fontStyle: 'italic',
    marginBottom: SIZES.padding,
    lineHeight: 20,
    textAlign: 'center',
  },
  quoteAuthorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: SIZES.base,
  },
  quoteLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.primary,
    marginRight: SIZES.padding,
  },
  quoteAuthor: {
    ...FONTS.body2,
    color: '#4B5563',
    fontSize: 12,
  },
  streakContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radius,
    padding: SIZES.padding * 0.75,
    marginBottom: SIZES.padding,
    ...SHADOWS.small,
  },
  streakIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SIZES.padding,
    borderWidth: 2,
    borderColor: COLORS.primary + '20',
  },
  streakTextContainer: {
    flex: 1,
  },
  streakCount: {
    ...FONTS.h2,
    color: '#1F2937',
    fontWeight: 'bold',
  },
  streakMessage: {
    ...FONTS.body2,
    color: '#6B7280',
  },
  weeklyFeelsContainer: {
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radius,
    padding: CONTAINER_PADDING,
    ...SHADOWS.small,
  },
  weeklyFeelsHeader: {
    marginBottom: SIZES.padding * 0.5,
  },
  weeklyFeelsTitle: {
    ...FONTS.h3,
    color: '#1F2937',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: 'bold',
  },
  weeklyFeelsSubtitle: {
    ...FONTS.body2,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 2,
    fontSize: 11,
  },
  moodVisualizerContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    height: 75,
    width: '100%',
    paddingTop: 10,
  },
  dayCircleContainer: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE + 25,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 0,
  },
  circleProgress: {
    position: 'absolute',
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_RADIUS,
    top: 0,
  },
  progressIndicator: {
    width: 2,
    height: CIRCLE_RADIUS,
    position: 'absolute',
    bottom: CIRCLE_RADIUS,
    left: CIRCLE_RADIUS - 1,
    transformOrigin: '50% 100%',
  },
  innerCircle: {
    width: CIRCLE_SIZE - 4,
    height: CIRCLE_SIZE - 4,
    borderRadius: (CIRCLE_SIZE - 4) / 2,
    backgroundColor: COLORS.surface,
    ...SHADOWS.small,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  dayLabel: {
    ...FONTS.body2,
    color: '#9CA3AF',
    fontSize: 9,
    textTransform: 'uppercase',
  },
  entryDot: {
    width: 2,
    height: 2,
    borderRadius: 1,
    position: 'absolute',
    bottom: 2,
  },
  connector: {
    height: 1,
    width: CIRCLE_GAP,
    marginTop: CIRCLE_SIZE / 2,
  },
  moodPreview: {
    position: 'absolute',
    left: '50%',
    top: '40%',
    transform: [{ translateX: -150 }, { translateY: -100 }],
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radius,
    width: 300,
    maxHeight: 400,
    ...SHADOWS.medium,
    overflow: 'hidden',
    elevation: 5,
    borderWidth: 1,
    borderColor: COLORS.primary + '20',
  },
  moodPreviewHeader: {
    padding: SIZES.padding,
    borderTopLeftRadius: SIZES.radius,
    borderTopRightRadius: SIZES.radius,
    backgroundColor: COLORS.primary,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.primary + '20',
  },
  moodPreviewDate: {
    ...FONTS.body2,
    color: COLORS.surface,
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '600',
  },
  moodPreviewText: {
    ...FONTS.body2,
    color: COLORS.text,
    fontSize: 16,
    padding: SIZES.padding,
    lineHeight: 24,
  },
  moodEmoji: {
    fontSize: 14,
    position: 'absolute',
    top: CIRCLE_SIZE + 5,
    opacity: 0.9,
  },
  logo: {
    width: 60,
    height: 60,
  },
});

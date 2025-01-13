import React, { useMemo, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, FONTS, SIZES, SHADOWS } from '../../constants/theme';
import { quotes } from '../../data/quotes';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { auth, db } from '../../services/firebase';
import { Ionicons } from '@expo/vector-icons';

export default function HomeScreen() {
  const [streak, setStreak] = useState(0);
  const [lastEntry, setLastEntry] = useState<string | null>(null);
  const [flameSize, setFlameSize] = useState(24);
  const [isLoading, setIsLoading] = useState(true);
  const [streakAnimation] = useState(new Animated.Value(1));

  // Get daily quote using the current date as seed
  const dailyQuote = useMemo(() => {
    const today = new Date();
    const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 1000 / 60 / 60 / 24);
    return quotes[dayOfYear % quotes.length];
  }, []);

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

  // Calculate streak
  useEffect(() => {
    async function calculateStreak() {
      if (!auth.currentUser) return;

      try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        const journalsRef = collection(db, 'journals');
        const q = query(
          journalsRef,
          where('userId', '==', auth.currentUser.uid),
          where('createdAt', '>=', yesterday.toISOString()),
          orderBy('createdAt', 'desc')
        );

        const querySnapshot = await getDocs(q);
        const entries = querySnapshot.docs.map(doc => ({
          createdAt: new Date(doc.data().createdAt),
        }));

        // Check if there's an entry today
        const hasEntryToday = entries.some(entry => entry.createdAt >= today);
        
        // Check if there's an entry yesterday
        const hasEntryYesterday = entries.some(
          entry => entry.createdAt >= yesterday && entry.createdAt < today
        );

        // If no entry today and no entry yesterday, reset streak
        if (!hasEntryToday && !hasEntryYesterday) {
          setStreak(0);
        } 
        // If has entry today, maintain or increment streak
        else if (hasEntryToday) {
          setStreak(prev => prev + 1);
        }
        // Otherwise maintain current streak
      } catch (error) {
        console.error('Error calculating streak:', error);
      } finally {
        setIsLoading(false);
      }
    }

    calculateStreak();
  }, []);

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

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Welcome to</Text>
            <Text style={styles.appName}>SoulScribe</Text>
          </View>
          <Image 
            source={require('../../../assets/soulscribelogowhite.png')}
            style={styles.logo}
            resizeMode="contain"
          />
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

        <View style={styles.quoteContainer}>
          <Text style={styles.quoteText}>"{dailyQuote.text}"</Text>
          <Text style={styles.quoteAuthor}>— {dailyQuote.author}</Text>
        </View>

        <View style={styles.messageContainer}>
          <Text style={styles.message}>
            Think out loud on the brain dump tab, or browse your saved journals in the vault.
          </Text>
        </View>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SIZES.padding * 2,
  },
  greeting: {
    ...FONTS.h2,
    color: COLORS.textSecondary,
  },
  appName: {
    ...FONTS.largeTitle,
    color: COLORS.primary,
    fontWeight: 'bold',
  },
  logo: {
    width: 80,
    height: 80,
  },
  messageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SIZES.padding * 2,
  },
  message: {
    ...FONTS.h3,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 28,
  },
  quoteContainer: {
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radius,
    padding: SIZES.padding * 1.5,
    marginVertical: SIZES.padding,
    ...SHADOWS.small,
  },
  quoteText: {
    ...FONTS.h3,
    color: COLORS.text,
    fontStyle: 'italic',
    marginBottom: SIZES.base,
    lineHeight: 24,
  },
  quoteAuthor: {
    ...FONTS.body2,
    color: COLORS.primary,
    textAlign: 'right',
  },
  streakContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radius,
    padding: SIZES.padding,
    marginBottom: SIZES.padding,
    ...SHADOWS.small,
  },
  streakIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
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
    color: COLORS.text,
    fontWeight: 'bold',
  },
  streakMessage: {
    ...FONTS.body2,
    color: COLORS.textSecondary,
  },
});

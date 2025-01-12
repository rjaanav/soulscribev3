import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, FONTS, SIZES, SHADOWS } from '../../constants/theme';

export default function HomeScreen() {
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
}); 
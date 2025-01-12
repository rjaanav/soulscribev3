import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { MainTabParamList } from '../../types/navigation';
import { COLORS, FONTS, SIZES, SHADOWS } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';

type NavigationProp = BottomTabNavigationProp<MainTabParamList, 'Home'>;

export default function HomeScreen() {
  const navigation = useNavigation<NavigationProp>();

  const NavigationButton = ({ 
    title, 
    icon, 
    screen, 
    description 
  }: { 
    title: string; 
    icon: string; 
    screen: keyof MainTabParamList;
    description: string;
  }) => (
    <TouchableOpacity
      style={styles.navigationButton}
      onPress={() => navigation.navigate(screen)}
    >
      <View style={styles.iconContainer}>
        <Ionicons name={icon as any} size={32} color={COLORS.primary} />
      </View>
      <View style={styles.buttonContent}>
        <Text style={styles.buttonTitle}>{title}</Text>
        <Text style={styles.buttonDescription}>{description}</Text>
      </View>
      <Ionicons name="chevron-forward" size={24} color={COLORS.textSecondary} />
    </TouchableOpacity>
  );

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

        <View style={styles.navigationContainer}>
          <NavigationButton
            title="Brain Dump"
            icon="mic-outline"
            screen="BrainDump"
            description="Record your thoughts and feelings"
          />
          <NavigationButton
            title="The Vault"
            icon="library-outline"
            screen="Vault"
            description="Browse your journal entries"
          />
          <NavigationButton
            title="Profile"
            icon="person-outline"
            screen="Profile"
            description="Manage your account"
          />
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
  navigationContainer: {
    gap: SIZES.padding,
  },
  navigationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radius,
    padding: SIZES.padding,
    ...SHADOWS.small,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primary + '10',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SIZES.padding,
  },
  buttonContent: {
    flex: 1,
  },
  buttonTitle: {
    ...FONTS.h3,
    color: COLORS.text,
    marginBottom: 4,
  },
  buttonDescription: {
    ...FONTS.body2,
    color: COLORS.textSecondary,
  },
  logo: {
    width: 80,
    height: 80,
  },
}); 
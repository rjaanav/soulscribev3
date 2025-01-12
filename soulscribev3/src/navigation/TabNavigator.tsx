import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MainTabParamList } from '../types/navigation';
import { COLORS, SIZES } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { Platform } from 'react-native';

// Import screens
import HomeScreen from '../screens/main/HomeScreen';
import BrainDumpScreen from '../screens/main/BrainDumpScreen';
import VaultScreen from '../screens/main/VaultScreen';
import ProfileScreen from '../screens/main/ProfileScreen';

const Tab = createBottomTabNavigator<MainTabParamList>();

export function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: COLORS.background,
          borderTopWidth: 0,
          elevation: 0,
          height: SIZES.padding * 3.5,
          paddingBottom: Platform.OS === 'ios' ? SIZES.padding : SIZES.padding / 2,
          paddingTop: SIZES.padding / 2,
          position: 'absolute',
          bottom: SIZES.padding / 115,
          left: SIZES.padding,
          right: SIZES.padding,
          borderRadius: SIZES.radius,
          ...Platform.select({
            ios: {
              shadowColor: COLORS.black,
              shadowOffset: {
                width: 0,
                height: 4,
              },
              shadowOpacity: 0.1,
              shadowRadius: 8,
            },
            android: {
              elevation: 8,
            },
          }),
        },
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textSecondary,
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
          paddingBottom: Platform.OS === 'ios' ? SIZES.base : 0,
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="BrainDump"
        component={BrainDumpScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="mic-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Vault"
        component={VaultScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="library-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
} 
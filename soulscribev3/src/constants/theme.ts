import { Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

export const COLORS = {
  // Primary colors
  primary: '#7C4DFF',
  primaryLight: '#B47CFF',
  primaryDark: '#3F1DCF',

  // Secondary colors
  secondary: '#03DAC6',
  secondaryLight: '#66FFF8',
  secondaryDark: '#00A896',

  // Neutral colors
  background: '#FFFFFF',
  surface: '#F5F5F5',
  error: '#B00020',
  text: '#121212',
  textSecondary: '#757575',
  border: '#E0E0E0',

  // Status colors
  success: '#4CAF50',
  warning: '#FB8C00',
  info: '#2196F3',

  // Common colors
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
};

export const SIZES = {
  // Global sizes
  base: 8,
  font: 14,
  radius: 12,
  padding: 24,

  // Font sizes
  largeTitle: 40,
  h1: 30,
  h2: 22,
  h3: 18,
  h4: 16,
  body1: 14,
  body2: 12,
  small: 10,

  // App dimensions
  width,
  height,
};

export const FONTS = {
  largeTitle: { fontSize: SIZES.largeTitle, lineHeight: 55 },
  h1: { fontSize: SIZES.h1, lineHeight: 36 },
  h2: { fontSize: SIZES.h2, lineHeight: 30 },
  h3: { fontSize: SIZES.h3, lineHeight: 22 },
  h4: { fontSize: SIZES.h4, lineHeight: 20 },
  body1: { fontSize: SIZES.body1, lineHeight: 22 },
  body2: { fontSize: SIZES.body2, lineHeight: 20 },
  small: { fontSize: SIZES.small, lineHeight: 18 },
};

export const SHADOWS = {
  small: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 2,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.30,
    shadowRadius: 4.65,
    elevation: 4,
  },
  large: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.37,
    shadowRadius: 7.49,
    elevation: 6,
  },
};

const theme = { COLORS, SIZES, FONTS, SHADOWS };

export default theme;

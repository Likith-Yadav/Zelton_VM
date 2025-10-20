import React from 'react';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, borderRadius, shadows } from '../theme/theme';

const GradientCard = ({
  children,
  variant = 'default',
  style,
  gradientStyle,
  ...props
}) => {
  const getGradientColors = () => {
    switch (variant) {
      case 'primary':
        return [colors.primary, colors.primaryLight];
      case 'secondary':
        return [colors.secondary, colors.secondaryLight];
      case 'accent':
        return [colors.accent, colors.accentLight];
      case 'success':
        return [colors.success, colors.accentLight];
      case 'warning':
        return [colors.warning, colors.secondaryLight];
      case 'error':
        return [colors.error, '#F87171'];
      case 'background':
        return [colors.background, colors.surfaceVariant];
      case 'surface':
        return [colors.surface, colors.background];
      default:
        return [colors.surface, colors.surfaceVariant];
    }
  };

  return (
    <View style={[styles.container, style]} {...props}>
      <LinearGradient
        colors={getGradientColors()}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.gradient, gradientStyle]}
      >
        {children}
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.lg,
    ...shadows.md,
  },
  gradient: {
    borderRadius: borderRadius.lg,
    padding: 16,
  },
});

export default GradientCard;

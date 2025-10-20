import React from "react";
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { colors, typography, borderRadius, shadows } from "../theme/theme";

const GradientButton = ({
  title,
  onPress,
  disabled = false,
  loading = false,
  variant = "primary",
  size = "medium",
  style,
  textStyle,
  icon,
  ...props
}) => {
  const getGradientColors = () => {
    switch (variant) {
      case "primary":
        return [colors.primary, colors.primaryDark];
      case "secondary":
        return [colors.secondary, colors.secondaryDark];
      case "accent":
        return [colors.accent, colors.accentDark];
      case "success":
        return [colors.success, colors.accentDark];
      case "warning":
        return [colors.warning, colors.secondaryDark];
      case "error":
        return [colors.error, "#DC2626"];
      default:
        return [colors.primary, colors.primaryDark];
    }
  };

  const getButtonSize = () => {
    switch (size) {
      case "small":
        return {
          paddingVertical: 8,
          paddingHorizontal: 16,
          fontSize: 14,
        };
      case "large":
        return {
          paddingVertical: 16,
          paddingHorizontal: 32,
          fontSize: 18,
        };
      default:
        return {
          paddingVertical: 12,
          paddingHorizontal: 24,
          fontSize: 16,
        };
    }
  };

  const buttonSize = getButtonSize();

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      style={[styles.container, style]}
      activeOpacity={0.8}
      {...props}
    >
      <LinearGradient
        colors={
          disabled ? [colors.textLight, colors.textLight] : getGradientColors()
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[
          styles.gradient,
          {
            paddingVertical: buttonSize.paddingVertical,
            paddingHorizontal: buttonSize.paddingHorizontal,
          },
        ]}
      >
        {loading ? (
          <ActivityIndicator color={colors.white} size="small" />
        ) : (
          <View style={styles.buttonContent}>
            {icon && (
              <Ionicons
                name={icon}
                size={buttonSize.fontSize}
                color={disabled ? colors.textSecondary : colors.white}
                style={styles.icon}
              />
            )}
            <Text
              style={[
                styles.text,
                {
                  fontSize: buttonSize.fontSize,
                  color: disabled ? colors.textSecondary : colors.white,
                },
                textStyle,
              ]}
            >
              {title}
            </Text>
          </View>
        )}
      </LinearGradient>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.lg,
    ...shadows.md,
  },
  gradient: {
    borderRadius: borderRadius.lg,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
  },
  text: {
    ...typography.button,
    fontWeight: "600",
    textAlign: "center",
  },
  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  icon: {
    marginRight: 8,
  },
});

export default GradientButton;

import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/theme';
import { formatPhoneInput, isValidPhoneInput, validatePhone } from '../utils/helpers';
import { PHONE_VALIDATION } from '../constants/constants';

const PhoneInputField = ({
  label,
  placeholder = "Enter your phone number",
  value,
  onChangeText,
  error,
  leftIcon = "call",
  required = false,
  disabled = false,
  style,
  inputStyle,
  ...props
}) => {
  const [isFocused, setIsFocused] = useState(false);

  const handleFocus = () => {
    setIsFocused(true);
  };

  const handleBlur = () => {
    setIsFocused(false);
  };

  const handleTextChange = (text) => {
    // Format the input to only allow digits and limit to 10 characters
    const formatted = formatPhoneInput(text);
    
    // Only call onChangeText if the input is valid
    if (isValidPhoneInput(text) || text === '') {
      onChangeText(formatted);
    }
  };

  const getBorderColor = () => {
    if (error) return colors.error;
    if (isFocused) return colors.primary;
    return colors.border;
  };

  return (
    <View style={[styles.container, style]}>
      {label && (
        <Text style={styles.label}>
          {label}
          {required && <Text style={styles.requiredStar}> *</Text>}
        </Text>
      )}
      <View
        style={[
          styles.inputContainer,
          {
            borderColor: getBorderColor(),
            backgroundColor: disabled ? colors.surfaceVariant : colors.surface,
          },
        ]}
      >
        {leftIcon && (
          <View style={styles.leftIconContainer}>
            <Ionicons name={leftIcon} size={20} color={colors.textSecondary} />
          </View>
        )}
        <TextInput
          style={[
            styles.input,
            {
              paddingLeft: leftIcon ? 40 : 16,
              paddingRight: 16,
            },
            inputStyle,
          ]}
          placeholder={placeholder}
          placeholderTextColor={colors.textLight}
          value={value}
          onChangeText={handleTextChange}
          onFocus={(e) => {
            handleFocus();
            // Call custom onFocus if provided
            if (props.onFocus) {
              props.onFocus(e);
            }
          }}
          onBlur={handleBlur}
          keyboardType="phone-pad"
          maxLength={PHONE_VALIDATION.MAX_LENGTH}
          editable={!disabled}
          {...props}
        />
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
      {value && value.length > 0 && value.length < PHONE_VALIDATION.MAX_LENGTH && (
        <Text style={styles.hintText}>
          {PHONE_VALIDATION.MAX_LENGTH - value.length} digits remaining
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  requiredStar: {
    color: colors.error,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 12,
    minHeight: 56,
  },
  leftIconContainer: {
    paddingLeft: 16,
    paddingRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
    minHeight: 56,
    textAlignVertical: 'center',
  },
  errorText: {
    color: colors.error,
    fontSize: 14,
    marginTop: 4,
    marginLeft: 4,
  },
  hintText: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
});

export default PhoneInputField;

import React from 'react';
import { View, Text, Image, StyleSheet, ViewStyle } from 'react-native';
import { colors, typography } from '../constants/theme';

export interface AvatarProps {
  url?: string | null;
  name?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  style?: ViewStyle;
}

const sizeMap = {
  sm: 36,
  md: 48,
  lg: 72,
  xl: 96,
};

export const Avatar: React.FC<AvatarProps> = ({
  url,
  name = 'Student',
  size = 'md',
  style,
}) => {
  const dimension = sizeMap[size];

  const getInitials = (str: string): string => {
    const parts = str.trim().split(/\s+/);
    if (parts.length >= 2 && parts[0] && parts[1]) {
      return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase();
    }
    return (str.slice(0, 2) || 'SC').toUpperCase();
  };

  return (
    <View
      style={[
        styles.container,
        {
          width: dimension,
          height: dimension,
          borderRadius: dimension / 2,
        },
        style,
      ]}
      accessibilityRole="image"
      accessibilityLabel={`Avatar of ${name}`}
    >
      {url ? (
        <Image
          source={{ uri: url }}
          style={{
            width: dimension,
            height: dimension,
            borderRadius: dimension / 2,
          }}
          resizeMode="cover"
        />
      ) : (
        <Text
          style={[
            styles.initialsText,
            {
              fontSize: dimension * 0.38,
            },
          ]}
        >
          {getInitials(name)}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  initialsText: {
    ...typography.h3,
    color: colors.textInverse,
    fontWeight: '700',
  },
});

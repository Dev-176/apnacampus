import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { colors, radius, typography, spacing } from '../constants/theme';
import { Modal } from './Modal';
import { Input } from './Input';

export interface PickerItem {
  id: string;
  label: string;
  sublabel?: string | null;
}

export interface SearchablePickerProps {
  label: string;
  placeholder?: string;
  items: PickerItem[];
  selectedId: string | null;
  onSelect: (item: PickerItem) => void;
  error?: string;
  style?: ViewStyle;
  customActionText?: string;
  onCustomActionPress?: () => void;
}

export const SearchablePicker: React.FC<SearchablePickerProps> = ({
  label,
  placeholder = 'Select an option',
  items,
  selectedId,
  onSelect,
  error,
  style,
  customActionText,
  onCustomActionPress,
}) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const selectedItem = useMemo(() => {
    return items.find((item) => item.id === selectedId);
  }, [items, selectedId]);

  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return items;
    const q = searchQuery.toLowerCase().trim();
    return items.filter(
      (item) =>
        item.label.toLowerCase().includes(q) ||
        (item.sublabel && item.sublabel.toLowerCase().includes(q))
    );
  }, [items, searchQuery]);

  const handleSelect = (item: PickerItem) => {
    onSelect(item);
    setModalVisible(false);
    setSearchQuery('');
  };

  return (
    <View style={[styles.container, style]}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => setModalVisible(true)}
        style={[
          styles.trigger,
          Boolean(error) && styles.triggerError,
        ]}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${selectedItem ? selectedItem.label : placeholder}`}
      >
        <Text
          style={[
            styles.triggerText,
            !selectedItem && styles.placeholderText,
          ]}
        >
          {selectedItem ? selectedItem.label : placeholder}
        </Text>
        <Text style={styles.chevron}>▾</Text>
      </TouchableOpacity>

      {Boolean(error) && <Text style={styles.errorText}>{error}</Text>}

      <Modal
        visible={modalVisible}
        title={label}
        onClose={() => {
          setModalVisible(false);
          setSearchQuery('');
        }}
      >
        <Input
          placeholder="Search..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoFocus
        />

        <FlatList
          data={filteredItems}
          keyExtractor={(item) => item.id}
          style={styles.list}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No results found.</Text>
            </View>
          }
          renderItem={({ item }) => {
            const isSelected = item.id === selectedId;
            return (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => handleSelect(item)}
                style={[
                  styles.listItem,
                  isSelected && styles.listItemSelected,
                ]}
                accessibilityRole="button"
                accessibilityLabel={item.label}
              >
                <View>
                  <Text
                    style={[
                      styles.itemLabel,
                      isSelected && styles.itemLabelSelected,
                    ]}
                  >
                    {item.label}
                  </Text>
                  {item.sublabel ? (
                    <Text style={styles.itemSublabel}>{item.sublabel}</Text>
                  ) : null}
                </View>
                {isSelected ? <Text style={styles.checkmark}>✓</Text> : null}
              </TouchableOpacity>
            );
          }}
        />

        {customActionText && onCustomActionPress ? (
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => {
              setModalVisible(false);
              onCustomActionPress();
            }}
            style={styles.customActionRow}
          >
            <Text style={styles.customActionText}>+ {customActionText}</Text>
          </TouchableOpacity>
        ) : null}
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
    width: '100%',
  },
  label: {
    ...typography.bodySmall,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  trigger: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    minHeight: 48, // 48dp minimum
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  triggerError: {
    borderColor: colors.error,
  },
  triggerText: {
    ...typography.body,
    color: colors.textPrimary,
    flex: 1,
  },
  placeholderText: {
    color: colors.textMuted,
  },
  chevron: {
    fontSize: 18,
    color: colors.textMuted,
    marginLeft: spacing.sm,
  },
  errorText: {
    ...typography.caption,
    color: colors.error,
    marginTop: spacing.xs,
  },
  list: {
    maxHeight: 280,
    marginTop: spacing.sm,
  },
  listItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceSubtle,
    minHeight: 48,
  },
  listItemSelected: {
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radius.sm,
  },
  itemLabel: {
    ...typography.body,
    color: colors.textPrimary,
  },
  itemLabelSelected: {
    color: colors.primary,
    fontWeight: '600',
  },
  itemSublabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  checkmark: {
    color: colors.primary,
    fontWeight: '700',
    fontSize: 16,
  },
  emptyContainer: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    ...typography.bodySmall,
    color: colors.textMuted,
  },
  customActionRow: {
    marginTop: spacing.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    minHeight: 48,
    justifyContent: 'center',
  },
  customActionText: {
    ...typography.button,
    color: colors.primary,
    fontWeight: '600',
  },
});

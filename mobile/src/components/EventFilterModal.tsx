import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Pressable,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

interface FilterOptions {
  status?: 'IN_PROGRESS' | 'CLOSED' | 'ALL';
  type?: 'THEFT' | 'LOST' | 'ACCIDENT' | 'FIRE' | 'GENERAL' | 'ALL';
  sortBy: 'createdAt' | 'type';
  sortOrder: 'asc' | 'desc';
}

interface Props {
  visible: boolean;
  onClose: () => void;
  onApply: (filters: FilterOptions) => void;
  initialFilters?: FilterOptions;
}

const EVENT_STATUSES = [
  { label: 'Todos', value: 'ALL', icon: 'apps-outline' as const },
  { label: 'En Progreso', value: 'IN_PROGRESS', icon: 'radio-button-on' as const },
  { label: 'Cerrados', value: 'CLOSED', icon: 'checkmark-circle-outline' as const },
];

const EVENT_TYPES = [
  { label: 'Todos', value: 'ALL', icon: 'apps-outline' as const },
  { label: 'Robo', value: 'THEFT', icon: 'warning-outline' as const },
  { label: 'Extravío', value: 'LOST', icon: 'search-outline' as const },
  { label: 'Accidente', value: 'ACCIDENT', icon: 'car-outline' as const },
  { label: 'Incendio', value: 'FIRE', icon: 'flame-outline' as const },
  { label: 'General', value: 'GENERAL', icon: 'alert-circle-outline' as const },
];

const SORT_OPTIONS = [
  { label: 'Más recientes', value: 'desc', icon: 'arrow-down-outline' as const },
  { label: 'Más antiguos', value: 'asc', icon: 'arrow-up-outline' as const },
];

export default function EventFilterModal({
  visible,
  onClose,
  onApply,
  initialFilters,
}: Props) {
  const { theme, isDark } = useTheme();
  const [filters, setFilters] = useState<FilterOptions>({
    status: 'ALL',
    type: 'ALL',
    sortBy: 'createdAt',
    sortOrder: 'desc',
    ...initialFilters,
  });

  useEffect(() => {
    if (initialFilters) {
      setFilters({ ...filters, ...initialFilters });
    }
  }, [initialFilters]);

  const handleApply = () => {
    onApply(filters);
    onClose();
  };

  const handleReset = () => {
    const defaultFilters = {
      status: 'ALL' as const,
      type: 'ALL' as const,
      sortBy: 'createdAt' as const,
      sortOrder: 'desc' as const,
    };
    setFilters(defaultFilters);
  };

  const hasActiveFilters = filters.status !== 'ALL' || filters.type !== 'ALL' || filters.sortOrder !== 'desc';

  const chipBg = isDark ? '#2C2C2E' : '#F2F2F7';
  const chipActiveBg = theme.primary.main;
  const chipBorder = isDark ? '#3A3A3C' : '#E5E5EA';

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          style={[styles.container, { backgroundColor: theme.surface }]}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Handle bar */}
          <View style={styles.handleContainer}>
            <View style={[styles.handle, { backgroundColor: isDark ? '#5C5C5E' : '#C7C7CC' }]} />
          </View>

          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              onPress={handleReset}
              style={styles.headerButton}
              disabled={!hasActiveFilters}
            >
              <Text style={[
                styles.headerButtonText,
                { color: hasActiveFilters ? theme.primary.main : theme.textSecondary }
              ]}>
                Limpiar
              </Text>
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: theme.text }]}>Filtros</Text>
            <TouchableOpacity onPress={handleApply} style={styles.headerButton}>
              <Text style={[styles.headerButtonText, { color: theme.primary.main, fontWeight: '600' }]}>
                Aplicar
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.content}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            {/* Status Filter */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>ESTADO</Text>
              <View style={styles.chipsRow}>
                {EVENT_STATUSES.map((status) => {
                  const isActive = filters.status === status.value;
                  return (
                    <TouchableOpacity
                      key={status.value}
                      style={[
                        styles.chip,
                        {
                          backgroundColor: isActive ? chipActiveBg : chipBg,
                          borderColor: isActive ? chipActiveBg : chipBorder,
                        },
                      ]}
                      onPress={() => setFilters({ ...filters, status: status.value as any })}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name={status.icon}
                        size={16}
                        color={isActive ? '#FFFFFF' : theme.textSecondary}
                        style={styles.chipIcon}
                      />
                      <Text
                        style={[
                          styles.chipText,
                          { color: isActive ? '#FFFFFF' : theme.text },
                        ]}
                      >
                        {status.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Type Filter */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>TIPO DE EVENTO</Text>
              <View style={styles.chipsRow}>
                {EVENT_TYPES.map((type) => {
                  const isActive = filters.type === type.value;
                  return (
                    <TouchableOpacity
                      key={type.value}
                      style={[
                        styles.chip,
                        {
                          backgroundColor: isActive ? chipActiveBg : chipBg,
                          borderColor: isActive ? chipActiveBg : chipBorder,
                        },
                      ]}
                      onPress={() => setFilters({ ...filters, type: type.value as any })}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name={type.icon}
                        size={16}
                        color={isActive ? '#FFFFFF' : theme.textSecondary}
                        style={styles.chipIcon}
                      />
                      <Text
                        style={[
                          styles.chipText,
                          { color: isActive ? '#FFFFFF' : theme.text },
                        ]}
                      >
                        {type.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Sort Order */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>ORDENAR POR FECHA</Text>
              <View style={styles.chipsRow}>
                {SORT_OPTIONS.map((order) => {
                  const isActive = filters.sortOrder === order.value;
                  return (
                    <TouchableOpacity
                      key={order.value}
                      style={[
                        styles.chip,
                        styles.chipWide,
                        {
                          backgroundColor: isActive ? chipActiveBg : chipBg,
                          borderColor: isActive ? chipActiveBg : chipBorder,
                        },
                      ]}
                      onPress={() => setFilters({ ...filters, sortOrder: order.value as any })}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name={order.icon}
                        size={16}
                        color={isActive ? '#FFFFFF' : theme.textSecondary}
                        style={styles.chipIcon}
                      />
                      <Text
                        style={[
                          styles.chipText,
                          { color: isActive ? '#FFFFFF' : theme.text },
                        ]}
                      >
                        {order.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Bottom spacing for safe area */}
            <View style={{ height: 20 }} />
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '70%',
  },
  handleContainer: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  handle: {
    width: 36,
    height: 5,
    borderRadius: 2.5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  headerButton: {
    minWidth: 60,
  },
  headerButtonText: {
    fontSize: 16,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  content: {
    paddingHorizontal: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipWide: {
    flex: 1,
    justifyContent: 'center',
  },
  chipIcon: {
    marginRight: 6,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '500',
  },
});

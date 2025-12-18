import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
} from 'react-native';

interface FilterOptions {
  status?: 'IN_PROGRESS' | 'CLOSED' | 'ALL';
  type?: 'THEFT' | 'LOST' | 'ACCIDENT' | 'FIRE' | 'ALL';
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
  { label: 'Todos', value: 'ALL' },
  { label: 'En Progreso', value: 'IN_PROGRESS' },
  { label: 'Cerrados', value: 'CLOSED' },
];

const EVENT_TYPES = [
  { label: 'Todos', value: 'ALL' },
  { label: 'Robo', value: 'THEFT' },
  { label: 'Extravío', value: 'LOST' },
  { label: 'Accidente', value: 'ACCIDENT' },
  { label: 'Incendio', value: 'FIRE' },
];

const SORT_OPTIONS = [
  { label: 'Fecha de creación', value: 'createdAt' },
  { label: 'Tipo', value: 'type' },
];

const SORT_ORDERS = [
  { label: 'Más recientes primero', value: 'desc' },
  { label: 'Más antiguos primero', value: 'asc' },
];

export default function EventFilterModal({
  visible,
  onClose,
  onApply,
  initialFilters,
}: Props) {
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

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Filtros y Ordenamiento</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.closeButton}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content}>
            {/* Status Filter */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Estado</Text>
              <View style={styles.optionsRow}>
                {EVENT_STATUSES.map((status) => (
                  <TouchableOpacity
                    key={status.value}
                    style={[
                      styles.optionButton,
                      filters.status === status.value && styles.optionButtonActive,
                    ]}
                    onPress={() => setFilters({ ...filters, status: status.value as any })}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        filters.status === status.value && styles.optionTextActive,
                      ]}
                    >
                      {status.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Type Filter */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Tipo de Evento</Text>
              <View style={styles.optionsRow}>
                {EVENT_TYPES.map((type) => (
                  <TouchableOpacity
                    key={type.value}
                    style={[
                      styles.optionButton,
                      filters.type === type.value && styles.optionButtonActive,
                    ]}
                    onPress={() => setFilters({ ...filters, type: type.value as any })}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        filters.type === type.value && styles.optionTextActive,
                      ]}
                    >
                      {type.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Sort By */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Ordenar por</Text>
              <View style={styles.optionsColumn}>
                {SORT_OPTIONS.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.optionButtonFull,
                      filters.sortBy === option.value && styles.optionButtonActive,
                    ]}
                    onPress={() => setFilters({ ...filters, sortBy: option.value as any })}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        filters.sortBy === option.value && styles.optionTextActive,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Sort Order */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Orden</Text>
              <View style={styles.optionsColumn}>
                {SORT_ORDERS.map((order) => (
                  <TouchableOpacity
                    key={order.value}
                    style={[
                      styles.optionButtonFull,
                      filters.sortOrder === order.value && styles.optionButtonActive,
                    ]}
                    onPress={() => setFilters({ ...filters, sortOrder: order.value as any })}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        filters.sortOrder === order.value && styles.optionTextActive,
                      ]}
                    >
                      {order.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity style={styles.resetButton} onPress={handleReset}>
              <Text style={styles.resetButtonText}>Restablecer</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.applyButton} onPress={handleApply}>
              <Text style={styles.applyButtonText}>Aplicar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
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
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    fontSize: 24,
    color: '#666',
  },
  content: {
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  optionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionsColumn: {
    gap: 8,
  },
  optionButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff',
  },
  optionButtonFull: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff',
  },
  optionButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  optionText: {
    fontSize: 14,
    color: '#666',
  },
  optionTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  resetButton: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  resetButtonText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '600',
  },
  applyButton: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    backgroundColor: '#007AFF',
    alignItems: 'center',
  },
  applyButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
});

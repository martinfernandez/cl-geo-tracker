import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Platform,
  FlatList,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { groupApi } from '../services/api';
import { useToast } from '../contexts/ToastContext';
import debounce from 'lodash/debounce';

interface SearchUser {
  id: string;
  name: string;
  email: string;
}

export default function GroupInviteScreen({ navigation, route }: any) {
  const { groupId, groupName } = route.params;
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [invitingUserId, setInvitingUserId] = useState<string | null>(null);
  const [emailInput, setEmailInput] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);
  const { showSuccess, showError } = useToast();

  const searchUsers = async (query: string) => {
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      setSearching(true);
      const results = await groupApi.searchUsers(groupId, query);
      setSearchResults(results);
    } catch (error) {
      console.error('Error searching users:', error);
    } finally {
      setSearching(false);
    }
  };

  const debouncedSearch = useCallback(
    debounce((query: string) => searchUsers(query), 300),
    [groupId]
  );

  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
    debouncedSearch(text);
  };

  const handleInviteUser = async (user: SearchUser) => {
    try {
      setInvitingUserId(user.id);
      await groupApi.sendInvitation(groupId, user.id);
      showSuccess(`Invitacion enviada a ${user.name}`);
      // Remove from search results
      setSearchResults((prev) => prev.filter((u) => u.id !== user.id));
    } catch (error: any) {
      console.error('Error inviting user:', error);
      const errorMessage = error.response?.data?.error || 'No se pudo enviar la invitacion';
      showError(errorMessage);
    } finally {
      setInvitingUserId(null);
    }
  };

  const validateEmail = (email: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const handleSendEmailInvitation = async () => {
    if (!emailInput.trim()) {
      showError('Ingresa un email');
      return;
    }

    if (!validateEmail(emailInput.trim())) {
      showError('Ingresa un email valido');
      return;
    }

    try {
      setSendingEmail(true);
      await groupApi.sendEmailInvitation(groupId, emailInput.trim());
      showSuccess(`Invitacion enviada a ${emailInput.trim()}`);
      setEmailInput('');
    } catch (error: any) {
      console.error('Error sending email invitation:', error);
      const errorMessage = error.response?.data?.error || 'No se pudo enviar la invitacion';
      showError(errorMessage);
    } finally {
      setSendingEmail(false);
    }
  };

  const renderUserItem = ({ item }: { item: SearchUser }) => {
    const isInviting = invitingUserId === item.id;

    return (
      <View style={styles.userItem}>
        <View style={styles.userAvatar}>
          <Text style={styles.userAvatarText}>
            {item.name.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{item.name}</Text>
          <Text style={styles.userEmail}>{item.email}</Text>
        </View>
        <TouchableOpacity
          style={[styles.inviteButton, isInviting && styles.inviteButtonDisabled]}
          onPress={() => handleInviteUser(item)}
          disabled={isInviting}
        >
          {isInviting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.inviteButtonText}>Invitar</Text>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.headerButton}
        >
          <Ionicons name="arrow-back" size={24} color="#262626" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Invitar Miembros</Text>
          <Text style={styles.headerSubtitle}>{groupName}</Text>
        </View>
        <View style={styles.headerButton} />
      </View>

      {/* Search Section */}
      <View style={styles.searchSection}>
        <Text style={styles.sectionTitle}>Buscar usuarios registrados</Text>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search" size={20} color="#8E8E93" />
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={handleSearchChange}
            placeholder="Buscar por nombre o email..."
            placeholderTextColor="#8E8E93"
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => {
              setSearchQuery('');
              setSearchResults([]);
            }}>
              <Ionicons name="close-circle" size={20} color="#8E8E93" />
            </TouchableOpacity>
          )}
        </View>

        {/* Search Results */}
        {searching ? (
          <View style={styles.searchingContainer}>
            <ActivityIndicator size="small" color="#007AFF" />
            <Text style={styles.searchingText}>Buscando...</Text>
          </View>
        ) : searchQuery.length >= 2 && searchResults.length === 0 ? (
          <View style={styles.noResultsContainer}>
            <Ionicons name="person-outline" size={32} color="#ccc" />
            <Text style={styles.noResultsText}>No se encontraron usuarios</Text>
          </View>
        ) : (
          <FlatList
            data={searchResults}
            renderItem={renderUserItem}
            keyExtractor={(item) => item.id}
            style={styles.resultsList}
            scrollEnabled={false}
          />
        )}
      </View>

      {/* Divider */}
      <View style={styles.divider}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>O</Text>
        <View style={styles.dividerLine} />
      </View>

      {/* Email Invitation Section */}
      <View style={styles.emailSection}>
        <Text style={styles.sectionTitle}>Invitar por email</Text>
        <Text style={styles.sectionDescription}>
          Envia una invitacion a alguien que aun no esta registrado
        </Text>
        <View style={styles.emailInputContainer}>
          <TextInput
            style={styles.emailInput}
            value={emailInput}
            onChangeText={setEmailInput}
            placeholder="correo@ejemplo.com"
            placeholderTextColor="#8E8E93"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TouchableOpacity
            style={[
              styles.sendEmailButton,
              (!emailInput.trim() || sendingEmail) && styles.sendEmailButtonDisabled,
            ]}
            onPress={handleSendEmailInvitation}
            disabled={!emailInput.trim() || sendingEmail}
          >
            {sendingEmail ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="send" size={20} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Info */}
      <View style={styles.infoContainer}>
        <Ionicons name="information-circle-outline" size={20} color="#8E8E93" />
        <Text style={styles.infoText}>
          Los usuarios invitados recibiran una notificacion. Si invitas por email,
          recibiran un correo con instrucciones para unirse al grupo.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: Platform.OS === 'ios' ? 50 : 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerButton: {
    padding: 8,
    minWidth: 40,
  },
  headerTitleContainer: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#262626',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#8E8E93',
    marginTop: 2,
  },
  searchSection: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#262626',
    marginBottom: 12,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    marginTop: -4,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    paddingHorizontal: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#262626',
    paddingVertical: 12,
  },
  searchingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 8,
  },
  searchingText: {
    fontSize: 14,
    color: '#8E8E93',
  },
  noResultsContainer: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 8,
  },
  noResultsText: {
    fontSize: 14,
    color: '#8E8E93',
  },
  resultsList: {
    marginTop: 8,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  userAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E8F4FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  userAvatarText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#007AFF',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#262626',
  },
  userEmail: {
    fontSize: 13,
    color: '#8E8E93',
    marginTop: 2,
  },
  inviteButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 80,
    alignItems: 'center',
  },
  inviteButtonDisabled: {
    backgroundColor: '#C7C7CC',
  },
  inviteButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginVertical: 8,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E0E0E0',
  },
  dividerText: {
    fontSize: 14,
    color: '#8E8E93',
    marginHorizontal: 16,
  },
  emailSection: {
    padding: 16,
  },
  emailInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  emailInput: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#262626',
  },
  sendEmailButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendEmailButtonDisabled: {
    backgroundColor: '#C7C7CC',
  },
  infoContainer: {
    flexDirection: 'row',
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 16,
    margin: 16,
    marginTop: 'auto',
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
});

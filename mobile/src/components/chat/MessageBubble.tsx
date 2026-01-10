import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { useTheme } from '../../contexts/ThemeContext';

interface Message {
  id: string;
  content: string;
  createdAt: string;
  isRead: boolean;
  senderId: string;
  sender?: {
    id: string;
    name: string;
  };
}

interface Props {
  message: Message;
  isOwnMessage: boolean;
  showTimestamp?: boolean;
  showSenderName?: boolean;
}

export default function MessageBubble({ message, isOwnMessage, showTimestamp = true, showSenderName = false }: Props) {
  const { theme, isDark } = useTheme();
  const formattedTime = formatDistanceToNow(new Date(message.createdAt), {
    addSuffix: true,
    locale: es,
  });

  return (
    <View style={[styles.container, isOwnMessage && styles.ownMessageContainer]}>
      {showSenderName && message.sender && (
        <Text style={[styles.senderName, { color: theme.primary.main }]}>{message.sender.name}</Text>
      )}
      <View style={[
        styles.bubble,
        isOwnMessage
          ? styles.ownBubble
          : [styles.otherBubble, { backgroundColor: isDark ? '#2C2C2E' : '#E5E5EA' }]
      ]}>
        <Text style={[
          styles.messageText,
          { color: isOwnMessage ? '#fff' : theme.text }
        ]}>
          {message.content}
        </Text>
      </View>

      {showTimestamp && (
        <View style={[
          styles.timestampContainer,
          { backgroundColor: isDark ? 'rgba(44, 44, 46, 0.9)' : 'rgba(255, 255, 255, 0.85)' },
          isOwnMessage && styles.ownTimestampContainer
        ]}>
          <Text style={[styles.timestamp, { color: theme.textSecondary }]}>{formattedTime}</Text>
          {isOwnMessage && (
            <View style={styles.readReceipt}>
              <Ionicons
                name={message.isRead ? 'checkmark-done' : 'checkmark'}
                size={14}
                color={message.isRead ? theme.primary.main : theme.textTertiary}
              />
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
    marginHorizontal: 12,
    maxWidth: '75%',
  },
  ownMessageContainer: {
    alignSelf: 'flex-end',
  },
  bubble: {
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
  ownBubble: {
    backgroundColor: '#007AFF',
    borderBottomRightRadius: 4,
  },
  otherBubble: {
    backgroundColor: '#E5E5EA',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
    color: '#000',
  },
  ownMessageText: {
    color: '#fff',
  },
  timestampContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    alignSelf: 'flex-start',
  },
  ownTimestampContainer: {
    alignSelf: 'flex-end',
    justifyContent: 'flex-end',
  },
  timestamp: {
    fontSize: 11,
    fontWeight: '500',
    color: '#6B6B6B',
  },
  readReceipt: {
    marginLeft: 4,
  },
  senderName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#007AFF',
    marginBottom: 4,
    paddingHorizontal: 4,
  },
});

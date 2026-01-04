import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StatusBar } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useOnboarding } from '../contexts/OnboardingContext';
import MessageNotification from '../components/MessageNotification';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../theme/colors';
import { PeekLogo } from '../components/PeekLogo';
import { MapScreen } from '../screens/MapScreen';
import { DevicesScreen } from '../screens/DevicesScreen';
import { AddDeviceScreen } from '../screens/AddDeviceScreen';
import DeviceDetailScreen from '../screens/DeviceDetailScreen';
import EventsScreen from '../screens/EventsScreen';
import AddEventScreen from '../screens/AddEventScreen';
import EditEventScreen from '../screens/EditEventScreen';
import EventDetailScreen from '../screens/EventDetailScreen';
import SettingsScreen from '../screens/SettingsScreen';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import AreasListScreen from '../screens/AreasListScreen';
import AreasSearchScreen from '../screens/AreasSearchScreen';
import AreaDetailScreen from '../screens/AreaDetailScreen';
import CreateAreaScreen from '../screens/CreateAreaScreen';
import NotificationsListScreen from '../screens/NotificationsListScreen';
import UserProfileScreen from '../screens/UserProfileScreen';
import ChatScreen from '../screens/ChatScreen';
import InboxScreen from '../screens/InboxScreen';
import GroupsScreen from '../screens/GroupsScreen';
import GroupDetailScreen from '../screens/GroupDetailScreen';
import CreateGroupScreen from '../screens/CreateGroupScreen';
import GroupInviteScreen from '../screens/GroupInviteScreen';
import { OnboardingScreen } from '../screens/onboarding/OnboardingScreen';
import { TutorialViewerScreen } from '../screens/onboarding/TutorialViewerScreen';
import { AddTaggedObjectScreen } from '../screens/AddTaggedObjectScreen';
import { DeviceQRScreen } from '../screens/DeviceQRScreen';
import { FoundChatsScreen } from '../screens/FoundChatsScreen';
import { FoundChatScreen } from '../screens/FoundChatScreen';

const Tab = createBottomTabNavigator();
const RootStack = createStackNavigator();
const DevicesStack = createStackNavigator();
const EventsStack = createStackNavigator();
const GroupsStack = createStackNavigator();
const AuthStack = createStackNavigator();

function DevicesStackNavigator() {
  return (
    <DevicesStack.Navigator screenOptions={{ headerShown: false }}>
      <DevicesStack.Screen
        name="DevicesList"
        component={DevicesScreen}
      />
      <DevicesStack.Screen
        name="AddDevice"
        component={AddDeviceScreen}
      />
      <DevicesStack.Screen
        name="AddTaggedObject"
        component={AddTaggedObjectScreen}
      />
      <DevicesStack.Screen
        name="DeviceDetail"
        component={DeviceDetailScreen}
      />
      <DevicesStack.Screen
        name="DeviceQR"
        component={DeviceQRScreen}
      />
    </DevicesStack.Navigator>
  );
}

function EventsStackNavigator() {
  return (
    <EventsStack.Navigator screenOptions={{ headerShown: false }}>
      <EventsStack.Screen
        name="EventsList"
        component={EventsScreen}
      />
      <EventsStack.Screen
        name="AddEvent"
        component={AddEventScreen}
      />
      <EventsStack.Screen
        name="EditEvent"
        component={EditEventScreen}
      />
    </EventsStack.Navigator>
  );
}

function GroupsStackNavigator() {
  return (
    <GroupsStack.Navigator screenOptions={{ headerShown: false }}>
      <GroupsStack.Screen
        name="GroupsList"
        component={GroupsScreen}
      />
      <GroupsStack.Screen
        name="GroupDetail"
        component={GroupDetailScreen}
      />
      <GroupsStack.Screen
        name="CreateGroup"
        component={CreateGroupScreen}
      />
      <GroupsStack.Screen
        name="GroupInvite"
        component={GroupInviteScreen}
      />
    </GroupsStack.Navigator>
  );
}

function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Register" component={RegisterScreen} />
    </AuthStack.Navigator>
  );
}

// Custom FAB button for creating events
function CreateEventButton({ onPress }: { onPress: () => void }) {
  return (
    <TouchableOpacity
      style={fabStyles.container}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={fabStyles.button}>
        <View style={fabStyles.iconContainer}>
          <Ionicons name="add" size={32} color="#fff" />
        </View>
      </View>
    </TouchableOpacity>
  );
}

// Placeholder component for the center tab (won't actually render)
function CreateEventPlaceholder() {
  return null;
}

const fabStyles = StyleSheet.create({
  container: {
    top: -28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  button: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.primary.main,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.primary.dark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 4,
    borderColor: colors.neutral[0],
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

function MainTabNavigator() {
  const navigation = useNavigation<any>();
  const [unreadMessageCount, setUnreadMessageCount] = React.useState(0);
  const [activeFoundChatsCount, setActiveFoundChatsCount] = React.useState(0);

  const loadUnreadCount = React.useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      if (!token) return;

      // Fetch unread message count using axios (has auto-logout on 401)
      const { api } = await import('../services/api');

      try {
        const response = await api.get('/messages/unread/count');
        setUnreadMessageCount(response.data.count || 0);
      } catch (err: any) {
        if (err.response?.status !== 401) {
          console.error('Error loading unread message count:', err);
        }
      }

      // Fetch unread found object notifications count
      try {
        const notificationsResponse = await api.get('/notifications?unreadOnly=true');
        const notifications = notificationsResponse.data || [];
        const foundObjectNotifications = notifications.filter(
          (n: any) => n.type === 'FOUND_OBJECT' || n.type === 'FOUND_OBJECT_MESSAGE'
        );
        setActiveFoundChatsCount(foundObjectNotifications.length);
      } catch (err: any) {
        if (err.response?.status !== 401) {
          console.error('Error loading found object notifications count:', err);
        }
      }
    } catch (error) {
      console.error('Error loading unread count:', error);
    }
  }, []);

  React.useEffect(() => {
    loadUnreadCount();
    const interval = setInterval(loadUnreadCount, 30000); // Poll every 30 seconds

    // Listen for new messages via WebSocket
    const { wsService } = require('../services/websocket');

    const handleNewMessage = () => {
      // Increment badge immediately, then refresh from server
      setUnreadMessageCount((prev) => prev + 1);
      loadUnreadCount();
    };

    wsService.on('new_message', handleNewMessage);

    return () => {
      clearInterval(interval);
      wsService.off('new_message', handleNewMessage);
    };
  }, [loadUnreadCount]);

  const handleCreateEvent = () => {
    navigation.navigate('Events', { screen: 'AddEvent' });
  };

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary.main,
        tabBarInactiveTintColor: colors.neutral[400],
        tabBarStyle: {
          backgroundColor: colors.neutral[0],
          borderTopWidth: 1,
          borderTopColor: colors.neutral[200],
          height: 85,
          paddingBottom: 20,
          paddingTop: 12,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
          marginTop: 4,
        },
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: any;

          if (route.name === 'Map') {
            iconName = focused ? 'map' : 'map-outline';
          } else if (route.name === 'Groups') {
            iconName = focused ? 'people' : 'people-outline';
          } else if (route.name === 'Messages') {
            iconName = focused ? 'chatbubble' : 'chatbubble-outline';
          } else if (route.name === 'Events') {
            iconName = focused ? 'alert-circle' : 'alert-circle-outline';
          } else if (route.name === 'Devices') {
            iconName = focused ? 'hardware-chip' : 'hardware-chip-outline';
          } else if (route.name === 'CreateEvent') {
            // This won't render normally - handled by tabBarButton
            return null;
          } else {
            iconName = 'help-circle-outline';
          }

          // Show Instagram-style badge on Messages tab
          // Combine unread messages and active found chats
          const totalBadgeCount = unreadMessageCount + activeFoundChatsCount;
          if (route.name === 'Messages' && totalBadgeCount > 0) {
            return (
              <View style={{ position: 'relative' }}>
                <Ionicons name={iconName} size={24} color={color} />
                <View
                  style={{
                    position: 'absolute',
                    right: -10,
                    top: -6,
                    backgroundColor: activeFoundChatsCount > 0 ? '#FF9500' : colors.error.main,
                    borderRadius: 10,
                    minWidth: 20,
                    height: 20,
                    paddingHorizontal: 5,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderWidth: 2,
                    borderColor: colors.neutral[0],
                  }}
                >
                  <Text
                    style={{
                      color: colors.neutral[0],
                      fontSize: 11,
                      fontWeight: '700',
                    }}
                  >
                    {totalBadgeCount > 99 ? '99+' : totalBadgeCount}
                  </Text>
                </View>
              </View>
            );
          }

          return <Ionicons name={iconName} size={24} color={color} />;
        },
      })}
    >
      <Tab.Screen
        name="Map"
        component={MapScreen}
        options={{ title: 'Mapa' }}
      />
      <Tab.Screen
        name="Groups"
        component={GroupsStackNavigator}
        options={{ title: 'Grupos' }}
        listeners={({ navigation: tabNavigation }) => ({
          tabPress: (e) => {
            // When pressing the Groups tab, reset to the GroupsList screen
            tabNavigation.navigate('Groups', { screen: 'GroupsList' });
          },
        })}
      />
      <Tab.Screen
        name="CreateEvent"
        component={CreateEventPlaceholder}
        options={{
          title: '',
          tabBarButton: (props) => (
            <CreateEventButton onPress={handleCreateEvent} />
          ),
        }}
        listeners={{
          tabPress: (e) => {
            e.preventDefault();
            handleCreateEvent();
          },
        }}
      />
      <Tab.Screen
        name="Messages"
        component={InboxScreen}
        options={{ title: 'Mensajes' }}
      />
      <Tab.Screen
        name="Events"
        component={EventsStackNavigator}
        options={{ title: 'Eventos' }}
        listeners={({ navigation: tabNavigation }) => ({
          tabPress: (e) => {
            // When pressing the Events tab, reset to the EventsList screen
            // This ensures that if user was on AddEvent and cancelled, they see the list
            tabNavigation.navigate('Events', { screen: 'EventsList' });
          },
        })}
      />
    </Tab.Navigator>
  );
}

function RootStackNavigator() {
  return (
    <>
      <MessageNotification />
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        <RootStack.Screen name="Main" component={MainTabNavigator} />
      <RootStack.Screen
        name="EventDetail"
        component={EventDetailScreen}
        options={{
          presentation: 'card',
          headerShown: false
        }}
      />
      <RootStack.Screen
        name="AreasList"
        component={AreasListScreen}
        options={{
          presentation: 'card',
          headerShown: false
        }}
      />
      <RootStack.Screen
        name="AreasSearch"
        component={AreasSearchScreen}
        options={{
          presentation: 'card',
          headerShown: false
        }}
      />
      <RootStack.Screen
        name="AreaDetail"
        component={AreaDetailScreen}
        options={{
          presentation: 'card',
          headerShown: false
        }}
      />
      <RootStack.Screen
        name="CreateArea"
        component={CreateAreaScreen}
        options={{
          presentation: 'card',
          headerShown: false
        }}
      />
      <RootStack.Screen
        name="NotificationsList"
        component={NotificationsListScreen}
        options={{
          presentation: 'card',
          headerShown: false
        }}
      />
      <RootStack.Screen
        name="UserProfile"
        component={UserProfileScreen}
        options={{
          presentation: 'card',
          headerShown: false
        }}
      />
      <RootStack.Screen
        name="Chat"
        component={ChatScreen}
        options={{
          presentation: 'card',
          headerShown: false
        }}
      />
      <RootStack.Screen
        name="Inbox"
        component={InboxScreen}
        options={{
          presentation: 'card',
          headerShown: false
        }}
      />
      <RootStack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          presentation: 'card',
          headerShown: false
        }}
      />
      <RootStack.Screen
        name="Devices"
        component={DevicesStackNavigator}
        options={{
          presentation: 'card',
          headerShown: false
        }}
      />
      <RootStack.Screen
        name="TutorialViewer"
        component={TutorialViewerScreen}
        options={{
          presentation: 'modal',
          headerShown: false
        }}
      />
      <RootStack.Screen
        name="FoundChats"
        component={FoundChatsScreen}
        options={{
          presentation: 'card',
          headerShown: false
        }}
      />
      <RootStack.Screen
        name="FoundChat"
        component={FoundChatScreen}
        options={{
          presentation: 'card',
          headerShown: false
        }}
      />
      </RootStack.Navigator>
    </>
  );
}

export function AppNavigator() {
  const { isAuthenticated, loading } = useAuth();
  const { hasCompletedOnboarding } = useOnboarding();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
        <StatusBar barStyle="dark-content" />
        <PeekLogo size="large" showBubble={false} />
      </View>
    );
  }

  if (!isAuthenticated) {
    return <AuthNavigator />;
  }

  if (!hasCompletedOnboarding) {
    return <OnboardingScreen />;
  }

  return <RootStackNavigator />;
}

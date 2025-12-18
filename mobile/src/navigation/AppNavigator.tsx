import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
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

const Tab = createBottomTabNavigator();
const RootStack = createStackNavigator();
const DevicesStack = createStackNavigator();
const EventsStack = createStackNavigator();
const AuthStack = createStackNavigator();

function DevicesStackNavigator() {
  return (
    <DevicesStack.Navigator>
      <DevicesStack.Screen
        name="DevicesList"
        component={DevicesScreen}
        options={{ title: 'Dispositivos' }}
      />
      <DevicesStack.Screen
        name="AddDevice"
        component={AddDeviceScreen}
        options={{ title: 'Agregar Dispositivo' }}
      />
      <DevicesStack.Screen
        name="DeviceDetail"
        component={DeviceDetailScreen}
        options={{ headerShown: false }}
      />
    </DevicesStack.Navigator>
  );
}

function EventsStackNavigator() {
  return (
    <EventsStack.Navigator>
      <EventsStack.Screen
        name="EventsList"
        component={EventsScreen}
        options={{ headerShown: false }}
      />
      <EventsStack.Screen
        name="AddEvent"
        component={AddEventScreen}
        options={{ title: 'Crear Evento' }}
      />
      <EventsStack.Screen
        name="EditEvent"
        component={EditEventScreen}
        options={{ headerShown: false }}
      />
    </EventsStack.Navigator>
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

function MainTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: '#262626',
        tabBarInactiveTintColor: '#8E8E93',
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopWidth: 1,
          borderTopColor: '#e0e0e0',
          height: 70,
          paddingBottom: 12,
          paddingTop: 12,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 4,
        },
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          if (route.name === 'Map') {
            iconName = focused ? 'map' : 'map-outline';
          } else if (route.name === 'Devices') {
            iconName = focused ? 'hardware-chip' : 'hardware-chip-outline';
          } else if (route.name === 'Events') {
            iconName = focused ? 'alert-circle' : 'alert-circle-outline';
          } else if (route.name === 'Settings') {
            iconName = focused ? 'person-circle' : 'person-circle-outline';
          } else {
            iconName = 'help-circle-outline';
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
        name="Devices"
        component={DevicesStackNavigator}
        options={{ title: 'Dispositivos' }}
      />
      <Tab.Screen
        name="Events"
        component={EventsStackNavigator}
        options={{ title: 'Eventos' }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ title: 'Perfil' }}
      />
    </Tab.Navigator>
  );
}

function RootStackNavigator() {
  return (
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
    </RootStack.Navigator>
  );
}

export function AppNavigator() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return isAuthenticated ? <RootStackNavigator /> : <AuthNavigator />;
}

import { Tabs } from 'expo-router';
import { Platform, Text } from 'react-native';

export default function AdminTabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#2563eb',
        tabBarInactiveTintColor: '#6b7280',
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopColor: '#e5e7eb',
          height: Platform.OS === 'ios' ? 84 : 64,
          paddingBottom: Platform.OS === 'ios' ? 28 : 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="employees"
        options={{
          title: 'Karyawan',
          tabBarIcon: ({ size }) => (
            <TabIconText emoji="👥" size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="reports"
        options={{
          title: 'Rekap',
          tabBarIcon: ({ size }) => (
            <TabIconText emoji="📋" size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="evaluation"
        options={{
          title: 'Evaluasi',
          tabBarIcon: ({ size }) => (
            <TabIconText emoji="🧪" size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Pengaturan',
          tabBarIcon: ({ size }) => (
            <TabIconText emoji="⚙️" size={size} />
          ),
        }}
      />
    </Tabs>
  );
}

function TabIconText({ emoji, size }: { emoji: string; size: number }) {
  return (
    <Text style={{ fontSize: size - 4 }}>{emoji}</Text>
  );
}

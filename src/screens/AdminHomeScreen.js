import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Text } from "react-native";
import HomeScreen from "./HomeScreen";
import AdminScreen from "./AdminScreen";
import { C, F } from "../theme";

const Tab = createBottomTabNavigator();

export default function AdminHomeScreen() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: C.navy, borderTopColor: C.navyLight },
        tabBarActiveTintColor: C.teal,
        tabBarInactiveTintColor: "rgba(255,255,255,0.4)",
        tabBarLabelStyle: { fontSize: F.xs, fontWeight: F.semibold },
      }}
    >
      <Tab.Screen
        name="Verify"
        component={HomeScreen}
        options={{
          tabBarIcon: ({ color }) => (
            <Text style={{ color, fontSize: 18 }}>⊙</Text>
          ),
        }}
      />
      <Tab.Screen
        name="Admin"
        component={AdminScreen}
        options={{
          tabBarIcon: ({ color }) => (
            <Text style={{ color, fontSize: 18 }}>🔐</Text>
          ),
        }}
      />
    </Tab.Navigator>
  );
}

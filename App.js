import { useEffect, useState } from "react";
import { View, ActivityIndicator } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { supabase } from "./src/supabase";
import { C } from "./src/theme";

import OnboardingScreen from "./src/screens/OnboardingScreen";
import LoginScreen from "./src/screens/LoginScreen";
import RegisterScreen from "./src/screens/RegisterScreen";
import HomeScreen from "./src/screens/HomeScreen";
import SettingsScreen from "./src/screens/SettingsScreen";
import AdminHomeScreen from "./src/screens/AdminHomeScreen";
import ProfileScreen from "./src/screens/ProfileScreen";
import ScanHistoryScreen from "./src/screens/ScanHistoryScreen";
import ShortagesScreen from "./src/screens/ShortagesScreen";

const Stack = createStackNavigator();

export default function App() {
  const [initialRoute, setInitialRoute] = useState(null); // null = loading

  useEffect(() => {
    // Check if user is already logged in
    supabase.auth.getSession().then(({ data }) => {
      setInitialRoute(data.session ? "Home" : "Onboarding");
    });

    // Listen for auth changes
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session) setInitialRoute("Home");
      },
    );

    return () => listener.subscription.unsubscribe();
  }, []);

  // Loading screen while checking auth
  if (!initialRoute) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: C.ink,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ActivityIndicator size="large" color={C.teal} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName={initialRoute}
        screenOptions={{ headerShown: false, animation: "slide_from_right" }}
      >
        <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Settings" component={SettingsScreen} />
        <Stack.Screen name="AdminHome" component={AdminHomeScreen} />
        <Stack.Screen name="Profile" component={ProfileScreen} />
        <Stack.Screen name="ScanHistory" component={ScanHistoryScreen} />
        <Stack.Screen name="Shortages" component={ShortagesScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

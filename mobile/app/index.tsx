import { useEffect } from "react";
import { View, ActivityIndicator } from "react-native";
import { router } from "expo-router";
import { useAuth } from "@/lib/auth-context";

export default function IndexRoute() {
  const { session, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    router.replace(session ? "/parties" : "/login");
  }, [loading, session]);

  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#0F0F14" }}>
      <ActivityIndicator color="#C8973A" />
    </View>
  );
}

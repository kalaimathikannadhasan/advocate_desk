import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";

import { supabase } from "../lib/supabase";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert("Required", "Enter email and password");
      return;
    }

    try {
      setLoading(true);

      const { data, error } =
        await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: password,
        });

      if (error) throw error;

      if (!data?.session?.access_token) {
        throw new Error("Access token not generated");
      }

      console.log("Login successful");
      console.log("User ID:", data.user.id);
      console.log("Token generated:", true);

    } catch (error) {
      console.error("Login Error:", error.message);
      Alert.alert("Login Failed", error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>ADVOCATE DESK</Text>
      <Text style={styles.subtitle}>Login to your account</Text>

      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />

      <TextInput
        style={styles.input}
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <TouchableOpacity
        style={styles.button}
        onPress={handleLogin}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.buttonText}>Login</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#F4F6FA",
  },
  title: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#182B4D",
    textAlign: "center",
  },
  subtitle: {
    textAlign: "center",
    marginTop: 8,
    marginBottom: 30,
    color: "#77839A",
  },
  input: {
    backgroundColor: "#FFFFFF",
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#DDE2EA",
    marginBottom: 15,
  },
  button: {
    backgroundColor: "#1F4F9C",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
  },
});
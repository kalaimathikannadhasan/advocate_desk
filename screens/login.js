
import React, { useState, useRef } from "react";

import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  useWindowDimensions,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
} from "react-native";

import { MaterialCommunityIcons } from "@expo/vector-icons";
import { supabase } from "../lib/supabase";

export default function LoginScreen({ onSignup }) {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const loginLock = useRef(false);

  // LOGIN FUNCTION
  const handleLogin = async () => {
    if (loginLock.current) return;

    setErrorMessage("");

    if (!email.trim() || !password) {
      setErrorMessage("Enter email and password");
      return;
    }

    try {
      loginLock.current = true;
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

    } catch (error) {
      console.error("Login Error:", error.message);

      setErrorMessage(
        error.message === "Invalid login credentials"
          ? "Incorrect email or password."
          : error.message || "Unable to login."
      );

    } finally {
      loginLock.current = false;
      setLoading(false);
    }
  };

  // SIGNUP FUNCTION
  const handleSignup = () => {
    if (loading) return;

    if (typeof onSignup === "function") {
      onSignup();
      return;
    }

    if (Platform.OS === "web") {
      const url = new URL(window.location.href);

      url.searchParams.set("signup", "1");

      window.location.assign(url.toString());
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={
        Platform.OS === "ios"
          ? "padding"
          : undefined
      }
    >
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View
          style={[
            styles.loginForm,
            isDesktop && styles.desktopCard,
          ]}
        >
          {/* LOGO */}

          <View style={styles.logoContainer}>
            <MaterialCommunityIcons
              name="scale-balance"
              size={40}
              color="#FFFFFF"
            />
          </View>

          {/* APPLICATION TITLE */}

          <Text style={styles.title}>
            ADVOCATE DESK
          </Text>

          <Text style={styles.subtitle}>
            Login to your account
          </Text>

          {/* ERROR MESSAGE */}

          {!!errorMessage && (
            <View
              style={styles.errorContainer}
              accessibilityLiveRegion="polite"
            >
              <Text style={styles.errorText}>
                {errorMessage}
              </Text>
            </View>
          )}

          {/* EMAIL INPUT */}

          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor="#94A3B8"
            value={email}
            onChangeText={(value) => {
              setEmail(value);
              setErrorMessage("");
            }}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            keyboardType="email-address"
            editable={!loading}
            accessibilityLabel="Email"
          />

          {/* PASSWORD INPUT */}

          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor="#94A3B8"
            value={password}
            onChangeText={(value) => {
              setPassword(value);
              setErrorMessage("");
            }}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="current-password"
            editable={!loading}
            returnKeyType="go"
            onSubmitEditing={handleLogin}
            accessibilityLabel="Password"
          />

          {/* LOGIN BUTTON */}

          <TouchableOpacity
            style={[
              styles.button,
              loading && styles.disabledButton,
            ]}
            onPress={handleLogin}
            disabled={loading}
            accessibilityRole="button"
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText}>
                Login
              </Text>
            )}
          </TouchableOpacity>

          {/* EMPLOYEE SIGNUP LINK */}

          {(Platform.OS === "web" ||
            typeof onSignup === "function") && (
            <View style={styles.signupContainer}>
              <Text style={styles.signupText}>
                New employee?
              </Text>

              <TouchableOpacity
                onPress={handleSignup}
                disabled={loading}
                accessibilityRole="link"
              >
                <Text style={styles.signupLink}>
                  Sign Up
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// STYLES

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F4F6FA",
  },

  scrollContainer: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },

  loginForm: {
    width: "100%",
    maxWidth: 420,
  },

  // DESKTOP VIEW ONLY

  desktopCard: {
    backgroundColor: "#FFFFFF",
    padding: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E1E6EF",
    shadowColor: "#182B4D",
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 0.08,
    shadowRadius: 15,
    elevation: 5,
  },

  // APPLICATION LOGO

  logoContainer: {
    width: 76,
    height: 76,
    borderRadius: 20,
    backgroundColor: "#182B4D",
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
    marginBottom: 20,
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

  // ORIGINAL INPUT DESIGN

  input: {
    backgroundColor: "#FFFFFF",
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#DDE2EA",
    marginBottom: 15,
    fontSize: 14,
    color: "#182B4D",
  },

  button: {
    backgroundColor: "#1F4F9C",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
  },

  disabledButton: {
    opacity: 0.6,
  },

  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
  },

  // SIGNUP LINK

  signupContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 22,
    gap: 6,
    flexWrap: "wrap",
  },

  signupText: {
    fontSize: 14,
    color: "#77839A",
  },

  signupLink: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#1F4F9C",
  },

  // ERROR MESSAGE

  errorContainer: {
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    padding: 12,
    borderRadius: 8,
    marginBottom: 15,
  },

  errorText: {
    color: "#DC2626",
    fontSize: 13,
    textAlign: "center",
  },
});

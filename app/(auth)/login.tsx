import React, { useState } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet, Image,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
  ScrollView, Dimensions,
} from "react-native";
import {
  GoogleAuthProvider, signInWithCredential,
  signInWithEmailAndPassword, createUserWithEmailAndPassword,
  sendEmailVerification,
} from "firebase/auth";
import { auth } from "../lib/firebase";
import { router } from "expo-router";
import colors from "../lib/colors";
import { Ionicons } from "@expo/vector-icons";

const { width, height } = Dimensions.get("window");

const LOGO_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663049967311/8vHBY4AKMjVmt7ujvhWDcb/kurdistan-chat-logo_b0e286e0.png";

export default function LoginScreen() {
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);

  const handleEmailLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert("خطأ", "يرجى إدخال البريد الإلكتروني وكلمة المرور");
      return;
    }
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      router.replace("/(tabs)/home");
    } catch (err: any) {
      const msg = err.code === "auth/user-not-found" || err.code === "auth/wrong-password"
        ? "البريد الإلكتروني أو كلمة المرور غير صحيحة"
        : err.code === "auth/too-many-requests"
        ? "تم تجاوز عدد المحاولات، حاول لاحقاً"
        : "فشل تسجيل الدخول";
      Alert.alert("خطأ", msg);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert("خطأ", "يرجى إدخال البريد الإلكتروني وكلمة المرور");
      return;
    }
    if (password.length < 6) {
      Alert.alert("خطأ", "كلمة المرور يجب أن تكون 6 أحرف على الأقل");
      return;
    }
    setLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
      await sendEmailVerification(cred.user);
      Alert.alert(
        "تم إنشاء الحساب",
        "تم إرسال رسالة تحقق إلى بريدك الإلكتروني. يرجى التحقق قبل تسجيل الدخول.",
        [{ text: "حسناً", onPress: () => setTab("login") }]
      );
    } catch (err: any) {
      const msg = err.code === "auth/email-already-in-use"
        ? "هذا البريد الإلكتروني مستخدم بالفعل"
        : err.code === "auth/invalid-email"
        ? "البريد الإلكتروني غير صحيح"
        : "فشل إنشاء الحساب";
      Alert.alert("خطأ", msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header with gradient-like background */}
        <View style={styles.header}>
          <Image source={{ uri: LOGO_URL }} style={styles.logo} resizeMode="contain" />
          <Text style={styles.appName}>Kurdistan Chat</Text>
          <Text style={styles.tagline}>تواصل مع الكرد حول العالم</Text>
        </View>

        {/* Card */}
        <View style={styles.card}>
          {/* Tabs */}
          <View style={styles.tabs}>
            <TouchableOpacity
              style={[styles.tab, tab === "login" && styles.tabActive]}
              onPress={() => setTab("login")}
            >
              <Text style={[styles.tabText, tab === "login" && styles.tabTextActive]}>
                تسجيل الدخول
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, tab === "register" && styles.tabActive]}
              onPress={() => setTab("register")}
            >
              <Text style={[styles.tabText, tab === "register" && styles.tabTextActive]}>
                حساب جديد
              </Text>
            </TouchableOpacity>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <View style={styles.inputWrapper}>
              <Ionicons name="mail-outline" size={20} color={colors.textMuted} style={styles.inputIcon} />
              <TextInputCustom
                placeholder="البريد الإلكتروني"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputWrapper}>
              <Ionicons name="lock-closed-outline" size={20} color={colors.textMuted} style={styles.inputIcon} />
              <TextInputCustom
                placeholder="كلمة المرور"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPass}
              />
              <TouchableOpacity onPress={() => setShowPass(!showPass)} style={styles.eyeBtn}>
                <Ionicons name={showPass ? "eye-off-outline" : "eye-outline"} size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.submitBtn, loading && styles.btnDisabled]}
              onPress={tab === "login" ? handleEmailLogin : handleRegister}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitBtnText}>
                  {tab === "login" ? "تسجيل الدخول" : "إنشاء حساب"}
                </Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>أو</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Social Login Info */}
          <View style={styles.socialInfo}>
            <Ionicons name="information-circle-outline" size={16} color={colors.textMuted} />
            <Text style={styles.socialInfoText}>
              لتسجيل الدخول بـ Google، استخدم الموقع kurdichat.vip
            </Text>
          </View>
        </View>

        {/* Footer */}
        <Text style={styles.footer}>
          بالتسجيل، أنت توافق على{" "}
          <Text style={styles.footerLink}>سياسة الخصوصية</Text>
          {" "}و{" "}
          <Text style={styles.footerLink}>شروط الاستخدام</Text>
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// Custom TextInput component
import { TextInput } from "react-native";
function TextInputCustom({ placeholder, value, onChangeText, keyboardType, autoCapitalize, secureTextEntry }: any) {
  return (
    <TextInput
      style={styles.input}
      placeholder={placeholder}
      placeholderTextColor={colors.textMuted}
      value={value}
      onChangeText={onChangeText}
      keyboardType={keyboardType}
      autoCapitalize={autoCapitalize || "none"}
      secureTextEntry={secureTextEntry}
      textAlign="right"
      color={colors.textPrimary}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  header: {
    alignItems: "center",
    paddingTop: 80,
    paddingBottom: 40,
    paddingHorizontal: 24,
  },
  logo: {
    width: 90,
    height: 90,
    borderRadius: 20,
    marginBottom: 16,
  },
  appName: {
    fontSize: 28,
    fontWeight: "bold",
    color: colors.textPrimary,
    marginBottom: 8,
  },
  tagline: {
    fontSize: 15,
    color: colors.textSecondary,
  },
  card: {
    marginHorizontal: 20,
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabs: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 4,
    marginBottom: 24,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 10,
  },
  tabActive: {
    backgroundColor: colors.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textMuted,
  },
  tabTextActive: {
    color: "#fff",
  },
  form: {
    gap: 14,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 15,
    textAlign: "right",
  },
  eyeBtn: {
    padding: 4,
  },
  submitBtn: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 6,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    color: colors.textMuted,
    marginHorizontal: 12,
    fontSize: 13,
  },
  socialInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: 12,
  },
  socialInfoText: {
    flex: 1,
    color: colors.textSecondary,
    fontSize: 12,
    textAlign: "right",
  },
  footer: {
    textAlign: "center",
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 24,
    paddingHorizontal: 20,
  },
  footerLink: {
    color: colors.primary,
  },
});

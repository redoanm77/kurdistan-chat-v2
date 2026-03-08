import React, { useState } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet, Image,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
  ScrollView, TextInput, Dimensions,
} from "react-native";
import {
  GoogleAuthProvider, signInWithCredential,
  PhoneAuthProvider, signInWithPhoneNumber,
} from "firebase/auth";
import { GoogleSignin, statusCodes } from "@react-native-google-signin/google-signin";
import { auth } from "../lib/firebase";
import { router } from "expo-router";
import { colors } from "../lib/colors";
import { Ionicons } from "@expo/vector-icons";

const { width } = Dimensions.get("window");

// Configure Google Sign-In
GoogleSignin.configure({
  webClientId: "814756551942-hufr4kuerljf88jdq73801p5cfodtrhf.apps.googleusercontent.com",
  offlineAccess: false,
});

type Screen = "main" | "phone" | "otp";

export default function LoginScreen() {
  const [loading, setLoading] = useState(false);
  const [screen, setScreen] = useState<Screen>("main");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otp, setOtp] = useState("");
  const [confirmResult, setConfirmResult] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState("");

  // Google Sign-In
  const handleGoogleSignIn = async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      await GoogleSignin.signIn();
      const { idToken } = await GoogleSignin.getTokens();
      if (!idToken) throw new Error("No ID token received");
      const credential = GoogleAuthProvider.credential(idToken);
      await signInWithCredential(auth, credential);
      // Auth state change in AuthContext will handle navigation
    } catch (error: any) {
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        // User cancelled - no error
      } else if (error.code === statusCodes.IN_PROGRESS) {
        setErrorMsg("تسجيل الدخول جارٍ بالفعل...");
      } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        setErrorMsg("خدمات Google Play غير متوفرة على هذا الجهاز");
      } else {
        setErrorMsg("فشل تسجيل الدخول بـ Google. حاول مرة أخرى.");
        console.error("Google Sign-In error:", JSON.stringify(error));
      }
    } finally {
      setLoading(false);
    }
  };

  // Phone - Send OTP
  const handleSendOTP = async () => {
    let phone = phoneNumber.trim();
    if (!phone) {
      setErrorMsg("يرجى إدخال رقم الهاتف");
      return;
    }
    if (!phone.startsWith("+")) {
      phone = "+" + phone;
    }
    setLoading(true);
    setErrorMsg("");
    try {
      const confirmation = await signInWithPhoneNumber(auth, phone);
      setConfirmResult(confirmation);
      setScreen("otp");
    } catch (error: any) {
      console.error("Phone auth error:", error.code, error.message);
      if (error.code === "auth/invalid-phone-number") {
        setErrorMsg("رقم الهاتف غير صحيح. استخدم الصيغة: +9647501234567");
      } else if (error.code === "auth/too-many-requests") {
        setErrorMsg("طلبات كثيرة جداً. انتظر قليلاً وحاول مجدداً");
      } else {
        setErrorMsg("فشل إرسال الرمز: " + (error.message || error.code));
      }
    } finally {
      setLoading(false);
    }
  };

  // Phone - Verify OTP
  const handleVerifyOTP = async () => {
    if (!otp || otp.length < 6) {
      setErrorMsg("يرجى إدخال الرمز المكون من 6 أرقام");
      return;
    }
    setLoading(true);
    setErrorMsg("");
    try {
      await confirmResult.confirm(otp);
      // Auth state change in AuthContext will handle navigation
    } catch (error: any) {
      console.error("OTP verify error:", error.code, error.message);
      if (error.code === "auth/invalid-verification-code") {
        setErrorMsg("رمز التحقق غير صحيح");
      } else if (error.code === "auth/code-expired") {
        setErrorMsg("انتهت صلاحية الرمز. أعد إرسال الرمز");
      } else {
        setErrorMsg("فشل التحقق: " + (error.message || ""));
      }
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
        {/* Header */}
        <View style={styles.header}>
          <Image source={require("../../assets/icon.png")} style={styles.logo} resizeMode="contain" />
          <Text style={styles.appName}>Kurdistan Chat</Text>
          <Text style={styles.tagline}>تواصل مع الكرد حول العالم</Text>
        </View>

        {/* Main Screen */}
        {screen === "main" && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>تسجيل الدخول</Text>
            <Text style={styles.cardSubtitle}>اختر طريقة تسجيل الدخول</Text>

            {errorMsg ? (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={16} color="#ef4444" />
                <Text style={styles.errorText}>{errorMsg}</Text>
              </View>
            ) : null}

            {/* Google Sign-In Button */
            <TouchableOpacity
              style={[styles.googleBtn, loading && styles.btnDisabled]}
              onPress={handleGoogleSignIn}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <View style={styles.googleIcon}>
                    <Text style={styles.googleIconText}>G</Text>
                  </View>
                  <Text style={styles.googleBtnText}>تسجيل الدخول بـ Google</Text>
                </>
              )}
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>أو</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Phone Sign-In Button */}
            <TouchableOpacity
              style={styles.phoneBtn}
              onPress={() => setScreen("phone")}
              disabled={loading}
            >
              <Ionicons name="call-outline" size={22} color={colors.primary} />
              <Text style={styles.phoneBtnText}>تسجيل الدخول برقم الهاتف</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Phone Number Screen */}
        {screen === "phone" && (
          <View style={styles.card}>
            <TouchableOpacity style={styles.backBtn} onPress={() => setScreen("main")}>
              <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
              <Text style={styles.backText}>رجوع</Text>
            </TouchableOpacity>

            <Text style={styles.cardTitle}>رقم الهاتف</Text>
            <Text style={styles.cardSubtitle}>
              أدخل رقم هاتفك مع رمز الدولة{"
"}
              مثال: +9647501234567
            </Text>

            {errorMsg ? (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={16} color="#ef4444" />
                <Text style={styles.errorText}>{errorMsg}</Text>
              </View>
            ) : null}

            <View style={styles.inputWrapper}>
              <Ionicons name="call-outline" size={20} color={colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="+9647501234567"
                placeholderTextColor={colors.textMuted}
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                keyboardType="phone-pad"
                textAlign="left"
                color={colors.textPrimary}
                autoFocus
              />
            </View>

            <TouchableOpacity
              style={[styles.submitBtn, loading && styles.btnDisabled]}
              onPress={handleSendOTP}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitBtnText}>إرسال رمز التحقق</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* OTP Screen */}
        {screen === "otp" && (
          <View style={styles.card}>
            <TouchableOpacity style={styles.backBtn} onPress={() => setScreen("phone")}>
              <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
              <Text style={styles.backText}>رجوع</Text>
            </TouchableOpacity>

            <Text style={styles.cardTitle}>رمز التحقق</Text>
            <Text style={styles.cardSubtitle}>
              تم إرسال رمز التحقق إلى{"
"}
              <Text style={{ color: colors.primary }}>{phoneNumber}</Text>
            </Text>

            {errorMsg ? (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={16} color="#ef4444" />
                <Text style={styles.errorText}>{errorMsg}</Text>
              </View>
            ) : null}

            <View style={styles.inputWrapper}>
              <Ionicons name="key-outline" size={20} color={colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="أدخل الرمز المكون من 6 أرقام"
                placeholderTextColor={colors.textMuted}
                value={otp}
                onChangeText={setOtp}
                keyboardType="number-pad"
                maxLength={6}
                textAlign="center"
                color={colors.textPrimary}
                autoFocus
              />
            </View>

            <TouchableOpacity
              style={[styles.submitBtn, loading && styles.btnDisabled]}
              onPress={handleVerifyOTP}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitBtnText}>تأكيد</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.resendBtn}
              onPress={() => { setScreen("phone"); setOtp(""); }}
            >
              <Text style={styles.resendText}>إعادة إرسال الرمز</Text>
            </TouchableOpacity>
          </View>
        )}

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
  cardTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: colors.textPrimary,
    textAlign: "center",
    marginBottom: 8,
  },
  cardSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: 28,
    lineHeight: 22,
  },
  googleBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#4285F4",
    borderRadius: 14,
    paddingVertical: 15,
    paddingHorizontal: 20,
    gap: 12,
  },
  googleIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  googleIconText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#4285F4",
  },
  googleBtnText: {
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
  phoneBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 15,
    paddingHorizontal: 20,
    gap: 12,
    backgroundColor: "transparent",
  },
  phoneBtnText: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: "bold",
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 20,
  },
  backText: {
    color: colors.textPrimary,
    fontSize: 15,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    marginBottom: 16,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
  },
  submitBtn: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: "center",
  },
  btnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  resendBtn: {
    alignItems: "center",
    marginTop: 16,
    padding: 8,
  },
  resendText: {
    color: colors.primary,
    fontSize: 14,
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
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(239,68,68,0.1)",
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    gap: 8,
  },
  errorText: {
    color: "#ef4444",
    fontSize: 13,
    flex: 1,
  },
});

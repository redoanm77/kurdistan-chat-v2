import React, { useState } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, Image, StyleSheet,
  Alert, TextInput, ActivityIndicator,
} from "react-native";
import { signOut, updateProfile } from "firebase/auth";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { auth, db, storage } from "../lib/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useAuth } from "../contexts/AuthContext";
import { colors } from "../lib/colors";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";

export default function ProfileScreen() {
  const { user, profile, refreshProfile } = useAuth();
  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState(profile?.displayName || "");
  const [bio, setBio] = useState(profile?.bio || "");
  const [city, setCity] = useState(profile?.city || "");
  const [age, setAge] = useState(profile?.age?.toString() || "");
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const handleLogout = () => {
    Alert.alert(
      "تسجيل الخروج",
      "هل أنت متأكد من تسجيل الخروج؟",
      [
        { text: "إلغاء", style: "cancel" },
        {
          text: "تسجيل الخروج",
          style: "destructive",
          onPress: async () => {
            try {
              if (user) {
                await updateDoc(doc(db, "users", user.uid), {
                  isOnline: false,
                  lastSeen: serverTimestamp(),
                });
              }
              await signOut(auth);
              router.replace("/(auth)/login");
            } catch (e) {
              Alert.alert("خطأ", "فشل تسجيل الخروج");
            }
          },
        },
      ]
    );
  };

  const handleSave = async () => {
    if (!user || !displayName.trim()) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, "users", user.uid), {
        displayName: displayName.trim(),
        bio: bio.trim(),
        city: city.trim(),
        age: age ? parseInt(age) : null,
      });
      await updateProfile(user, { displayName: displayName.trim() });
      await refreshProfile();
      setEditing(false);
      Alert.alert("تم", "تم حفظ التغييرات بنجاح");
    } catch (e) {
      Alert.alert("خطأ", "فشل حفظ التغييرات");
    } finally {
      setSaving(false);
    }
  };

  const handlePickPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("خطأ", "يحتاج التطبيق إذن الوصول للصور");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (result.canceled || !result.assets[0]) return;

    setUploadingPhoto(true);
    try {
      const uri = result.assets[0].uri;
      const response = await fetch(uri);
      const blob = await response.blob();
      const storageRef = ref(storage, `avatars/${user?.uid}`);
      await uploadBytes(storageRef, blob);
      const url = await getDownloadURL(storageRef);

      await updateDoc(doc(db, "users", user!.uid), { photoURL: url });
      await updateProfile(user!, { photoURL: url });
      await refreshProfile();
      Alert.alert("تم", "تم تحديث الصورة الشخصية");
    } catch (e) {
      Alert.alert("خطأ", "فشل رفع الصورة");
    } finally {
      setUploadingPhoto(false);
    }
  };

  if (!profile) {
    return (
      <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={24} color={colors.red} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>حسابي</Text>
        <TouchableOpacity onPress={() => {
          if (editing) {
            setDisplayName(profile.displayName || "");
            setBio(profile.bio || "");
            setCity(profile.city || "");
            setAge(profile.age?.toString() || "");
          }
          setEditing(!editing);
        }}>
          <Ionicons name={editing ? "close-outline" : "create-outline"} size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <TouchableOpacity onPress={handlePickPhoto} disabled={uploadingPhoto}>
            <View style={styles.avatarWrapper}>
              {profile.photoURL ? (
                <Image source={{ uri: profile.photoURL }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.avatarPlaceholder]}>
                  <Text style={styles.avatarInitial}>{profile.displayName?.[0] || "؟"}</Text>
                </View>
              )}
              {uploadingPhoto ? (
                <View style={styles.uploadOverlay}>
                  <ActivityIndicator color="#fff" size="small" />
                </View>
              ) : (
                <View style={styles.editPhotoBtn}>
                  <Ionicons name="camera" size={16} color="#fff" />
                </View>
              )}
            </View>
          </TouchableOpacity>

          {editing ? (
            <TextInput
              style={styles.nameInput}
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="الاسم"
              placeholderTextColor={colors.textMuted}
              textAlign="center"
              color={colors.textPrimary}
            />
          ) : (
            <View style={styles.nameRow}>
              {profile.isVerified && (
                <Ionicons name="checkmark-circle" size={18} color={colors.blue} />
              )}
              <Text style={styles.profileName}>{profile.displayName}</Text>
            </View>
          )}

          {profile.email && (
            <Text style={styles.profileEmail}>{profile.email}</Text>
          )}

          {/* Stats */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{profile.points || 0}</Text>
              <Text style={styles.statLabel}>نقطة</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <View style={[styles.onlineDot, { position: "relative", width: 10, height: 10 }]} />
              <Text style={styles.statLabel}>
                {profile.isOnline ? "متصل" : "غير متصل"}
              </Text>
            </View>
          </View>
        </View>

        {/* Info Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>معلومات الملف الشخصي</Text>

          {/* Bio */}
          <View style={styles.infoRow}>
            <Ionicons name="information-circle-outline" size={20} color={colors.textMuted} />
            {editing ? (
              <TextInput
                style={[styles.infoInput, { flex: 1 }]}
                value={bio}
                onChangeText={setBio}
                placeholder="نبذة عنك..."
                placeholderTextColor={colors.textMuted}
                multiline
                textAlign="right"
                color={colors.textPrimary}
              />
            ) : (
              <Text style={styles.infoValue}>{profile.bio || "لا توجد نبذة"}</Text>
            )}
          </View>

          {/* City */}
          <View style={styles.infoRow}>
            <Ionicons name="location-outline" size={20} color={colors.textMuted} />
            {editing ? (
              <TextInput
                style={[styles.infoInput, { flex: 1 }]}
                value={city}
                onChangeText={setCity}
                placeholder="المدينة"
                placeholderTextColor={colors.textMuted}
                textAlign="right"
                color={colors.textPrimary}
              />
            ) : (
              <Text style={styles.infoValue}>{profile.city || "غير محدد"}</Text>
            )}
          </View>

          {/* Age */}
          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={20} color={colors.textMuted} />
            {editing ? (
              <TextInput
                style={[styles.infoInput, { flex: 1 }]}
                value={age}
                onChangeText={setAge}
                placeholder="العمر"
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
                textAlign="right"
                color={colors.textPrimary}
              />
            ) : (
              <Text style={styles.infoValue}>{profile.age ? `${profile.age} سنة` : "غير محدد"}</Text>
            )}
          </View>
        </View>

        {/* Save Button */}
        {editing && (
          <TouchableOpacity
            style={[styles.saveBtn, saving && styles.btnDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.saveBtnText}>حفظ التغييرات</Text>
            )}
          </TouchableOpacity>
        )}

        {/* Logout Button */}
        {!editing && (
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={20} color={colors.red} />
            <Text style={styles.logoutText}>تسجيل الخروج</Text>
          </TouchableOpacity>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: colors.textPrimary,
  },
  profileHeader: {
    alignItems: "center",
    paddingVertical: 30,
    paddingHorizontal: 20,
    backgroundColor: colors.card,
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  avatarWrapper: {
    position: "relative",
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: colors.primary,
  },
  avatarPlaceholder: {
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarInitial: {
    color: "#fff",
    fontSize: 36,
    fontWeight: "bold",
  },
  uploadOverlay: {
    position: "absolute",
    inset: 0,
    borderRadius: 50,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  editPhotoBtn: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: colors.primary,
    borderRadius: 14,
    width: 28,
    height: 28,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: colors.card,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  profileName: {
    fontSize: 22,
    fontWeight: "bold",
    color: colors.textPrimary,
  },
  profileEmail: {
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: 16,
  },
  nameInput: {
    fontSize: 20,
    fontWeight: "bold",
    color: colors.textPrimary,
    borderBottomWidth: 1,
    borderBottomColor: colors.primary,
    paddingVertical: 4,
    minWidth: 200,
    textAlign: "center",
    marginBottom: 4,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 24,
  },
  statItem: {
    alignItems: "center",
    gap: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: colors.primary,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textMuted,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: colors.border,
  },
  onlineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.online,
  },
  section: {
    marginHorizontal: 16,
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "bold",
    color: colors.textPrimary,
    marginBottom: 16,
    textAlign: "right",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  infoValue: {
    flex: 1,
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: "right",
  },
  infoInput: {
    fontSize: 14,
    color: colors.textPrimary,
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.primary,
  },
  saveBtn: {
    backgroundColor: colors.primary,
    marginHorizontal: 16,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: "center",
    marginBottom: 12,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  saveBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginHorizontal: 16,
    backgroundColor: "rgba(239,68,68,0.1)",
    borderRadius: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.3)",
  },
  logoutText: {
    color: colors.red,
    fontSize: 15,
    fontWeight: "600",
  },
});

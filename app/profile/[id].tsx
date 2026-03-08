import React, { useEffect, useState } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, Image, StyleSheet,
  ActivityIndicator,
} from "react-native";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../contexts/AuthContext";
import colors from "../lib/colors";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";

interface UserProfile {
  uid: string;
  displayName: string;
  photoURL: string;
  bio: string;
  points: number;
  isOnline: boolean;
  city?: string;
  age?: number;
  gender?: string;
  isVerified?: boolean;
  lastSeen?: any;
}

export default function UserProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const isOwnProfile = id === user?.uid;

  useEffect(() => {
    if (!id) return;
    getDoc(doc(db, "users", id)).then(snap => {
      if (snap.exists()) setProfile({ uid: snap.id, ...snap.data() } as UserProfile);
      setLoading(false);
    });
  }, [id]);

  const getLastSeen = (lastSeen: any) => {
    if (!lastSeen) return "غير معروف";
    const now = Date.now();
    const time = lastSeen?.toMillis ? lastSeen.toMillis() : lastSeen;
    const diff = Math.floor((now - time) / 60000);
    if (diff < 1) return "نشط الآن";
    if (diff < 60) return `منذ ${diff} دقيقة`;
    const hours = Math.floor(diff / 60);
    if (hours < 24) return `منذ ${hours} ساعة`;
    return `منذ ${Math.floor(hours / 24)} يوم`;
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
        <Text style={{ color: colors.textSecondary }}>المستخدم غير موجود</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>الملف الشخصي</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          {profile.photoURL ? (
            <Image source={{ uri: profile.photoURL }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Text style={styles.avatarInitial}>{profile.displayName?.[0] || "؟"}</Text>
            </View>
          )}

          <View style={styles.nameRow}>
            {profile.isVerified && (
              <Ionicons name="checkmark-circle" size={20} color={colors.blue} />
            )}
            <Text style={styles.profileName}>{profile.displayName}</Text>
          </View>

          <View style={styles.statusRow}>
            <View style={[styles.statusDot, profile.isOnline && styles.statusDotOnline]} />
            <Text style={[styles.statusText, profile.isOnline && styles.statusTextOnline]}>
              {profile.isOnline ? "متصل الآن" : getLastSeen(profile.lastSeen)}
            </Text>
          </View>

          {/* Stats */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{profile.points || 0}</Text>
              <Text style={styles.statLabel}>نقطة</Text>
            </View>
          </View>
        </View>

        {/* Bio */}
        {profile.bio && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>نبذة</Text>
            <Text style={styles.bioText}>{profile.bio}</Text>
          </View>
        )}

        {/* Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>معلومات</Text>
          {profile.city && (
            <View style={styles.infoRow}>
              <Ionicons name="location-outline" size={18} color={colors.textMuted} />
              <Text style={styles.infoText}>{profile.city}</Text>
            </View>
          )}
          {profile.age && (
            <View style={styles.infoRow}>
              <Ionicons name="calendar-outline" size={18} color={colors.textMuted} />
              <Text style={styles.infoText}>{profile.age} سنة</Text>
            </View>
          )}
          {profile.gender && (
            <View style={styles.infoRow}>
              <Ionicons name="person-outline" size={18} color={colors.textMuted} />
              <Text style={styles.infoText}>{profile.gender}</Text>
            </View>
          )}
        </View>

        {/* Actions */}
        {!isOwnProfile && (
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.chatBtn}
              onPress={() => router.push(`/chat/${profile.uid}`)}
            >
              <Ionicons name="chatbubble" size={20} color="#fff" />
              <Text style={styles.chatBtnText}>إرسال رسالة</Text>
            </TouchableOpacity>
          </View>
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
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 16,
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
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  profileName: {
    fontSize: 22,
    fontWeight: "bold",
    color: colors.textPrimary,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 16,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.textMuted,
  },
  statusDotOnline: {
    backgroundColor: colors.online,
  },
  statusText: {
    fontSize: 13,
    color: colors.textMuted,
  },
  statusTextOnline: {
    color: colors.online,
  },
  statsRow: {
    flexDirection: "row",
    gap: 24,
  },
  statItem: {
    alignItems: "center",
  },
  statValue: {
    fontSize: 20,
    fontWeight: "bold",
    color: colors.primary,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  section: {
    marginHorizontal: 16,
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: colors.textMuted,
    marginBottom: 10,
    textAlign: "right",
  },
  bioText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 22,
    textAlign: "right",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: "right",
  },
  actions: {
    marginHorizontal: 16,
    marginBottom: 12,
  },
  chatBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 14,
  },
  chatBtnText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "bold",
  },
});

import React, { useEffect, useState } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, Image, StyleSheet,
  RefreshControl, FlatList, Dimensions,
} from "react-native";
import { router } from "expo-router";
import { collection, query, orderBy, limit, getDocs, where, Timestamp } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../contexts/AuthContext";
import colors from "../lib/colors";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";

const { width } = Dimensions.get("window");
const LOGO_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663049967311/8vHBY4AKMjVmt7ujvhWDcb/kurdistan-chat-logo_b0e286e0.png";

interface Member {
  uid: string;
  displayName: string;
  photoURL: string;
  isOnline: boolean;
  lastSeen?: any;
  city?: string;
  age?: number;
  gender?: string;
}

export default function HomeScreen() {
  const { user, profile } = useAuth();
  const [onlineMembers, setOnlineMembers] = useState<Member[]>([]);
  const [recentMembers, setRecentMembers] = useState<Member[]>([]);
  const [onlineCount, setOnlineCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      // Online members
      const onlineQ = query(
        collection(db, "users"),
        where("isOnline", "==", true),
        limit(6)
      );
      const onlineSnap = await getDocs(onlineQ);
      const onlineList: Member[] = [];
      onlineSnap.forEach(d => {
        if (d.id !== user?.uid) onlineList.push({ uid: d.id, ...d.data() } as Member);
      });
      setOnlineMembers(onlineList);
      setOnlineCount(onlineSnap.size);

      // Recent members
      const recentQ = query(
        collection(db, "users"),
        orderBy("lastSeen", "desc"),
        limit(10)
      );
      const recentSnap = await getDocs(recentQ);
      const recentList: Member[] = [];
      recentSnap.forEach(d => {
        if (d.id !== user?.uid) recentList.push({ uid: d.id, ...d.data() } as Member);
      });
      setRecentMembers(recentList);
      setTotalCount(recentSnap.size);
    } catch (e) {
      console.warn("Fetch error:", e);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const getTimeAgo = (lastSeen: any) => {
    if (!lastSeen) return "";
    const now = Date.now();
    const time = lastSeen?.toMillis ? lastSeen.toMillis() : lastSeen;
    const diff = Math.floor((now - time) / 60000);
    if (diff < 1) return "نشط الآن";
    if (diff < 60) return `منذ ${diff} دقيقة`;
    const hours = Math.floor(diff / 60);
    if (hours < 24) return `منذ ${hours} ساعة`;
    return `منذ ${Math.floor(hours / 24)} يوم`;
  };

  const renderMemberCard = ({ item }: { item: Member }) => (
    <TouchableOpacity
      style={styles.memberCard}
      onPress={() => router.push(`/profile/${item.uid}`)}
    >
      <View style={styles.avatarWrapper}>
        {item.photoURL ? (
          <Image source={{ uri: item.photoURL }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <Text style={styles.avatarText}>{item.displayName?.[0] || "?"}</Text>
          </View>
        )}
        {item.isOnline && <View style={styles.onlineDot} />}
      </View>
      <Text style={styles.memberName} numberOfLines={1}>{item.displayName}</Text>
      {item.city && <Text style={styles.memberCity} numberOfLines={1}>{item.city}</Text>}
    </TouchableOpacity>
  );

  const renderRecentMember = ({ item }: { item: Member }) => (
    <TouchableOpacity
      style={styles.recentCard}
      onPress={() => router.push(`/profile/${item.uid}`)}
    >
      <View style={styles.recentAvatarWrapper}>
        {item.photoURL ? (
          <Image source={{ uri: item.photoURL }} style={styles.recentAvatar} />
        ) : (
          <View style={[styles.recentAvatar, styles.avatarPlaceholder]}>
            <Text style={styles.recentAvatarText}>{item.displayName?.[0] || "?"}</Text>
          </View>
        )}
        {item.isOnline && <View style={styles.onlineDotSmall} />}
      </View>
      <View style={styles.recentInfo}>
        <Text style={styles.recentName} numberOfLines={1}>{item.displayName}</Text>
        <Text style={styles.recentTime}>{getTimeAgo(item.lastSeen)}</Text>
      </View>
      <TouchableOpacity
        style={styles.chatBtn}
        onPress={() => router.push(`/chat/${item.uid}`)}
      >
        <Text style={styles.chatBtnText}>محادثة</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <Image source={{ uri: LOGO_URL }} style={styles.headerLogo} />
        <Text style={styles.headerTitle}>Kurdistan Chat</Text>
        <TouchableOpacity onPress={() => router.push(`/profile/${user?.uid}`)}>
          {profile?.photoURL ? (
            <Image source={{ uri: profile.photoURL }} style={styles.headerAvatar} />
          ) : (
            <View style={[styles.headerAvatar, styles.avatarPlaceholder]}>
              <Text style={styles.avatarText}>{profile?.displayName?.[0] || "؟"}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {/* Online Count Banner */}
        <View style={styles.onlineBanner}>
          <View style={styles.onlineDotBig} />
          <Text style={styles.onlineText}>
            <Text style={styles.onlineCount}>{onlineCount}</Text> متصل الآن
          </Text>
          <TouchableOpacity onPress={() => router.push("/(tabs)/members")}>
            <Text style={styles.viewAll}>عرض الكل</Text>
          </TouchableOpacity>
        </View>

        {/* Online Members Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <TouchableOpacity onPress={() => router.push("/(tabs)/members")}>
              <Text style={styles.sectionViewAll}>عرض الكل</Text>
            </TouchableOpacity>
            <View style={styles.sectionTitleRow}>
              <View style={styles.onlineDotSmall} />
              <Text style={styles.sectionTitle}>الأعضاء المتصلون الآن</Text>
            </View>
          </View>
          <FlatList
            data={onlineMembers}
            renderItem={renderMemberCard}
            keyExtractor={item => item.uid}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.membersList}
            ListEmptyComponent={
              <Text style={styles.emptyText}>لا يوجد أعضاء متصلون الآن</Text>
            }
          />
        </View>

        {/* Recent Activity Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <TouchableOpacity onPress={() => router.push("/(tabs)/members")}>
              <Text style={styles.sectionViewAll}>عرض الكل ({totalCount})</Text>
            </TouchableOpacity>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="trending-up" size={16} color={colors.primary} />
              <Text style={styles.sectionTitle}>آخر نشاط</Text>
            </View>
          </View>
          <FlatList
            data={recentMembers}
            renderItem={renderRecentMember}
            keyExtractor={item => item.uid}
            scrollEnabled={false}
            ListEmptyComponent={
              <Text style={styles.emptyText}>لا يوجد أعضاء</Text>
            }
          />
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => router.push("/(tabs)/chat")}
          >
            <Ionicons name="chatbubbles" size={24} color={colors.primary} />
            <Text style={styles.actionText}>الدردشة العامة</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => router.push("/(tabs)/messages")}
          >
            <Ionicons name="mail" size={24} color={colors.blue} />
            <Text style={styles.actionText}>الرسائل الخاصة</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const CARD_WIDTH = (width - 60) / 3;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerLogo: {
    width: 36,
    height: 36,
    borderRadius: 8,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: "bold",
    color: colors.textPrimary,
    textAlign: "center",
  },
  headerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  onlineBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  onlineDotBig: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.online,
    marginRight: 8,
  },
  onlineText: {
    flex: 1,
    color: colors.textSecondary,
    fontSize: 14,
  },
  onlineCount: {
    color: colors.online,
    fontWeight: "bold",
  },
  viewAll: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: "600",
  },
  section: {
    marginTop: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: colors.textPrimary,
  },
  sectionViewAll: {
    color: colors.primary,
    fontSize: 13,
  },
  membersList: {
    paddingHorizontal: 16,
    gap: 10,
  },
  memberCard: {
    width: CARD_WIDTH,
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  avatarWrapper: {
    position: "relative",
    marginBottom: 8,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  avatarPlaceholder: {
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
  },
  onlineDot: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.online,
    borderWidth: 2,
    borderColor: colors.card,
  },
  onlineDotSmall: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.online,
  },
  memberName: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textPrimary,
    textAlign: "center",
  },
  memberCity: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 2,
  },
  recentCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  recentAvatarWrapper: {
    position: "relative",
    marginLeft: 12,
  },
  recentAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
  },
  recentAvatarText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  recentInfo: {
    flex: 1,
    alignItems: "flex-end",
  },
  recentName: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  recentTime: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  chatBtn: {
    backgroundColor: colors.primaryBg,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  chatBtnText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: "600",
  },
  quickActions: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginTop: 20,
    gap: 12,
  },
  actionBtn: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: "600",
  },
  emptyText: {
    color: colors.textMuted,
    textAlign: "center",
    padding: 20,
  },
});

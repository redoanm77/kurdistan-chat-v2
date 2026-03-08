import React, { useEffect, useState } from "react";
import {
  View, Text, FlatList, TouchableOpacity, Image, StyleSheet,
  TextInput, RefreshControl,
} from "react-native";
import { collection, query, orderBy, limit, getDocs, where } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../contexts/AuthContext";
import colors from "../lib/colors";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";

interface Member {
  uid: string;
  displayName: string;
  photoURL: string;
  isOnline: boolean;
  lastSeen?: any;
  city?: string;
  age?: number;
  gender?: string;
  bio?: string;
  points?: number;
  isVerified?: boolean;
}

export default function MembersScreen() {
  const { user } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [filter, setFilter] = useState<"all" | "online">("all");
  const [search, setSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const fetchMembers = async () => {
    try {
      let q;
      if (filter === "online") {
        q = query(
          collection(db, "users"),
          where("isOnline", "==", true),
          limit(50)
        );
      } else {
        q = query(
          collection(db, "users"),
          orderBy("lastSeen", "desc"),
          limit(100)
        );
      }
      const snap = await getDocs(q);
      const list: Member[] = [];
      snap.forEach(d => {
        if (d.id !== user?.uid) {
          list.push({ uid: d.id, ...d.data() } as Member);
        }
      });
      setMembers(list);
    } catch (e) {
      console.warn("Fetch members error:", e);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, [filter]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchMembers();
    setRefreshing(false);
  };

  const filtered = members.filter(m =>
    m.displayName?.toLowerCase().includes(search.toLowerCase()) ||
    m.city?.toLowerCase().includes(search.toLowerCase())
  );

  const onlineCount = members.filter(m => m.isOnline).length;

  const getTimeAgo = (lastSeen: any) => {
    if (!lastSeen) return "";
    const now = Date.now();
    const time = lastSeen?.toMillis ? lastSeen.toMillis() : lastSeen;
    const diff = Math.floor((now - time) / 60000);
    if (diff < 1) return "نشط الآن";
    if (diff < 60) return `منذ ${diff}د`;
    const hours = Math.floor(diff / 60);
    if (hours < 24) return `منذ ${hours}س`;
    return `منذ ${Math.floor(hours / 24)} يوم`;
  };

  const renderMember = ({ item }: { item: Member }) => (
    <TouchableOpacity
      style={styles.memberCard}
      onPress={() => router.push(`/profile/${item.uid}`)}
    >
      <View style={styles.avatarWrapper}>
        {item.photoURL ? (
          <Image source={{ uri: item.photoURL }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <Text style={styles.avatarText}>{item.displayName?.[0] || "؟"}</Text>
          </View>
        )}
        {item.isOnline && <View style={styles.onlineDot} />}
      </View>

      <View style={styles.memberInfo}>
        <View style={styles.nameRow}>
          {item.isVerified && (
            <Ionicons name="checkmark-circle" size={14} color={colors.blue} />
          )}
          <Text style={styles.memberName} numberOfLines={1}>{item.displayName}</Text>
        </View>
        <View style={styles.detailsRow}>
          {item.city && (
            <Text style={styles.memberDetail}>
              <Ionicons name="location-outline" size={11} color={colors.textMuted} /> {item.city}
            </Text>
          )}
          {item.age && (
            <Text style={styles.memberDetail}>{item.age} سنة</Text>
          )}
        </View>
        <Text style={styles.lastSeen}>
          {item.isOnline ? (
            <Text style={{ color: colors.online }}>● متصل الآن</Text>
          ) : getTimeAgo(item.lastSeen)}
        </Text>
      </View>

      <TouchableOpacity
        style={styles.chatBtn}
        onPress={() => router.push(`/chat/${item.uid}`)}
      >
        <Ionicons name="chatbubble-outline" size={18} color={colors.primary} />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>الأعضاء</Text>
        <View style={styles.onlineChip}>
          <View style={styles.onlineDotSmall} />
          <Text style={styles.onlineChipText}>{onlineCount} متصل</Text>
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchWrapper}>
        <Ionicons name="search-outline" size={18} color={colors.textMuted} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="ابحث بالاسم أو المدينة..."
          placeholderTextColor={colors.textMuted}
          value={search}
          onChangeText={setSearch}
          textAlign="right"
          color={colors.textPrimary}
        />
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterTabs}>
        <TouchableOpacity
          style={[styles.filterTab, filter === "all" && styles.filterTabActive]}
          onPress={() => setFilter("all")}
        >
          <Text style={[styles.filterTabText, filter === "all" && styles.filterTabTextActive]}>
            الكل ({members.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, filter === "online" && styles.filterTabActive]}
          onPress={() => setFilter("online")}
        >
          <Text style={[styles.filterTabText, filter === "online" && styles.filterTabTextActive]}>
            متصلون ({onlineCount})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Members List */}
      <FlatList
        data={filtered}
        renderItem={renderMember}
        keyExtractor={item => item.uid}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={56} color={colors.textMuted} />
            <Text style={styles.emptyText}>لا يوجد أعضاء</Text>
          </View>
        }
      />
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
    fontSize: 20,
    fontWeight: "bold",
    color: colors.textPrimary,
  },
  onlineChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.onlineBg,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    gap: 5,
  },
  onlineDotSmall: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.online,
  },
  onlineChipText: {
    color: colors.online,
    fontSize: 12,
    fontWeight: "600",
  },
  searchWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    marginHorizontal: 16,
    marginVertical: 12,
    borderRadius: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 14,
  },
  filterTabs: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 4,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: 10,
  },
  filterTabActive: {
    backgroundColor: colors.primary,
  },
  filterTabText: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: "600",
  },
  filterTabTextActive: {
    color: "#fff",
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  memberCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  avatarWrapper: {
    position: "relative",
    marginLeft: 12,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  avatarPlaceholder: {
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  onlineDot: {
    position: "absolute",
    bottom: 1,
    right: 1,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.online,
    borderWidth: 2,
    borderColor: colors.card,
  },
  memberInfo: {
    flex: 1,
    alignItems: "flex-end",
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  memberName: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  detailsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 2,
  },
  memberDetail: {
    fontSize: 12,
    color: colors.textMuted,
  },
  lastSeen: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  chatBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primaryBg,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  emptyContainer: {
    alignItems: "center",
    paddingTop: 80,
    gap: 12,
  },
  emptyText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
});

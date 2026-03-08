import React, { useEffect, useState } from "react";
import {
  View, Text, FlatList, TouchableOpacity, Image, StyleSheet,
  TextInput,
} from "react-native";
import {
  collection, query, where, orderBy, onSnapshot, or, getDocs, doc, getDoc,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../contexts/AuthContext";
import colors from "../lib/colors";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";

interface Conversation {
  id: string;
  otherUid: string;
  otherName: string;
  otherPhoto: string;
  lastMessage: string;
  lastTime: any;
  unread: number;
}

export default function MessagesScreen() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    // Listen to conversations where user is participant
    const q = query(
      collection(db, "conversations"),
      where("participants", "array-contains", user.uid),
      orderBy("lastMessageTime", "desc")
    );

    const unsub = onSnapshot(q, async (snap) => {
      const convs: Conversation[] = [];
      for (const d of snap.docs) {
        const data = d.data();
        const otherUid = data.participants?.find((p: string) => p !== user.uid);
        if (!otherUid) continue;

        try {
          const userSnap = await getDoc(doc(db, "users", otherUid));
          const userData = userSnap.data();
          convs.push({
            id: d.id,
            otherUid,
            otherName: userData?.displayName || "مستخدم",
            otherPhoto: userData?.photoURL || "",
            lastMessage: data.lastMessage || "",
            lastTime: data.lastMessageTime,
            unread: data[`unread_${user.uid}`] || 0,
          });
        } catch {}
      }
      setConversations(convs);
      setLoading(false);
    });

    return unsub;
  }, [user]);

  const formatTime = (ts: any) => {
    if (!ts?.toDate) return "";
    const d = ts.toDate();
    const now = new Date();
    const diff = Math.floor((now.getTime() - d.getTime()) / 60000);
    if (diff < 1) return "الآن";
    if (diff < 60) return `${diff}د`;
    if (diff < 1440) return `${Math.floor(diff / 60)}س`;
    return d.toLocaleDateString("ar");
  };

  const filtered = conversations.filter(c =>
    c.otherName.toLowerCase().includes(search.toLowerCase())
  );

  const renderItem = ({ item }: { item: Conversation }) => (
    <TouchableOpacity
      style={styles.convItem}
      onPress={() => router.push(`/chat/${item.otherUid}`)}
    >
      <View style={styles.avatarWrapper}>
        {item.otherPhoto ? (
          <Image source={{ uri: item.otherPhoto }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <Text style={styles.avatarText}>{item.otherName?.[0] || "؟"}</Text>
          </View>
        )}
      </View>
      <View style={styles.convInfo}>
        <View style={styles.convHeader}>
          <Text style={styles.convTime}>{formatTime(item.lastTime)}</Text>
          <Text style={styles.convName} numberOfLines={1}>{item.otherName}</Text>
        </View>
        <View style={styles.convFooter}>
          {item.unread > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadText}>{item.unread}</Text>
            </View>
          )}
          <Text style={styles.lastMsg} numberOfLines={1}>{item.lastMessage}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>الرسائل</Text>
      </View>

      {/* Search */}
      <View style={styles.searchWrapper}>
        <Ionicons name="search-outline" size={18} color={colors.textMuted} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="ابحث في الرسائل..."
          placeholderTextColor={colors.textMuted}
          value={search}
          onChangeText={setSearch}
          textAlign="right"
          color={colors.textPrimary}
        />
      </View>

      {/* List */}
      <FlatList
        data={filtered}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="mail-outline" size={56} color={colors.textMuted} />
            <Text style={styles.emptyText}>لا توجد رسائل بعد</Text>
            <Text style={styles.emptySubText}>ابدأ محادثة مع أحد الأعضاء</Text>
            <TouchableOpacity
              style={styles.startBtn}
              onPress={() => router.push("/(tabs)/members")}
            >
              <Text style={styles.startBtnText}>تصفح الأعضاء</Text>
            </TouchableOpacity>
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
    textAlign: "center",
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
  list: {
    paddingHorizontal: 16,
  },
  convItem: {
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
  convInfo: {
    flex: 1,
  },
  convHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  convName: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.textPrimary,
    flex: 1,
    textAlign: "right",
  },
  convTime: {
    fontSize: 11,
    color: colors.textMuted,
    marginLeft: 8,
  },
  convFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  lastMsg: {
    flex: 1,
    fontSize: 13,
    color: colors.textMuted,
    textAlign: "right",
  },
  unreadBadge: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
    marginLeft: 8,
  },
  unreadText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "bold",
  },
  emptyContainer: {
    alignItems: "center",
    paddingTop: 80,
    gap: 12,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  emptySubText: {
    fontSize: 13,
    color: colors.textMuted,
  },
  startBtn: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
    marginTop: 8,
  },
  startBtnText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
});

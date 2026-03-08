import React, { useEffect, useState, useRef } from "react";
import {
  View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet,
  Image, KeyboardAvoidingView, Platform, Alert,
} from "react-native";
import {
  collection, query, orderBy, limit, onSnapshot, addDoc,
  serverTimestamp, doc, getDoc,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../contexts/AuthContext";
import { colors } from "../lib/colors";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";

interface Message {
  id: string;
  text: string;
  uid: string;
  displayName: string;
  photoURL: string;
  createdAt: any;
  room: string;
}

const ROOMS = [
  { id: "all", label: "🌍 الكل", labelFull: "الكل" },
  { id: "rojava", label: "🌹 روجاوا", labelFull: "Rojava روج آفا" },
  { id: "bashur", label: "🌿 باشور", labelFull: "Başûr باشور" },
  { id: "rojhelat", label: "🌅 روجهلات", labelFull: "Rojhelat روجهلات" },
  { id: "bakur", label: "⭐ باكور", labelFull: "Bakûr باكور" },
];

export default function ChatScreen() {
  const { user, profile } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [room, setRoom] = useState("all");
  const [sending, setSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    const q = query(
      collection(db, "publicChat"),
      where("room", "==", room),
      orderBy("createdAt", "desc"),
      limit(50)
    );
    const unsub = onSnapshot(q, (snap) => {
      const msgs: Message[] = [];
      snap.forEach(d => msgs.push({ id: d.id, ...d.data() } as Message));
      setMessages(msgs.reverse());
    });
    return unsub;
  }, [room]);

  const sendMessage = async () => {
    if (!text.trim() || !user || sending) return;
    const msgText = text.trim();
    setText("");
    setSending(true);
    try {
      await addDoc(collection(db, "publicChat"), {
        text: msgText,
        uid: user.uid,
        displayName: profile?.displayName || user.displayName || "مستخدم",
        photoURL: profile?.photoURL || user.photoURL || "",
        createdAt: serverTimestamp(),
        room,
      });
    } catch (e) {
      Alert.alert("خطأ", "فشل إرسال الرسالة");
      setText(msgText);
    } finally {
      setSending(false);
    }
  };

  const formatTime = (ts: any) => {
    if (!ts?.toDate) return "";
    const d = ts.toDate();
    return d.toLocaleTimeString("ar", { hour: "2-digit", minute: "2-digit" });
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isMe = item.uid === user?.uid;
    return (
      <View style={[styles.msgRow, isMe && styles.msgRowMe]}>
        {!isMe && (
          <TouchableOpacity onPress={() => router.push(`/profile/${item.uid}`)}>
            {item.photoURL ? (
              <Image source={{ uri: item.photoURL }} style={styles.msgAvatar} />
            ) : (
              <View style={[styles.msgAvatar, styles.avatarPlaceholder]}>
                <Text style={styles.avatarText}>{item.displayName?.[0] || "؟"}</Text>
              </View>
            )}
          </TouchableOpacity>
        )}
        <View style={[styles.msgBubble, isMe ? styles.myBubble : styles.theirBubble]}>
          {!isMe && (
            <TouchableOpacity onPress={() => router.push(`/profile/${item.uid}`)}>
              <Text style={styles.msgName}>{item.displayName}</Text>
            </TouchableOpacity>
          )}
          <Text style={styles.msgText}>{item.text}</Text>
          <Text style={styles.msgTime}>{formatTime(item.createdAt)}</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>🌍 الدردشة العامة</Text>
        </View>
      </View>

      {/* Room Tabs */}
      <View style={styles.roomTabs}>
        <FlatList
          data={ROOMS}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.roomTabsList}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.roomTab, room === item.id && styles.roomTabActive]}
              onPress={() => setRoom(item.id)}
            >
              <Text style={[styles.roomTabText, room === item.id && styles.roomTabTextActive]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.messagesList}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="chatbubbles-outline" size={48} color={colors.textMuted} />
            <Text style={styles.emptyText}>لا توجد رسائل بعد</Text>
            <Text style={styles.emptySubText}>كن أول من يبدأ المحادثة!</Text>
          </View>
        }
      />

      {/* Input */}
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <View style={styles.inputArea}>
          <TextInput
            style={styles.input}
            placeholder="اكتب رسالة..."
            placeholderTextColor={colors.textMuted}
            value={text}
            onChangeText={setText}
            multiline
            maxLength={500}
            textAlign="right"
            color={colors.textPrimary}
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!text.trim() || sending) && styles.sendBtnDisabled]}
            onPress={sendMessage}
            disabled={!text.trim() || sending}
          >
            <Ionicons name="send" size={20} color="#fff" style={{ transform: [{ scaleX: -1 }] }} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// Need to import where
import { where } from "firebase/firestore";

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
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "bold",
    color: colors.textPrimary,
    textAlign: "center",
  },
  roomTabs: {
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  roomTabsList: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  roomTab: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  roomTabActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  roomTabText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: "500",
  },
  roomTabTextActive: {
    color: "#fff",
  },
  messagesList: {
    padding: 12,
    paddingBottom: 8,
  },
  msgRow: {
    flexDirection: "row",
    marginBottom: 12,
    alignItems: "flex-end",
  },
  msgRowMe: {
    flexDirection: "row-reverse",
  },
  msgAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginHorizontal: 8,
  },
  avatarPlaceholder: {
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
  },
  msgBubble: {
    maxWidth: "75%",
    borderRadius: 16,
    padding: 10,
  },
  myBubble: {
    backgroundColor: colors.myMessage,
    borderBottomRightRadius: 4,
  },
  theirBubble: {
    backgroundColor: colors.theirMessage,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  msgName: {
    fontSize: 12,
    fontWeight: "bold",
    color: colors.primary,
    marginBottom: 4,
    textAlign: "right",
  },
  msgText: {
    color: colors.textPrimary,
    fontSize: 14,
    lineHeight: 20,
    textAlign: "right",
  },
  msgTime: {
    fontSize: 10,
    color: "rgba(255,255,255,0.5)",
    textAlign: "left",
    marginTop: 4,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
    gap: 12,
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: 16,
    fontWeight: "600",
  },
  emptySubText: {
    color: colors.textMuted,
    fontSize: 13,
  },
  inputArea: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 10,
  },
  input: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxHeight: 100,
    fontSize: 14,
    borderWidth: 1,
    borderColor: colors.border,
    textAlign: "right",
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  sendBtnDisabled: {
    opacity: 0.5,
  },
});

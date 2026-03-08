import React, { useEffect, useState, useRef } from "react";
import {
  View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet,
  Image, KeyboardAvoidingView, Platform, Alert,
} from "react-native";
import {
  collection, query, orderBy, limit, onSnapshot, addDoc,
  serverTimestamp, doc, getDoc, setDoc, updateDoc,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../contexts/AuthContext";
import { colors } from "../lib/colors";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";

interface Message {
  id: string;
  text: string;
  senderId: string;
  createdAt: any;
}

interface OtherUser {
  uid: string;
  displayName: string;
  photoURL: string;
  isOnline: boolean;
}

function getConvId(uid1: string, uid2: string) {
  return [uid1, uid2].sort().join("_");
}

export default function PrivateChatScreen() {
  const { id: otherUid } = useLocalSearchParams<{ id: string }>();
  const { user, profile } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [otherUser, setOtherUser] = useState<OtherUser | null>(null);
  const [sending, setSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const convId = user && otherUid ? getConvId(user.uid, otherUid) : null;

  useEffect(() => {
    if (!otherUid) return;
    getDoc(doc(db, "users", otherUid)).then(snap => {
      if (snap.exists()) setOtherUser({ uid: snap.id, ...snap.data() } as OtherUser);
    });
  }, [otherUid]);

  useEffect(() => {
    if (!convId) return;
    const q = query(
      collection(db, "conversations", convId, "messages"),
      orderBy("createdAt", "asc"),
      limit(100)
    );
    const unsub = onSnapshot(q, snap => {
      const msgs: Message[] = [];
      snap.forEach(d => msgs.push({ id: d.id, ...d.data() } as Message));
      setMessages(msgs);
    });
    return unsub;
  }, [convId]);

  const sendMessage = async () => {
    if (!text.trim() || !user || !convId || !otherUid || sending) return;
    const msgText = text.trim();
    setText("");
    setSending(true);
    try {
      // Ensure conversation exists
      const convRef = doc(db, "conversations", convId);
      await setDoc(convRef, {
        participants: [user.uid, otherUid],
        lastMessage: msgText,
        lastMessageTime: serverTimestamp(),
        [`unread_${otherUid}`]: 1,
      }, { merge: true });

      // Add message
      await addDoc(collection(db, "conversations", convId, "messages"), {
        text: msgText,
        senderId: user.uid,
        createdAt: serverTimestamp(),
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
    return ts.toDate().toLocaleTimeString("ar", { hour: "2-digit", minute: "2-digit" });
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isMe = item.senderId === user?.uid;
    return (
      <View style={[styles.msgRow, isMe && styles.msgRowMe]}>
        {!isMe && otherUser && (
          <View style={styles.msgAvatarWrapper}>
            {otherUser.photoURL ? (
              <Image source={{ uri: otherUser.photoURL }} style={styles.msgAvatar} />
            ) : (
              <View style={[styles.msgAvatar, styles.avatarPlaceholder]}>
                <Text style={styles.avatarText}>{otherUser.displayName?.[0] || "؟"}</Text>
              </View>
            )}
          </View>
        )}
        <View style={[styles.msgBubble, isMe ? styles.myBubble : styles.theirBubble]}>
          <Text style={styles.msgText}>{item.text}</Text>
          <Text style={[styles.msgTime, isMe && styles.msgTimeMe]}>{formatTime(item.createdAt)}</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.headerUser}
          onPress={() => otherUid && router.push(`/profile/${otherUid}`)}
        >
          {otherUser?.photoURL ? (
            <Image source={{ uri: otherUser.photoURL }} style={styles.headerAvatar} />
          ) : (
            <View style={[styles.headerAvatar, styles.avatarPlaceholder]}>
              <Text style={styles.avatarText}>{otherUser?.displayName?.[0] || "؟"}</Text>
            </View>
          )}
          <View style={styles.headerInfo}>
            <Text style={styles.headerName}>{otherUser?.displayName || "..."}</Text>
            <Text style={[styles.headerStatus, otherUser?.isOnline && styles.headerStatusOnline]}>
              {otherUser?.isOnline ? "متصل الآن" : "غير متصل"}
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.messagesList}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="chatbubble-outline" size={48} color={colors.textMuted} />
            <Text style={styles.emptyText}>ابدأ المحادثة!</Text>
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
            maxLength={1000}
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: {
    padding: 4,
    marginRight: 8,
  },
  headerUser: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
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
  headerInfo: {
    flex: 1,
  },
  headerName: {
    fontSize: 16,
    fontWeight: "bold",
    color: colors.textPrimary,
  },
  headerStatus: {
    fontSize: 12,
    color: colors.textMuted,
  },
  headerStatusOnline: {
    color: colors.online,
  },
  messagesList: {
    padding: 12,
    paddingBottom: 8,
  },
  msgRow: {
    flexDirection: "row",
    marginBottom: 10,
    alignItems: "flex-end",
  },
  msgRowMe: {
    flexDirection: "row-reverse",
  },
  msgAvatarWrapper: {
    marginHorizontal: 6,
  },
  msgAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
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
  msgTimeMe: {
    textAlign: "right",
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    paddingTop: 80,
    gap: 12,
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: 16,
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

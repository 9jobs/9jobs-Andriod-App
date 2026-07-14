import { useEffect, useRef, useState } from "react";
import { Alert, Image, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import Svg, { Circle, Path } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Screen } from "@/components/ui/Screen";
import { usePreviewSyncQuery, useSendMessageToAdminMutation } from "@/features/mobile-sync/hooks";
import { useMarkMessagesAsSeenMutation, useMarkMessagesAsDeliveredMutation } from "@/features/jobs/hooks";
import { colors, spacing } from "@/theme";
import { useSession } from "@/providers/SessionProvider";
import { joinSocketConversation, leaveSocketConversation } from "@/lib/socket/socketService";
import { clearAdminConversation, startNewAdminConversation } from "@/lib/data/mobile-sync-repository";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queries";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { requireOptionalNativeModule } from "expo-modules-core";

type PendingAttachment = {
  url: string;
  name: string;
  mimeType: string;
  size?: number;
  messageType: "image" | "document";
};

type AttachmentUploadInput = {
  uri: string;
  name: string;
  mimeType: string;
  size?: number;
  messageType: "image" | "document";
};

type ExpoSpeechModule = {
  speak: (id: string, text: string, options?: Record<string, unknown>) => void;
  stop: () => Promise<void> | void;
};

function getSpeechModule(): null | { speak: (text: string) => void; stop: () => void } {
  try {
    const nativeSpeech = requireOptionalNativeModule<ExpoSpeechModule>("ExpoSpeech");
    if (!nativeSpeech) {
      return null;
    }

    return {
      speak: (text: string) => {
        nativeSpeech.speak(String(Date.now()), text, {});
      },
      stop: () => {
        void nativeSpeech.stop();
      },
    };
  } catch (error) {
    console.warn("[Chat Screen] expo-speech native module is unavailable:", error);
    return null;
  }
}

export default function AdminThreadScreen() {
  const { user } = useSession();
  const { data: snapshot } = usePreviewSyncQuery(true);
  const sendMessage = useSendMessageToAdminMutation();
  const markSeen = useMarkMessagesAsSeenMutation();
  const markDelivered = useMarkMessagesAsDeliveredMutation();
  const [draft, setDraft] = useState("");
  const [pendingAttachment, setPendingAttachment] = useState<PendingAttachment | null>(null);
  const [isAttachmentMenuVisible, setIsAttachmentMenuVisible] = useState(false);
  const messages = snapshot?.messages ?? [];
  const scrollViewRef = useRef<ScrollView | null>(null);
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();

  const conversationId = user?.id || "preview-user-9jobs";

  useEffect(() => {
    joinSocketConversation(conversationId);
    return () => {
      leaveSocketConversation(conversationId);
      getSpeechModule()?.stop();
    };
  }, [conversationId]);

  useEffect(() => {
    markDelivered.mutate();
    markSeen.mutate();
  }, [messages.length]);

  const deleteMessage = async (messageId: number) => {
    try {
      const token = await AsyncStorage.getItem("auth_token");
      const backendUrl = process.env.EXPO_PUBLIC_BACKEND_URL || "http://10.0.2.2:3000";
      const res = await fetch(`${backendUrl}/api/chat/messages/${messageId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) throw new Error("Failed to delete message");
      queryClient.invalidateQueries({ queryKey: queryKeys.previewSync });
    } catch (err) {
      console.error("[Chat Screen] Error deleting message:", err);
      Alert.alert("Error", "Could not delete this message.");
    }
  };

  const clearChat = async () => {
    try {
      await clearAdminConversation(user);
      queryClient.invalidateQueries({ queryKey: queryKeys.previewSync });
      setPendingAttachment(null);
      setDraft("");
    } catch (err) {
      console.error("[Chat Screen] Error clearing chat:", err);
      Alert.alert("Error", "Could not clear the chat.");
    }
  };

  const handleLongPressMessage = (message: any) => {
    if (message.direction !== "outgoing") return;
    Alert.alert("Delete Message", "Are you sure you want to delete this message?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => deleteMessage(message.id) },
    ]);
  };

  const handleNewChat = () => {
    Alert.alert(
      "New Chat",
      "Would you like to initialize a new conversation? (This will clear your current chat history).",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Start New",
          onPress: async () => {
            try {
              await startNewAdminConversation(user);
              setDraft("");
              setPendingAttachment(null);
              queryClient.invalidateQueries({ queryKey: queryKeys.previewSync });
            } catch (err) {
              console.error("[Chat Screen] Error starting new chat:", err);
              Alert.alert("Error", "Could not start a new chat.");
            }
          },
        },
      ],
    );
  };

  const handleMoreMenu = () => {
    Alert.alert("Chat options", "Choose an action", [
      { text: "Cancel", style: "cancel" },
      { text: "Clear chat", onPress: () => void clearChat() },
      { text: "New chat", onPress: handleNewChat },
    ]);
  };

  const uploadAttachment = async (uri: string, fileName: string, mimeType: string) => {
    const response = await fetch(uri);
    const buffer = await response.arrayBuffer();

    const token = await AsyncStorage.getItem("auth_token");
    const backendUrl = process.env.EXPO_PUBLIC_BACKEND_URL || "http://10.0.2.2:3000";
    const res = await fetch(`${backendUrl}/api/chat/attachments`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": mimeType,
        "x-file-name": fileName,
        "x-file-type": mimeType,
      },
      body: buffer,
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(errorText || `Attachment upload failed with status ${res.status}`);
    }

    const payload = await res.json();
    if (!payload?.url) {
      throw new Error("Attachment upload succeeded without a public URL.");
    }

    return payload.url as string;
  };

  const preparePendingAttachment = async ({
    uri,
    name,
    mimeType,
    size,
    messageType,
  }: AttachmentUploadInput) => {
    const publicUrl = await uploadAttachment(uri, name, mimeType);
    setPendingAttachment({
      url: publicUrl,
      name,
      mimeType,
      size,
      messageType,
    });
  };

  const handlePickImageFallback = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission needed", "Please allow photo access to send an image.");
      return false;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });

    if (result.canceled || !result.assets?.length) {
      return true;
    }

    const asset = result.assets[0];
    await preparePendingAttachment({
      uri: asset.uri,
      name: asset.fileName || `image-${Date.now()}.jpg`,
      mimeType: asset.mimeType || "image/jpeg",
      size: asset.fileSize,
      messageType: "image",
    });

    return true;
  };

  const handlePickImage = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Permission needed", "Please allow photo access to send an image.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.7,
      });

      if (result.canceled || !result.assets?.length) {
        return;
      }

      const asset = result.assets[0];
      await preparePendingAttachment({
        uri: asset.uri,
        name: asset.fileName || `image-${Date.now()}.jpg`,
        mimeType: asset.mimeType || "image/jpeg",
        size: asset.fileSize,
        messageType: "image",
      });
    } catch (error) {
      console.error("[Chat Screen] Image picker failed:", error);
      Alert.alert("Error", "Could not upload this image from your device.");
    }
  };

  const handlePickCameraImage = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Permission needed", "Please allow camera access to capture a photo.");
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.7,
      });

      if (result.canceled || !result.assets?.length) {
        return;
      }

      const asset = result.assets[0];
      await preparePendingAttachment({
        uri: asset.uri,
        name: asset.fileName || `camera-${Date.now()}.jpg`,
        mimeType: asset.mimeType || "image/jpeg",
        size: asset.fileSize,
        messageType: "image",
      });
    } catch (error) {
      console.error("[Chat Screen] Camera image capture failed:", error);
      Alert.alert("Error", "Could not capture a photo from camera.");
    }
  };

  const handlePickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        multiple: false,
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets?.length) {
        return;
      }

      const file = result.assets[0];
      await preparePendingAttachment({
        uri: file.uri,
        name: file.name,
        mimeType: file.mimeType || "application/octet-stream",
        size: file.size,
        messageType: "document",
      });
    } catch (error) {
      console.error("[Chat Screen] Attachment picker failed:", error);
      if (Platform.OS === "android") {
        try {
          const usedImageFallback = await handlePickImageFallback();
          if (usedImageFallback) {
            return;
          }
        } catch (fallbackError) {
          console.error("[Chat Screen] Android attachment fallback failed:", fallbackError);
        }
      }
      Alert.alert("Error", "Could not pick a file from this device.");
    }
  };

  const handlePickAudio = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        multiple: false,
        copyToCacheDirectory: true,
        type: ["audio/*"],
      });

      if (result.canceled || !result.assets?.length) {
        return;
      }

      const file = result.assets[0];
      await preparePendingAttachment({
        uri: file.uri,
        name: file.name,
        mimeType: file.mimeType || "audio/mpeg",
        size: file.size,
        messageType: "document",
      });
    } catch (error) {
      console.error("[Chat Screen] Audio picker failed:", error);
      Alert.alert("Error", "Could not pick an audio file from this device.");
    }
  };

  const handleInsertContact = () => {
    setDraft((current) =>
      `${current ? `${current}\n` : ""}9Jobs Support Contact\nPhone: +61 422 279 428\nEmail: support@9jobs.app`,
    );
  };

  const handleAttachmentAction = async (action: "document" | "photos" | "camera" | "audio" | "contact") => {
    setIsAttachmentMenuVisible(false);

    if (action === "document") {
      await handlePickFile();
      return;
    }

    if (action === "photos") {
      await handlePickImage();
      return;
    }

    if (action === "camera") {
      await handlePickCameraImage();
      return;
    }

    if (action === "audio") {
      await handlePickAudio();
      return;
    }

    handleInsertContact();
  };

  const handlePickAttachment = () => {
    setIsAttachmentMenuVisible(true);
  };

  const handlePreviewDraftVoice = () => {
    const previewText = draft.trim();
    if (!previewText) {
      Alert.alert("Voice preview", "Type a message first, then tap the mic to hear it.");
      return;
    }
    const speech = getSpeechModule();
    if (!speech) {
      Alert.alert("Voice unavailable", "This build does not include the native speech module yet.");
      return;
    }
    speech.stop();
    speech.speak(previewText);
  };

  const handleSpeakLatestReply = () => {
    const latestIncoming = [...messages].reverse().find((message) => message.direction === "incoming" && message.content?.trim());
    if (!latestIncoming?.content) {
      Alert.alert("Speaker", "No support reply is available to read out yet.");
      return;
    }
    const speech = getSpeechModule();
    if (!speech) {
      Alert.alert("Voice unavailable", "This build does not include the native speech module yet.");
      return;
    }
    speech.stop();
    speech.speak(latestIncoming.content);
  };

  const handleSend = () => {
    const messageText = draft.trim();
    if (!messageText && !pendingAttachment) return;

    sendMessage.mutate(
      {
        text: messageText,
        messageType: pendingAttachment?.messageType ?? "text",
        attachmentUrl: pendingAttachment?.url,
        attachmentName: pendingAttachment?.name,
        attachmentMimeType: pendingAttachment?.mimeType,
        attachmentSize: pendingAttachment?.size,
      },
      {
        onSuccess: () => {
          setDraft("");
          setPendingAttachment(null);
        },
      },
    );
  };

  return (
    <Screen scroll={false} contentStyle={styles.screenContent}>
      <View style={styles.headerShell}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} style={styles.sideButton}>
            <BackIcon />
          </Pressable>

          <View style={styles.brandAvatar}>
            <Text style={styles.brandAvatarText}>9Jobs</Text>
          </View>

          <View style={styles.headerCopy}>
            <View style={styles.titleRow}>
              <Text style={styles.headerTitle}>9Jobs AI Assistant</Text>
              <VerifiedIcon />
            </View>
            <View style={styles.onlineRow}>
              <View style={styles.onlineDot} />
              <Text style={styles.onlineText}>Online</Text>
            </View>
          </View>

          <Pressable onPress={handleMoreMenu} style={styles.sideButton}>
            <MenuIcon />
          </Pressable>
        </View>
      </View>

      <View style={styles.chatCanvas}>
        <View style={styles.patternA} />
        <View style={styles.patternB} />
        <View style={styles.patternC} />

        <ScrollView
          ref={scrollViewRef}
          style={styles.messageScroller}
          contentContainerStyle={[
            styles.messageStack,
            { paddingBottom: 122 + insets.bottom },
          ]}
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.dayChip}>
            <Text style={styles.dayChipText}>Today</Text>
          </View>

          {messages.map((message) => {
            const isIncoming = message.direction === "incoming";

            return (
              <Pressable
                key={message.id}
                onLongPress={() => handleLongPressMessage(message)}
                delayLongPress={500}
                style={[styles.messageRow, isIncoming ? styles.incomingRow : styles.outgoingRow]}
              >
                {isIncoming ? (
                  <View style={styles.messageAvatar}>
                    <Text style={styles.messageAvatarText}>9J</Text>
                  </View>
                ) : null}

                <View style={[styles.bubble, isIncoming ? styles.incomingBubble : styles.outgoingBubble]}>
                  {renderMessageBody(message, isIncoming)}

                  <View style={styles.metaRow}>
                    <Text style={[styles.timestamp, !isIncoming && styles.outgoingTimestamp]}>
                      {new Date(message.created_at).toLocaleTimeString([], {
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </Text>
                    {!isIncoming ? (
                      <Text style={[styles.statusText, message.status === "seen" && styles.statusSeen]}>
                        {message.status === "sending"
                          ? "..."
                          : message.status === "seen"
                          ? "vv"
                          : message.status === "delivered"
                          ? "vv"
                          : "v"}
                      </Text>
                    ) : null}
                  </View>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>

        <Modal
          visible={isAttachmentMenuVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setIsAttachmentMenuVisible(false)}
        >
          <Pressable style={styles.attachmentMenuBackdrop} onPress={() => setIsAttachmentMenuVisible(false)}>
            <View style={styles.attachmentMenuCard}>
              <AttachmentMenuItem icon={<DocumentMenuIcon />} label="Document" onPress={() => void handleAttachmentAction("document")} />
              <AttachmentMenuItem icon={<PhotosMenuIcon />} label="Photos & videos" onPress={() => void handleAttachmentAction("photos")} />
              <AttachmentMenuItem icon={<CameraMenuIcon />} label="Camera" onPress={() => void handleAttachmentAction("camera")} />
              <AttachmentMenuItem icon={<AudioMenuIcon />} label="Audio" onPress={() => void handleAttachmentAction("audio")} />
              <AttachmentMenuItem icon={<ContactMenuIcon />} label="Contact" onPress={() => void handleAttachmentAction("contact")} />
            </View>
          </Pressable>
        </Modal>

        <View style={[styles.composerShell, { bottom: 62 + insets.bottom }]}>
          <View style={styles.inputWrap}>
            <Pressable onPress={handlePickAttachment} style={styles.inlineIconButton}>
              <AttachmentIcon />
            </Pressable>

            {!!pendingAttachment && (
              <View style={[styles.attachmentChip, styles.attachmentChipInline]}>
                <Text style={styles.attachmentChipText} numberOfLines={1}>
                  {pendingAttachment.name}
                </Text>
                <Pressable onPress={() => setPendingAttachment(null)} style={styles.attachmentChipClose}>
                  <Text style={styles.attachmentChipCloseText}>x</Text>
                </Pressable>
              </View>
            )}

            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder="Type a message..."
              placeholderTextColor="#8A9388"
              style={styles.input}
              multiline
              maxLength={1000}
            />

            <Pressable onPress={handlePreviewDraftVoice} style={styles.inlineIconButton}>
              <MicIcon />
            </Pressable>
          </View>

          <Pressable
            style={[
              styles.sendButton,
              (!draft.trim() && !pendingAttachment) || sendMessage.isPending ? styles.sendButtonDisabled : null,
            ]}
            disabled={(!draft.trim() && !pendingAttachment) || sendMessage.isPending}
            onPress={handleSend}
          >
            <SendIcon />
          </Pressable>
        </View>
      </View>
    </Screen>
  );
}

function isImageMessage(message: any) {
  return (
    message?.message_type === "image" ||
    String(message?.attachment_mime_type || "").startsWith("image/") ||
    /\.png$|\.jpg$|\.jpeg$|\.webp$|\.gif$/i.test(String(message?.attachment_url || ""))
  );
}

function renderMessageBody(message: any, isIncoming: boolean) {
  if (isImageMessage(message) && message.attachment_url) {
    return (
      <View style={styles.mediaWrap}>
        <Image source={{ uri: message.attachment_url }} style={styles.messageImage} resizeMode="cover" />
        {!!message.content ? (
          <Text style={[styles.bubbleText, isIncoming ? styles.incomingText : styles.outgoingText, styles.mediaCaption]}>
            {message.content}
          </Text>
        ) : null}
      </View>
    );
  }

  if (message?.attachment_url && message?.message_type === "document") {
    return (
      <View style={styles.documentWrap}>
        <Text style={[styles.documentLabel, isIncoming ? styles.incomingText : styles.outgoingText]}>
          {message.attachment_name || "Attachment"}
        </Text>
        {!!message.content ? (
          <Text style={[styles.bubbleText, isIncoming ? styles.incomingText : styles.outgoingText]}>
            {message.content}
          </Text>
        ) : null}
      </View>
    );
  }

  return (
    <Text style={[styles.bubbleText, isIncoming ? styles.incomingText : styles.outgoingText]}>
      {message.content}
    </Text>
  );
}

function BackIcon() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path d="M15 18L9 12L15 6" stroke="#171914" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function MenuIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="5" r="1.8" fill="#171914" />
      <Circle cx="12" cy="12" r="1.8" fill="#171914" />
      <Circle cx="12" cy="19" r="1.8" fill="#171914" />
    </Svg>
  );
}

function AttachmentIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path d="M8.5 12.5L13.8 7.2C15.2 5.8 17.4 5.8 18.8 7.2C20.2 8.6 20.2 10.8 18.8 12.2L11.1 19.9C8.9 22.1 5.3 22.1 3.1 19.9C0.9 17.7 0.9 14.1 3.1 11.9L11.6 3.4" stroke="#6B746A" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function MicIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path d="M12 3.5C10.34 3.5 9 4.84 9 6.5V11C9 12.66 10.34 14 12 14C13.66 14 15 12.66 15 11V6.5C15 4.84 13.66 3.5 12 3.5Z" stroke="#6B746A" strokeWidth={1.8} />
      <Path d="M6.5 10.5C6.5 13.54 8.96 16 12 16C15.04 16 17.5 13.54 17.5 10.5" stroke="#6B746A" strokeWidth={1.8} strokeLinecap="round" />
      <Path d="M12 16V20.5" stroke="#6B746A" strokeWidth={1.8} strokeLinecap="round" />
      <Path d="M9.5 20.5H14.5" stroke="#6B746A" strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

function SpeakerIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path d="M5 10H8.5L13 6V18L8.5 14H5V10Z" stroke="#6B746A" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M16 9C17.2 10.2 17.2 13.8 16 15" stroke="#6B746A" strokeWidth={1.8} strokeLinecap="round" />
      <Path d="M18.5 6.5C21.1 9.1 21.1 14.9 18.5 17.5" stroke="#6B746A" strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

function SendIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path d="M21 3L10 14" stroke="#FFFFFF" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M21 3L14 21L10 14L3 10L21 3Z" stroke="#FFFFFF" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function VerifiedIcon() {
  return (
    <View style={styles.verified}>
      <Text style={styles.verifiedText}>v</Text>
    </View>
  );
}

function AttachmentMenuItem({
  icon,
  label,
  onPress,
}: {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.attachmentMenuItem}>
      <View style={styles.attachmentMenuIconWrap}>{icon}</View>
      <Text style={styles.attachmentMenuLabel}>{label}</Text>
    </Pressable>
  );
}

function DocumentMenuIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path d="M8 3.5H13L18.5 9V20.5H8C6.9 20.5 6 19.6 6 18.5V5.5C6 4.4 6.9 3.5 8 3.5Z" fill="#6159FF" />
      <Path d="M13 3.5V9H18.5" stroke="#FFFFFF" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M9.5 13H15" stroke="#FFFFFF" strokeWidth={1.5} strokeLinecap="round" />
      <Path d="M9.5 16H15" stroke="#FFFFFF" strokeWidth={1.5} strokeLinecap="round" />
    </Svg>
  );
}

function PhotosMenuIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path d="M4 7.5C4 6.4 4.9 5.5 6 5.5H18C19.1 5.5 20 6.4 20 7.5V16.5C20 17.6 19.1 18.5 18 18.5H6C4.9 18.5 4 17.6 4 16.5V7.5Z" fill="#1F80FF" />
      <Path d="M7 15L10 12L12.5 14.5L14.5 12.5L17 15" stroke="#FFFFFF" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      <Circle cx="9" cy="9" r="1.5" fill="#FFFFFF" />
    </Svg>
  );
}

function CameraMenuIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path d="M7 7.5L8.2 5.5H15.8L17 7.5H18C19.1 7.5 20 8.4 20 9.5V17.5C20 18.6 19.1 19.5 18 19.5H6C4.9 19.5 4 18.6 4 17.5V9.5C4 8.4 4.9 7.5 6 7.5H7Z" fill="#FF2F92" />
      <Circle cx="12" cy="13" r="3.2" stroke="#FFFFFF" strokeWidth={1.5} />
    </Svg>
  );
}

function AudioMenuIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path d="M12 4.5C10.62 4.5 9.5 5.62 9.5 7V11C9.5 12.38 10.62 13.5 12 13.5C13.38 13.5 14.5 12.38 14.5 11V7C14.5 5.62 13.38 4.5 12 4.5Z" fill="#FF8A00" />
      <Path d="M7.5 10.5C7.5 13 9.43 15 12 15C14.57 15 16.5 13 16.5 10.5" stroke="#FF8A00" strokeWidth={1.5} strokeLinecap="round" />
      <Path d="M12 15V18.5" stroke="#FF8A00" strokeWidth={1.5} strokeLinecap="round" />
      <Path d="M10 18.5H14" stroke="#FF8A00" strokeWidth={1.5} strokeLinecap="round" />
    </Svg>
  );
}

function ContactMenuIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="8.5" r="3.2" fill="#0A9AF0" />
      <Path d="M6.5 18.5C7.7 15.8 9.56 14.5 12 14.5C14.44 14.5 16.3 15.8 17.5 18.5" stroke="#0A9AF0" strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

const styles = StyleSheet.create({
  screenContent: {
    flex: 1,
    backgroundColor: "#FBF8F1",
    paddingBottom: 0,
    gap: 0,
    paddingHorizontal: 0,
  },
  headerShell: {
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#EEE9DE",
    paddingTop: spacing.md,
    paddingHorizontal: spacing.sm,
    paddingBottom: 10,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  sideButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  brandAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#050505",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 2,
    marginRight: 10,
  },
  brandAvatarText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "800",
  },
  headerCopy: {
    flex: 1,
    gap: 2,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  headerTitle: {
    fontSize: 18,
    lineHeight: 22,
    fontWeight: "700",
    color: colors.text,
  },
  verified: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#22A447",
    alignItems: "center",
    justifyContent: "center",
  },
  verifiedText: {
    color: "#FFFFFF",
    fontSize: 8,
    lineHeight: 10,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  onlineRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  onlineDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: "#22A447",
  },
  onlineText: {
    fontSize: 12,
    lineHeight: 16,
    color: "#6D756A",
  },
  chatCanvas: {
    flex: 1,
    backgroundColor: "#FBF8F1",
    paddingHorizontal: 10,
    paddingTop: 10,
    paddingBottom: 0,
    overflow: "hidden",
  },
  patternA: {
    position: "absolute",
    top: 90,
    left: -20,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: "rgba(255,255,255,0.55)",
  },
  patternB: {
    position: "absolute",
    right: -40,
    bottom: 140,
    width: 190,
    height: 190,
    borderRadius: 95,
    backgroundColor: "rgba(163, 230, 53, 0.06)",
  },
  patternC: {
    position: "absolute",
    top: 260,
    left: -40,
    width: "140%",
    height: 96,
    backgroundColor: "rgba(255,255,255,0.3)",
    transform: [{ rotate: "-8deg" }],
  },
  messageScroller: {
    flex: 1,
  },
  messageStack: {
    paddingBottom: spacing.md,
  },
  dayChip: {
    alignSelf: "center",
    backgroundColor: "#FFF5D7",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 16,
  },
  dayChipText: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "700",
    color: "#776727",
  },
  messageRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    marginBottom: 12,
  },
  incomingRow: {
    justifyContent: "flex-start",
  },
  outgoingRow: {
    justifyContent: "flex-end",
  },
  messageAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#050505",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 3,
  },
  messageAvatarText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "800",
  },
  bubble: {
    maxWidth: "79%",
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 8,
  },
  incomingBubble: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 6,
  },
  outgoingBubble: {
    backgroundColor: "#171914",
    borderTopRightRadius: 6,
  },
  bubbleText: {
    fontSize: 16,
    lineHeight: 23,
  },
  incomingText: {
    color: "#171914",
  },
  outgoingText: {
    color: "#FFFFFF",
  },
  mediaWrap: {
    gap: 8,
  },
  messageImage: {
    width: 220,
    height: 220,
    borderRadius: 14,
    backgroundColor: "#EDE8DC",
  },
  mediaCaption: {
    marginTop: 2,
  },
  documentWrap: {
    gap: 6,
  },
  documentLabel: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "700",
    textDecorationLine: "underline",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 4,
    marginTop: 4,
  },
  timestamp: {
    fontSize: 11,
    lineHeight: 14,
    color: "#8A9188",
  },
  outgoingTimestamp: {
    color: "#B7BEB5",
  },
  statusText: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "700",
    color: "#BBC2B8",
  },
  statusSeen: {
    color: "#A2ED7A",
  },
  attachmentChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#EEF6E7",
    borderRadius: 16,
    paddingLeft: 12,
    paddingRight: 8,
    paddingVertical: 8,
    maxWidth: "86%",
    zIndex: 3,
  },
  attachmentChipInline: {
    flexShrink: 1,
    maxWidth: "42%",
    marginLeft: 2,
    marginRight: 4,
  },
  attachmentChipText: {
    flexShrink: 1,
    fontSize: 13,
    lineHeight: 16,
    color: "#47603E",
    fontWeight: "600",
  },
  attachmentChipClose: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#DCEBCF",
  },
  attachmentChipCloseText: {
    color: "#47603E",
    fontSize: 12,
    fontWeight: "800",
  },
  attachmentMenuBackdrop: {
    flex: 1,
    justifyContent: "flex-end",
    paddingLeft: 18,
    paddingBottom: 148,
    backgroundColor: "rgba(0,0,0,0.06)",
  },
  attachmentMenuCard: {
    width: 196,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    paddingVertical: 10,
    paddingHorizontal: 4,
    shadowColor: "#000000",
    shadowOpacity: 0.14,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  attachmentMenuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  attachmentMenuIconWrap: {
    width: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  attachmentMenuLabel: {
    fontSize: 16,
    lineHeight: 20,
    color: "#171914",
    fontWeight: "500",
  },
  composerShell: {
    position: "absolute",
    left: 10,
    right: 10,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    paddingTop: 8,
    zIndex: 4,
  },
  inputWrap: {
    flex: 1,
    minHeight: 54,
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "#E7E1D5",
    paddingLeft: 6,
    paddingRight: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  inlineIconButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 0,
  },
  input: {
    flex: 1,
    minHeight: 52,
    maxHeight: 110,
    color: colors.text,
    fontSize: 15,
    lineHeight: 20,
    paddingTop: 15,
    paddingBottom: 15,
    paddingHorizontal: 2,
  },
  sendButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#22A447",
    alignItems: "center",
    justifyContent: "center",
  },
  sendButtonDisabled: {
    backgroundColor: "#A5D7AF",
  },
});

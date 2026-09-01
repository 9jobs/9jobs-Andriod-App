import { useCallback, useEffect, useRef, useState, useMemo } from "react";
import { Alert, Image, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, KeyboardAvoidingView, Keyboard, type NativeSyntheticEvent, type NativeScrollEvent } from "react-native";
let Contacts: any = null;
try {
  Contacts = require("expo-contacts");
} catch (e) {
  console.warn("expo-contacts native module not found");
}
import { router } from "expo-router";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import Svg, { Circle, Path, Rect } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Screen } from "@/components/ui/Screen";
import { usePreviewSyncQuery, useSendMessageToAdminMutation } from "@/features/mobile-sync/hooks";
import { useMarkMessagesAsSeenMutation, useMarkMessagesAsDeliveredMutation } from "@/features/jobs/hooks";
import { isNearBottom, verticalScrollProps } from "@/lib/ui/scroll";
import { colors, spacing } from "@/theme";
import { useSession } from "@/providers/SessionProvider";
import { joinSocketConversation, leaveSocketConversation } from "@/lib/socket/socketService";
import { clearAdminConversation, startNewAdminConversation } from "@/lib/data/mobile-sync-repository";
import { resolveBackendUrl } from "@/lib/data/backend-auth-token";
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

import { FadeInView } from "@/components/motion/FadeInView";

export default function AdminThreadScreen() {
  const { user } = useSession();
  const { data: snapshot } = usePreviewSyncQuery(false, {
    refetchInterval: 3000,
    refetchIntervalInBackground: true,
    refetchOnMount: "always",
  });
  const sendMessage = useSendMessageToAdminMutation();
  const markSeen = useMarkMessagesAsSeenMutation();
  const markDelivered = useMarkMessagesAsDeliveredMutation();
  const [draft, setDraft] = useState("");
  const [pendingAttachment, setPendingAttachment] = useState<PendingAttachment | null>(null);
  const [isAttachmentMenuVisible, setIsAttachmentMenuVisible] = useState(false);
  const messages = snapshot?.messages ?? [];
  const scrollViewRef = useRef<ScrollView | null>(null);
  const stickToBottomRef = useRef(true);
  const isPickingRef = useRef(false);
  const initialMessageIdsRef = useRef<Set<number | string>>(new Set());

  const bubbleStyles = useMemo(() => {
    const isDark = colors.background === "#000000";
    return {
      incoming: {
        backgroundColor: isDark ? "#1A1A1A" : "#FFFFFF",
        borderColor: isDark ? "#2A2B27" : "#E8E5DB",
      },
      outgoing: {
        backgroundColor: isDark ? "#2A2B27" : "#DDF6D3",
      },
      incomingText: {
        color: isDark ? "#FFFFFF" : "#0A0A08",
      },
      outgoingText: {
        color: isDark ? "#FFFFFF" : "#0A0A08",
      },
      incomingTime: {
        color: isDark ? "#A1A595" : "#6F7268",
      },
      outgoingTime: {
        color: isDark ? "#A1A595" : "#6F7268",
      },
      statusText: {
        color: isDark ? "#A1A595" : "#6F7268",
      },
      statusSeen: {
        color: "#22A447",
      }
    };
  }, [colors.background]);

  useEffect(() => {
    if (messages.length > 0 && initialMessageIdsRef.current.size === 0) {
      initialMessageIdsRef.current = new Set(messages.map((m) => m.id));
    }
  }, [messages]);
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  useEffect(() => {
    const showSubscription = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      () => setIsKeyboardVisible(true)
    );
    const hideSubscription = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => setIsKeyboardVisible(false)
    );
    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

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

  const handleChatScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    stickToBottomRef.current = isNearBottom(event.nativeEvent);
  }, []);

  const handleContentSizeChange = useCallback(() => {
    if (!stickToBottomRef.current) {
      return;
    }

    requestAnimationFrame(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    });
  }, []);

  const deleteMessage = async (messageId: number) => {
    try {
      const token = await AsyncStorage.getItem("auth_token");
      const backendUrl = resolveBackendUrl();
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
    const backendUrl = resolveBackendUrl();
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
    if (isPickingRef.current) return false;
    isPickingRef.current = true;
    try {
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
    } finally {
      isPickingRef.current = false;
    }
  };

  const handlePickImage = async () => {
    if (isPickingRef.current) return;
    isPickingRef.current = true;
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
    } finally {
      isPickingRef.current = false;
    }
  };

  const handlePickCameraImage = async () => {
    if (isPickingRef.current) return;
    isPickingRef.current = true;
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
    } finally {
      isPickingRef.current = false;
    }
  };

  const handlePickFile = async () => {
    if (isPickingRef.current) return;
    isPickingRef.current = true;
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
      isPickingRef.current = false;
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
    } finally {
      isPickingRef.current = false;
    }
  };

  const handlePickAudio = async () => {
    if (isPickingRef.current) return;
    isPickingRef.current = true;
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
    } finally {
      isPickingRef.current = false;
    }
  };

  const handleInsertContact = async () => {
    if (!Contacts) {
      Alert.alert("Module Missing", "Contacts feature requires a native build. Please install the updated app build.");
      return;
    }
    if (isPickingRef.current) return;
    isPickingRef.current = true;
    try {
      let contact: any = null;

      // Try direct system picker first (works without full read contacts permission on Android)
      try {
        contact = await Contacts.presentContactPickerAsync();
      } catch (pickerErr) {
        console.log("[Chat Screen] Direct picker notice:", pickerErr);
      }

      // If direct picker returned null/failed, request permissions & retry
      if (!contact) {
        const { status } = await Contacts.requestPermissionsAsync();
        if (status !== "granted") {
          Alert.alert("Permission Required", "Please grant contacts permission in device settings to pick a contact.");
          return;
        }
        contact = await Contacts.presentContactPickerAsync();
      }

      if (contact) {
        const name = contact.name || `${contact.firstName || ""} ${contact.lastName || ""}`.trim() || "Unknown Contact";
        const phones = (contact.phoneNumbers || []).map((p: any) => p.number).filter(Boolean).join(", ");
        const emails = (contact.emails || []).map((e: any) => e.email).filter(Boolean).join(", ");

        let contactText = `👤 ${name}`;
        if (phones) contactText += `\n📞 Phone: ${phones}`;
        if (emails) contactText += `\n✉️ Email: ${emails}`;

        setDraft((current) =>
          `${current ? `${current}\n` : ""}${contactText}`
        );
      }
    } catch (error) {
      console.error("[Chat Screen] Contact picker failed:", error);
      Alert.alert("Error", "Could not pick a contact from this device.");
    } finally {
      isPickingRef.current = false;
    }
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
    const currentAttachment = pendingAttachment;
    if (!messageText && !currentAttachment) return;

    // Clear draft & pending attachment immediately for 0ms instant user feedback
    setDraft("");
    setPendingAttachment(null);

    sendMessage.mutate(
      {
        text: messageText,
        messageType: currentAttachment?.messageType ?? "text",
        attachmentUrl: currentAttachment?.url,
        attachmentName: currentAttachment?.name,
        attachmentMimeType: currentAttachment?.mimeType,
        attachmentSize: currentAttachment?.size,
      },
      {
        onError: (err) => {
          console.error("[Chat Screen] Send failed:", err);
          // Restore user draft if network request fails
          setDraft(messageText);
          setPendingAttachment(currentAttachment);
          Alert.alert("Send Failed", "Could not send message. Please try again.");
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

          <View style={[styles.brandAvatar, { backgroundColor: bubbleStyles.incoming.backgroundColor, borderWidth: 1, borderColor: bubbleStyles.incoming.borderColor }]}>
            <AdvisorAvatarIcon color={bubbleStyles.statusSeen.color} />
          </View>

          <View style={styles.headerCopy}>
            <View style={styles.titleRow}>
              <Text style={styles.headerTitle}>9Jobs Career Advisor</Text>
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

      <KeyboardAvoidingView
        style={styles.chatCanvas}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 60}
      >
        <View style={styles.patternA} />
        <View style={styles.patternB} />
        <View style={styles.patternC} />

        <ScrollView
          ref={scrollViewRef}
          {...verticalScrollProps}
          style={styles.messageScroller}
          contentContainerStyle={[
            styles.messageStack,
            { paddingBottom: 20 },
          ]}
          onScroll={handleChatScroll}
          onContentSizeChange={handleContentSizeChange}
        >
          {(() => {
            let lastDateLabel = "";
            return messages.map((message) => {
              const msgDate = new Date(message.created_at);
              let dateLabel = "";
              if (!Number.isNaN(msgDate.getTime())) {
                dateLabel = getWhatsAppStyleDateString(msgDate);
              }

              const showDateDivider = dateLabel && dateLabel !== lastDateLabel;
              if (showDateDivider) {
                lastDateLabel = dateLabel;
              }

              const isIncoming = message.direction === "incoming";
              const isNewlyAdded = !initialMessageIdsRef.current.has(message.id);

              const rowContent = (
                <Pressable
                  key={message.id}
                  onLongPress={() => handleLongPressMessage(message)}
                  delayLongPress={500}
                  style={[styles.messageRow, isIncoming ? styles.incomingRow : styles.outgoingRow]}
                >
                  {isIncoming ? (
                    <View style={[styles.messageAvatar, { backgroundColor: bubbleStyles.incoming.backgroundColor, borderWidth: 1, borderColor: bubbleStyles.incoming.borderColor }]}>
                      <AdvisorAvatarIcon color={bubbleStyles.statusSeen.color} />
                    </View>
                  ) : null}

                  <View style={[styles.bubble, isIncoming ? styles.incomingBubble : styles.outgoingBubble, isIncoming ? bubbleStyles.incoming : bubbleStyles.outgoing]}>
                    {renderMessageBody(message, isIncoming, isIncoming ? bubbleStyles.incomingText : bubbleStyles.outgoingText)}

                    <View style={styles.metaRow}>
                      <Text style={[styles.timestamp, isIncoming ? bubbleStyles.incomingTime : bubbleStyles.outgoingTime]}>
                        {new Date(message.created_at).toLocaleTimeString([], {
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </Text>
                      {!isIncoming ? (
                        <Text style={[styles.statusText, message.status === "seen" && styles.statusSeen, { color: message.status === "seen" ? bubbleStyles.statusSeen.color : bubbleStyles.statusText.color }]}>
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

              const msgElement = isNewlyAdded ? (
                <FadeInView key={message.id} type={isIncoming ? "fade-right" : "fade-left"} duration={240}>
                  {rowContent}
                </FadeInView>
              ) : (
                rowContent
              );

              if (showDateDivider) {
                return [
                  <View key={`divider-${message.id}`} style={styles.dayChip}>
                    <Text style={styles.dayChipText}>{dateLabel}</Text>
                  </View>,
                  msgElement,
                ];
              }

              return msgElement;
            });
          })()}
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

        <View style={[
          styles.composerShell,
          { marginBottom: isKeyboardVisible ? 0 : (insets.bottom > 0 ? insets.bottom : 10) }
        ]}>
          <Pressable onPress={handlePickAttachment} style={styles.composerExternalButton}>
            <AttachmentIcon />
          </Pressable>

          <View style={styles.inputWrap}>
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
              placeholder="Write a message..."
              placeholderTextColor="#8A9388"
              style={styles.input}
              multiline
              maxLength={1000}
            />

            <Pressable onPress={() => Alert.alert("Emojis", "Smiley keyboard selected")} style={styles.inlineEmojiButton}>
              <SmileyIcon />
            </Pressable>
          </View>

          {draft.trim() || pendingAttachment ? (
            <Pressable
              style={styles.composerExternalButton}
              disabled={sendMessage.isPending}
              onPress={handleSend}
            >
              <SendIcon color="#22A447" />
            </Pressable>
          ) : (
            <Pressable
              style={styles.composerExternalButton}
              onPress={handlePreviewDraftVoice}
            >
              <MicIcon />
            </Pressable>
          )}
        </View>
      </KeyboardAvoidingView>
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

function renderMessageBody(message: any, isIncoming: boolean, textStyleOverride: any) {
  if (isImageMessage(message) && message.attachment_url) {
    return (
      <View style={styles.mediaWrap}>
        <Image source={{ uri: message.attachment_url }} style={styles.messageImage} resizeMode="cover" />
        {!!message.content ? (
          <Text style={[styles.bubbleText, textStyleOverride, styles.mediaCaption]}>
            {message.content}
          </Text>
        ) : null}
      </View>
    );
  }

  if (message?.attachment_url && message?.message_type === "document") {
    return (
      <View style={styles.documentWrap}>
        <Text style={[styles.documentLabel, textStyleOverride]}>
          {message.attachment_name || "Attachment"}
        </Text>
        {!!message.content ? (
          <Text style={[styles.bubbleText, textStyleOverride]}>
            {message.content}
          </Text>
        ) : null}
      </View>
    );
  }

  return (
    <Text style={[styles.bubbleText, textStyleOverride]}>
      {message.content}
    </Text>
  );
}

function AdvisorAvatarIcon({ color }: { color: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      {/* Sparkles/Stars on left and right */}
      <Path d="M4 6L4.5 7.5L6 8L4.5 8.5L4 10L3.5 8.5L2 8L3.5 7.5L4 6Z" fill={color} />
      <Path d="M20 4L20.5 5.5L22 6L20.5 6.5L20 8L19.5 6.5L18 6L19.5 5.5L20 4Z" fill={color} />
      {/* Main user silhouette inside shield or badge */}
      <Circle cx="12" cy="8" r="3.5" stroke={color} strokeWidth={2} />
      <Path d="M6 18.5C6 15.5 8.5 13.5 12 13.5C15.5 13.5 18 15.5 18 18.5" stroke={color} strokeWidth={2} strokeLinecap="round" />
      {/* Advisor tie/decoration inside body */}
      <Path d="M12 13.8L13 16.5H11L12 13.8Z" fill={color} />
      <Path d="M12 16.5L13 21L12 22L11 21L12 16.5Z" fill={color} />
    </Svg>
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

function SendIcon({ color = "#22A447" }: { color?: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path d="M22 2L11 13" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M22 2L15 22L11 13L2 9L22 2Z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function PhoneIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path d="M5 4H7.5C8.3 4 9 4.7 9 5.5V8C9 8.8 8.3 9.5 7.5 9.5H6.5C7.5 12 9.5 14 12 15V14C12 13.2 12.7 12.5 13.5 12.5H16C16.8 12.5 17.5 13.2 17.5 14V16.5C17.5 17.3 16.8 18 16 18H15C9.5 18 5 13.5 5 8V7C5 6.2 5.7 5.5 6.5 5.5" stroke="#171914" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function VideoIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path d="M15 10L19.5 6.5V17.5L15 14V10Z" stroke="#171914" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Rect x="4" y="6" width="11" height="12" rx="2" stroke="#171914" strokeWidth={2} />
    </Svg>
  );
}

function SmileyIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="9" stroke="#6B746A" strokeWidth={1.8} />
      <Path d="M9 10H9.01M15 10H15.01" stroke="#6B746A" strokeWidth={2} strokeLinecap="round" />
      <Path d="M8 14.5C9.5 16 14.5 16 16 14.5" stroke="#6B746A" strokeWidth={1.8} strokeLinecap="round" />
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
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 8,
    paddingHorizontal: 8,
    zIndex: 4,
  },
  composerExternalButton: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
  },
  inlineEmojiButton: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 4,
  },
  inputWrap: {
    flex: 1,
    minHeight: 44,
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#E7E1D5",
    paddingLeft: 12,
    paddingRight: 6,
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 4,
  },
  input: {
    flex: 1,
    minHeight: 36,
    maxHeight: 110,
    color: colors.text,
    fontSize: 15,
    lineHeight: 20,
    paddingTop: 8,
    paddingBottom: 8,
    paddingHorizontal: 2,
  },
  headerRightRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  headerIconButton: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
});

function getWhatsAppStyleDateString(date: Date): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const sixDaysAgo = new Date(today);
  sixDaysAgo.setDate(sixDaysAgo.getDate() - 6);

  const compareDate = new Date(date);
  compareDate.setHours(0, 0, 0, 0);

  if (compareDate.getTime() === today.getTime()) {
    return "Today";
  } else if (compareDate.getTime() === yesterday.getTime()) {
    return "Yesterday";
  } else if (compareDate.getTime() >= sixDaysAgo.getTime()) {
    return new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(date);
  } else {
    return new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(date);
  }
}

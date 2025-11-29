"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Send, Paperclip, FileIcon } from "lucide-react";
import { Timestamp, collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, doc, updateDoc, arrayUnion } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { uploadFile } from "@/lib/storage";

interface Message {
  id: string;
  senderId: string;
  text: string;
  attachmentUrl?: string;
  attachmentName?: string;
  createdAt: Timestamp;
  readBy: string[];
}

interface ChatBoxProps {
  roomId: string;
  currentUserId: string;
}

export function ChatBox({ roomId, currentUserId }: ChatBoxProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (!roomId) return;

    const q = query(
      collection(db, "rooms", roomId, "messages"),
      orderBy("createdAt", "asc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs: Message[] = [];
      snapshot.forEach((doc) => {
        msgs.push({ id: doc.id, ...doc.data() } as Message);
      });
      setMessages(msgs);
    });

    return () => unsubscribe();
  }, [roomId]);

  // Mark as read
  useEffect(() => {
    if (!roomId || !currentUserId || messages.length === 0) return;

    const unreadMessages = messages.filter(
      (msg) => msg.senderId !== currentUserId && !msg.readBy?.includes(currentUserId)
    );

    if (unreadMessages.length > 0) {
      unreadMessages.forEach(async (msg) => {
        try {
          const msgRef = doc(db, "rooms", roomId, "messages", msg.id);
          await updateDoc(msgRef, {
            readBy: arrayUnion(currentUserId),
          });
        } catch (error) {
          console.error("Error marking message as read:", error);
        }
      });
    }
  }, [messages, roomId, currentUserId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    try {
      await addDoc(collection(db, "rooms", roomId, "messages"), {
        senderId: currentUserId,
        text: newMessage,
        createdAt: serverTimestamp(),
        readBy: [currentUserId],
      });
      setNewMessage("");
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 100 * 1024 * 1024) {
      alert("ファイルサイズは100MB以下にしてください。");
      return;
    }

    setIsUploading(true);
    try {
      const path = `messages/${roomId}/${Date.now()}_${file.name}`;
      const url = await uploadFile(path, file);

      await addDoc(collection(db, "rooms", roomId, "messages"), {
        senderId: currentUserId,
        text: "ファイルを送信しました",
        attachmentUrl: url,
        attachmentName: file.name,
        createdAt: serverTimestamp(),
        readBy: [currentUserId],
      });
    } catch (error) {
      console.error("Error uploading file:", error);
      alert("ファイルのアップロードに失敗しました。");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <div className="flex flex-col h-[600px] bg-white rounded-xl border border-gray-200 shadow-sm">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => {
          const isMyMessage = msg.senderId === currentUserId;
          return (
            <div
              key={msg.id}
              className={`flex ${isMyMessage ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[70%] rounded-lg p-3 ${
                  isMyMessage
                    ? "bg-primary text-white rounded-br-none"
                    : "bg-gray-100 text-gray-800 rounded-bl-none"
                }`}
              >
                {msg.attachmentUrl ? (
                  <div className="mb-2">
                    <a
                      href={msg.attachmentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`flex items-center gap-2 p-2 rounded-md ${
                        isMyMessage ? "bg-primary-hover" : "bg-white"
                      }`}
                    >
                      <FileIcon size={20} />
                      <span className="underline truncate max-w-[200px]">
                        {msg.attachmentName || "添付ファイル"}
                      </span>
                    </a>
                  </div>
                ) : null}
                <p className="text-sm">{msg.text}</p>
                <div className="flex justify-between items-center mt-1 gap-2">
                  <span className={`text-xs ${isMyMessage ? "text-primary-100" : "text-gray-500"}`}>
                    {msg.createdAt?.seconds ? new Date(msg.createdAt.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                  </span>
                  {isMyMessage && (
                    <span className="text-xs text-primary-100">
                      {msg.readBy?.length > 1 ? "既読" : "未読"}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 border-t border-gray-200">
        <form onSubmit={handleSendMessage} className="flex gap-2 items-center">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            className="hidden"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            <Paperclip size={20} className="text-gray-500" />
          </Button>
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="メッセージを入力..."
            className="flex-1"
            disabled={isUploading}
          />
          <Button type="submit" size="icon" disabled={isUploading}>
            <Send size={20} />
          </Button>
        </form>
      </div>
    </div>
  );
}

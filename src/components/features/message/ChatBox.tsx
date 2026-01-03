"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/Button";
import { Send, Paperclip, FileIcon } from "lucide-react";
import { Timestamp, collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, doc, updateDoc, arrayUnion } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { uploadFile } from "@/lib/storage";

interface Message {
  id: string;
  senderId: string;
  text: string;
  attachments?: { name: string; url: string }[];
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
  const [files, setFiles] = useState<File[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [newMessage]);

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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      // Check size limit for each file
      const validFiles = newFiles.filter(file => {
        if (file.size > 100 * 1024 * 1024) {
          alert(`ファイル ${file.name} は100MBを超えているため除外されました。`);
          return false;
        }
        return true;
      });
      setFiles(prev => [...prev, ...validFiles]);
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const uploadFiles = async (files: File[]): Promise<{ name: string; url: string }[]> => {
    const attachments: { name: string; url: string }[] = [];
    for (const file of files) {
      const path = `messages/${roomId}/${Date.now()}_${file.name}`;
      const url = await uploadFile(path, file);
      attachments.push({ name: file.name, url });
    }
    return attachments;
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() && files.length === 0) return;

    setIsUploading(true);
    try {
      let attachments: { name: string; url: string }[] = [];
      if (files.length > 0) {
        attachments = await uploadFiles(files);
      }

      await addDoc(collection(db, "rooms", roomId, "messages"), {
        senderId: currentUserId,
        text: newMessage,
        attachments,
        createdAt: serverTimestamp(),
        readBy: [currentUserId],
        emailSent: false,
      });
      setNewMessage("");
      setFiles([]);
      // Reset height
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    } catch (error) {
      console.error("Error sending message:", error);
      alert("メッセージの送信に失敗しました。");
    } finally {
      setIsUploading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-xl border border-gray-200 shadow-sm">
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
                {msg.attachments && msg.attachments.length > 0 && (
                  <div className="mb-2 space-y-1">
                    {msg.attachments.map((att, idx) => (
                      <a
                        key={idx}
                        href={att.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`flex items-center gap-2 p-2 rounded-md ${
                          isMyMessage ? "bg-primary-hover" : "bg-white"
                        }`}
                      >
                        <FileIcon size={20} />
                        <span className="underline truncate max-w-[200px]">
                          {att.name || "添付ファイル"}
                        </span>
                      </a>
                    ))}
                  </div>
                )}
                {/* Backward compatibility for single attachment */}
                {/* @ts-ignore */}
                {msg.attachmentUrl && !msg.attachments && (
                  <div className="mb-2">
                    <a
                      // @ts-ignore
                      href={msg.attachmentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`flex items-center gap-2 p-2 rounded-md ${
                        isMyMessage ? "bg-primary-hover" : "bg-white"
                      }`}
                    >
                      <FileIcon size={20} />
                      <span className="underline truncate max-w-[200px]">
                        {/* @ts-ignore */}
                        {msg.attachmentName || "添付ファイル"}
                      </span>
                    </a>
                  </div>
                )}
                <div className="max-h-40 overflow-y-auto">
                  <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                </div>
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
        {files.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-2">
            {files.map((file, index) => (
              <div key={index} className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded text-xs">
                <span className="truncate max-w-[150px]">{file.name}</span>
                <button
                  type="button"
                  onClick={() => removeFile(index)}
                  className="text-gray-500 hover:text-danger"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
        <form onSubmit={handleSendMessage} className="flex gap-2 items-end">
          <input
            type="file"
            multiple
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
            className="mb-0.5"
          >
            <Paperclip size={20} className="text-gray-500" />
          </Button>
          <textarea
            ref={textareaRef}
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="メッセージを入力..."
            className="flex-1 min-h-[40px] max-h-[200px] p-2 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm leading-relaxed"
            disabled={isUploading}
            rows={1}
            style={{ height: 'auto' }}
          />
          <Button type="submit" size="icon" disabled={isUploading || (!newMessage.trim() && files.length === 0)} className="mb-0.5">
            <Send size={20} />
          </Button>
        </form>
      </div>
    </div>
  );
}

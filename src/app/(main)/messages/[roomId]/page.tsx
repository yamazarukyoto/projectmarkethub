"use client";

import { useParams } from "next/navigation";
import { ChatBox } from "@/components/features/message/ChatBox";
import { Card } from "@/components/ui/Card";
import { useAuth } from "@/components/providers/AuthProvider";

export default function MessageRoomPage() {
  const params = useParams();
  const roomId = params.roomId as string;
  const { user } = useAuth();
  
  if (!user) return <div className="p-8 text-center">ログインしてください</div>;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar (Room List) - Optional for now */}
        <div className="hidden lg:block lg:col-span-1">
          <Card className="h-[600px] p-4">
            <h2 className="font-bold text-lg mb-4">メッセージ一覧</h2>
            <div className="space-y-2">
              {/* TODO: Map through rooms */}
              <div className="p-3 bg-gray-100 rounded-lg cursor-pointer">
                <p className="font-medium text-sm">株式会社サンプル</p>
                <p className="text-xs text-gray-500 truncate">ありがとうございます。よろしくお...</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Main Chat Area */}
        <div className="lg:col-span-3">
          <div className="mb-4">
            <h1 className="text-xl font-bold text-secondary">
              株式会社サンプル とのメッセージ
            </h1>
            <p className="text-sm text-gray-500">案件: Reactを使用したWebサイト制作</p>
          </div>
          
          <ChatBox roomId={roomId} currentUserId={user.uid} />
        </div>
      </div>
    </div>
  );
}

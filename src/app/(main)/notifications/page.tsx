"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import { getNotifications, markAsRead, markAllAsRead } from "@/lib/db";
import { Notification } from "@/types";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useRouter } from "next/navigation";
import { 
  Bell, 
  MessageSquare, 
  FileText, 
  CreditCard, 
  Info,
  CheckCheck
} from "lucide-react";
import { clsx } from "clsx";

export default function NotificationsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [limit, setLimit] = useState(20);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    const fetchNotifications = async () => {
      if (user) {
        try {
          const data = await getNotifications(user.uid, limit);
          setNotifications(data);
          if (data.length < limit) {
            setHasMore(false);
          }
        } catch (error) {
          console.error("Error fetching notifications:", error);
        } finally {
          setLoading(false);
        }
      }
    };
    fetchNotifications();
  }, [user, limit]);

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.read) {
      await markAsRead(notification.id);
      setNotifications(prev => prev.map(n => n.id === notification.id ? { ...n, read: true } : n));
    }
    if (notification.link) {
      router.push(notification.link);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!user) return;
    try {
      await markAllAsRead(user.uid);
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (error) {
      console.error("Error marking all as read:", error);
    }
  };

  const handleLoadMore = () => {
    setLimit(prev => prev + 20);
  };

  const getIcon = (type: Notification['type']) => {
    switch (type) {
      case 'message':
        return <MessageSquare className="w-5 h-5 text-blue-500" />;
      case 'contract':
        return <FileText className="w-5 h-5 text-green-500" />;
      case 'payment':
        return <CreditCard className="w-5 h-5 text-orange-500" />;
      case 'system':
      default:
        return <Info className="w-5 h-5 text-gray-500" />;
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp?.toDate) return "";
    const date = timestamp.toDate();
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return date.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
    } else if (days < 7) {
      return `${days}日前`;
    } else {
      return date.toLocaleDateString('ja-JP');
    }
  };

  if (loading && notifications.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8 flex justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-secondary flex items-center gap-2">
          <Bell className="w-6 h-6" />
          通知一覧
        </h1>
        {notifications.some(n => !n.read) && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleMarkAllAsRead}
            className="flex items-center gap-2"
          >
            <CheckCheck className="w-4 h-4" />
            すべて既読にする
          </Button>
        )}
      </div>

      <div className="space-y-4">
        {notifications.length === 0 ? (
          <Card className="p-8 text-center text-gray-500">
            通知はありません
          </Card>
        ) : (
          notifications.map((notification) => (
            <Card 
              key={notification.id}
              className={clsx(
                "transition-all duration-200 hover:shadow-md cursor-pointer border-l-4",
                notification.read ? "border-l-transparent bg-white" : "border-l-primary bg-blue-50/30"
              )}
              onClick={() => handleNotificationClick(notification)}
            >
              <div className="p-4 flex items-start gap-4">
                <div className="mt-1 flex-shrink-0">
                  {getIcon(notification.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className={clsx(
                      "font-medium text-base mb-1",
                      notification.read ? "text-gray-900" : "text-primary"
                    )}>
                      {notification.title}
                    </h3>
                    <span className="text-xs text-gray-400 whitespace-nowrap flex-shrink-0">
                      {formatDate(notification.createdAt)}
                    </span>
                  </div>
                  <p className="text-gray-600 text-sm leading-relaxed line-clamp-2">
                    {notification.body}
                  </p>
                </div>
                {!notification.read && (
                  <div className="mt-2 w-2 h-2 bg-primary rounded-full flex-shrink-0"></div>
                )}
              </div>
            </Card>
          ))
        )}
      </div>

      {hasMore && notifications.length > 0 && (
        <div className="mt-8 text-center">
          <Button 
            variant="ghost" 
            onClick={handleLoadMore}
            disabled={loading}
          >
            {loading ? "読み込み中..." : "もっと見る"}
          </Button>
        </div>
      )}
    </div>
  );
}

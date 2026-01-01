"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/components/providers/AuthProvider";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot, orderBy, limit, getDocs, doc, getDoc } from "firebase/firestore";
import { MessageSquare, ArrowLeft, User as UserIcon, Clock, Briefcase } from "lucide-react";

interface RoomInfo {
    id: string;
    type: 'proposal' | 'contract' | 'dm';
    partnerName: string;
    partnerPhotoURL?: string;
    partnerId: string;
    lastMessage?: string;
    lastMessageAt?: Date;
    jobTitle?: string;
    unread?: boolean;
}

export default function MessagesListPage() {
    const router = useRouter();
    const { user } = useAuth();
    const [rooms, setRooms] = useState<RoomInfo[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) {
            setLoading(false);
            return;
        }

        const fetchRooms = async () => {
            try {
                // roomsコレクションから自分が参加しているルームを取得
                const roomsRef = collection(db, "rooms");
                
                // Firestoreのクエリ制限のため、全ルームを取得してフィルタリング
                const roomsSnapshot = await getDocs(roomsRef);
                
                const roomPromises = roomsSnapshot.docs
                    .filter(docSnap => {
                        const data = docSnap.data();
                        return data.participants && data.participants[user.uid] === true;
                    })
                    .map(async (docSnap) => {
                        const roomId = docSnap.id;
                        const roomData = docSnap.data();
                        
                        // 相手のユーザーIDを特定
                        const participantIds = Object.keys(roomData.participants || {});
                        const partnerId = participantIds.find(id => id !== user.uid) || '';
                        
                        let roomInfo: RoomInfo = {
                            id: roomId,
                            type: 'dm',
                            partnerName: '不明なユーザー',
                            partnerId: partnerId,
                            lastMessageAt: roomData.updatedAt?.toDate() || new Date(0),
                        };
                        
                        // ルームタイプを判定
                        if (roomId.startsWith('dm_')) {
                            // 直接メッセージ
                            roomInfo.type = 'dm';
                            
                            // 相手のユーザー情報を取得
                            if (partnerId) {
                                try {
                                    const userDoc = await getDoc(doc(db, "users", partnerId));
                                    if (userDoc.exists()) {
                                        const userData = userDoc.data();
                                        roomInfo.partnerName = userData.displayName || '不明なユーザー';
                                        roomInfo.partnerPhotoURL = userData.photoURL;
                                    }
                                } catch (e) {
                                    console.error("Error fetching user:", e);
                                }
                            }
                        } else {
                            // 提案または契約ベースのルーム
                            // まず提案を確認
                            try {
                                const proposalDoc = await getDoc(doc(db, "proposals", roomId));
                                if (proposalDoc.exists()) {
                                    const proposalData = proposalDoc.data();
                                    roomInfo.type = 'proposal';
                                    
                                    // 自分がクライアントかワーカーかを判定
                                    const isClient = proposalData.clientId === user.uid;
                                    roomInfo.partnerId = isClient ? proposalData.workerId : proposalData.clientId;
                                    roomInfo.partnerName = isClient ? proposalData.workerName : '発注者';
                                    
                                    // 案件情報を取得
                                    const jobDoc = await getDoc(doc(db, "jobs", proposalData.jobId));
                                    if (jobDoc.exists()) {
                                        roomInfo.jobTitle = jobDoc.data().title;
                                        if (!isClient) {
                                            roomInfo.partnerName = jobDoc.data().clientName || '発注者';
                                        }
                                    }
                                } else {
                                    // 契約を確認
                                    const contractDoc = await getDoc(doc(db, "contracts", roomId));
                                    if (contractDoc.exists()) {
                                        const contractData = contractDoc.data();
                                        roomInfo.type = 'contract';
                                        
                                        const isClient = contractData.clientId === user.uid;
                                        roomInfo.partnerId = isClient ? contractData.workerId : contractData.clientId;
                                        roomInfo.jobTitle = contractData.jobTitle;
                                        
                                        // 相手のユーザー情報を取得
                                        const partnerDoc = await getDoc(doc(db, "users", roomInfo.partnerId));
                                        if (partnerDoc.exists()) {
                                            roomInfo.partnerName = partnerDoc.data().displayName || '不明なユーザー';
                                            roomInfo.partnerPhotoURL = partnerDoc.data().photoURL;
                                        }
                                    }
                                }
                            } catch (e) {
                                console.error("Error fetching room details:", e);
                            }
                        }
                        
                        // 最新メッセージを取得
                        try {
                            const messagesRef = collection(db, "rooms", roomId, "messages");
                            const messagesQuery = query(messagesRef, orderBy("createdAt", "desc"), limit(1));
                            const messagesSnapshot = await getDocs(messagesQuery);
                            
                            if (!messagesSnapshot.empty) {
                                const lastMsg = messagesSnapshot.docs[0].data();
                                roomInfo.lastMessage = lastMsg.text || (lastMsg.fileUrl ? '📎 ファイル' : '');
                                roomInfo.lastMessageAt = lastMsg.createdAt?.toDate() || roomInfo.lastMessageAt;
                            }
                        } catch (e) {
                            console.error("Error fetching messages:", e);
                        }
                        
                        return roomInfo;
                    });
                
                const roomInfos = await Promise.all(roomPromises);
                
                // 最新メッセージ順にソート
                roomInfos.sort((a, b) => {
                    const dateA = a.lastMessageAt || new Date(0);
                    const dateB = b.lastMessageAt || new Date(0);
                    return dateB.getTime() - dateA.getTime();
                });
                
                setRooms(roomInfos);
                setLoading(false);
            } catch (error) {
                console.error("Error fetching rooms:", error);
                setLoading(false);
            }
        };

        fetchRooms();
    }, [user]);

    const formatDate = (date?: Date) => {
        if (!date) return '';
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        
        if (days === 0) {
            return date.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
        } else if (days === 1) {
            return '昨日';
        } else if (days < 7) {
            return `${days}日前`;
        } else {
            return date.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' });
        }
    };

    const getRoomTypeLabel = (type: string) => {
        switch (type) {
            case 'dm': return '直接メッセージ';
            case 'proposal': return '提案';
            case 'contract': return '契約';
            default: return '';
        }
    };

    const getRoomTypeColor = (type: string) => {
        switch (type) {
            case 'dm': return 'bg-blue-100 text-blue-700';
            case 'proposal': return 'bg-yellow-100 text-yellow-700';
            case 'contract': return 'bg-green-100 text-green-700';
            default: return 'bg-gray-100 text-gray-700';
        }
    };

    if (loading) {
        return (
            <div className="container mx-auto px-4 py-8">
                <div className="flex items-center justify-center h-64">
                    <div className="text-gray-500">読み込み中...</div>
                </div>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="container mx-auto px-4 py-8">
                <div className="text-center py-16">
                    <MessageSquare size={48} className="mx-auto text-gray-300 mb-4" />
                    <h2 className="text-xl font-bold text-gray-700 mb-2">ログインが必要です</h2>
                    <p className="text-gray-500 mb-4">メッセージを確認するにはログインしてください。</p>
                    <Link href="/login">
                        <Button>ログイン</Button>
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="max-w-3xl mx-auto">
                <div className="flex items-center gap-4 mb-6">
                    <Button variant="ghost" onClick={() => router.back()}>
                        <ArrowLeft size={20} />
                    </Button>
                    <h1 className="text-2xl font-bold text-secondary flex items-center gap-2">
                        <MessageSquare size={24} className="text-primary" />
                        メッセージ一覧
                    </h1>
                </div>

                {rooms.length === 0 ? (
                    <Card>
                        <CardContent className="py-16 text-center">
                            <MessageSquare size={48} className="mx-auto text-gray-300 mb-4" />
                            <h2 className="text-lg font-bold text-gray-700 mb-2">メッセージはありません</h2>
                            <p className="text-gray-500 text-sm">
                                案件への提案や、ユーザープロフィールからメッセージを送信できます。
                            </p>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="space-y-2">
                        {rooms.map((room) => (
                            <Link key={room.id} href={`/messages/${room.id}`}>
                                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                                    <CardContent className="py-4">
                                        <div className="flex items-start gap-4">
                                            {/* Avatar */}
                                            <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                                                {room.partnerPhotoURL ? (
                                                    <img 
                                                        src={room.partnerPhotoURL} 
                                                        alt={room.partnerName} 
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    <UserIcon size={24} className="text-gray-400" />
                                                )}
                                            </div>
                                            
                                            {/* Content */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between gap-2 mb-1">
                                                    <div className="flex items-center gap-2 min-w-0">
                                                        <span className="font-bold text-gray-900 truncate">
                                                            {room.partnerName}
                                                        </span>
                                                        <span className={`text-xs px-2 py-0.5 rounded-full ${getRoomTypeColor(room.type)}`}>
                                                            {getRoomTypeLabel(room.type)}
                                                        </span>
                                                    </div>
                                                    <span className="text-xs text-gray-400 flex-shrink-0">
                                                        {formatDate(room.lastMessageAt)}
                                                    </span>
                                                </div>
                                                
                                                {room.jobTitle && (
                                                    <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                                                        <Briefcase size={12} />
                                                        <span className="truncate">{room.jobTitle}</span>
                                                    </div>
                                                )}
                                                
                                                {room.lastMessage && (
                                                    <p className="text-sm text-gray-600 truncate">
                                                        {room.lastMessage}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

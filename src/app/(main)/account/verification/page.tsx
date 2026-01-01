"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";

export default function VerificationPage() {
    return (
        <div className="container mx-auto px-4 py-8">
            <Card>
                <CardHeader>
                    <CardTitle>本人確認</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-gray-600">
                        本人確認機能は現在準備中です。
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}

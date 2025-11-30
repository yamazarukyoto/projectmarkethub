"use client";

import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

type Mode = "client" | "worker";

interface ModeContextType {
    mode: Mode;
    toggleMode: () => void;
    setMode: (mode: Mode) => void;
}

const ModeContext = createContext<ModeContextType | undefined>(undefined);

export const ModeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [mode, setModeState] = useState<Mode>("worker");
    const pathname = usePathname();
    const isInitialized = useRef(false);

    // 初期化時にlocalStorageからモードを読み込む
    useEffect(() => {
        if (!isInitialized.current) {
            const savedMode = localStorage.getItem("mode") as Mode;
            if (savedMode) {
                setModeState(savedMode);
            }
            isInitialized.current = true;
        }
    }, []);

    // URLに基づいてモードを自動設定（初期化後のみ）
    useEffect(() => {
        if (!isInitialized.current) return;
        
        if (pathname?.startsWith("/client")) {
            setModeState("client");
            localStorage.setItem("mode", "client");
        } else if (pathname?.startsWith("/worker")) {
            setModeState("worker");
            localStorage.setItem("mode", "worker");
        }
        // その他のページでは現在のモードを維持
    }, [pathname]);

    const setMode = (newMode: Mode) => {
        setModeState(newMode);
        localStorage.setItem("mode", newMode);
    };

    const toggleMode = () => {
        const newMode = mode === "client" ? "worker" : "client";
        setMode(newMode);
    };

    return (
        <ModeContext.Provider value={{ mode, toggleMode, setMode }}>
            {children}
        </ModeContext.Provider>
    );
};

export const useMode = () => {
    const context = useContext(ModeContext);
    if (context === undefined) {
        throw new Error("useMode must be used within a ModeProvider");
    }
    return context;
};

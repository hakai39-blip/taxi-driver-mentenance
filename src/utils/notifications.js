// ブラウザ通知の制御ユーティリティ
export const getNotificationPermission = () => {
    if (!("Notification" in window)) return "unsupported";
    return Notification.permission;
};

export const requestNotificationPermission = async () => {
    if (!("Notification" in window)) {
        console.warn("[通知] このブラウザは通知機能をサポートしていません。");
        return false;
    }
    if (Notification.permission === "granted") return true;
    if (Notification.permission === "denied") {
        console.warn("[通知] 通知がブロックされています。ブラウザの設定から許可してください。");
        return false;
    }
    // "default" → ダイアログを表示
    const permission = await Notification.requestPermission();
    console.log("[通知] パーミッション結果:", permission);
    return permission === "granted";
};

export const showNotification = (title, options = {}) => {
    if (!("Notification" in window)) {
        console.warn("[通知] Notification API非対応");
        return null;
    }
    if (Notification.permission !== "granted") {
        console.warn("[通知] パーミッション未取得:", Notification.permission, "→ 通知をスキップ");
        return null;
    }
    try {
        console.log("[通知] 送信:", title);
        const n = new Notification(title, {
            icon: '/favicon.ico',
            silent: false,
            ...options
        });
        n.onclick = () => { window.focus(); n.close(); };
        return n;
    } catch (err) {
        console.error("[通知] エラー:", err);
        return null;
    }
};

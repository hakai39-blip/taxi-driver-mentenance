// サービスワーカー: 通知をバックグラウンドでも受け取れるようにする
self.addEventListener('push', (event) => {
    const data = event.data ? event.data.json() : {};
    const title = data.title || "タクシー点呼アプリ";
    const options = {
        body: data.body || "新しい通知があります",
        icon: '/favicon.ico',
        badge: '/favicon.ico',
    };

    event.waitUntil(
        self.registration.showNotification(title, options)
    );
});

// 通知クリック時の動作
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            if (clientList.length > 0) {
                let client = clientList[0];
                for (let i = 0; i < clientList.length; i++) {
                    if (clientList[i].focused) {
                        client = clientList[i];
                    }
                }
                return client.focus();
            }
            return clients.openWindow('/');
        })
    );
});

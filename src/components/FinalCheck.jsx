import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, Clock } from 'lucide-react';
import { getStatus, updateStatus } from '../utils/db';
import { requestNotificationPermission, showNotification } from '../utils/notifications';

// アプリ起動用のURLスキーム（カスタムプロトコル）
const SCHEMES = {
    'LINE': 'line://',
    'Discord': 'discord://',
    'Instagram': 'instagram://',
    'メッセージ+': 'messages://'
};

// アプリが開かなかった場合のWebフォールバック
const WEB_URLS = {
    'LINE': 'https://line.me/R/',
    'Discord': 'https://discord.com/channels/@me',
    'Instagram': 'https://www.instagram.com/',
    'メッセージ+': null
};

const FinalCheck = () => {
    const navigate = useNavigate();
    const [isFullyApproved, setIsFullyApproved] = useState(false);
    // pendingAppLaunchはuseEffectではなくstateで持ち、ボタンタップで開く
    const [pendingPlatform] = useState(() => {
        const p = sessionStorage.getItem('pendingAppLaunch');
        if (p) sessionStorage.removeItem('pendingAppLaunch');
        return p;
    });
    const user = JSON.parse(sessionStorage.getItem('currentUser') || '{}');
    const prevApprovedRef = useRef(false);


    useEffect(() => {
        requestNotificationPermission();

        const checkSync = async () => {
            const status = await getStatus();
            const userStatus = status[user.id];

            if (userStatus && userStatus.managerApproved) {
                setIsFullyApproved(true);
                if (!prevApprovedRef.current) {
                    showNotification("点呼が承認されました", {
                        body: "管理者が承認を行いました。今日も安全運転でお願いします！"
                    });
                }
                prevApprovedRef.current = true;
            } else {
                setIsFullyApproved(false);
                prevApprovedRef.current = false;
            }
        };

        checkSync();
        const interval = setInterval(checkSync, 3000);
        return () => clearInterval(interval);
    }, [user.id]);

    const handleLogout = () => {
        updateStatus(user.id, {
            waitingForManager: false,
            requestedMeeting: false,
            driverConfirmed: false,
            managerApproved: false
        });
        sessionStorage.removeItem('currentUser');
        sessionStorage.removeItem('currentSurvey');
        navigate('/');
    };

    const handleLogoutWithConfirm = () => {
        if (!isFullyApproved) {
            if (!window.confirm("点呼が完了していません。ログアウトしますか？")) return;
        }
        handleLogout();
    };

    return (
        <div className="final-page">
            <header className="header">
                <h1>点呼ステータス</h1>
            </header>
            <main className="card" style={{ textAlign: 'center', padding: '40px 20px' }}>
                {/* アプリ起動ボタン（タップ操作が必要なためuseEffectではなくここで表示） */}
                {pendingPlatform && !isFullyApproved && (
                    <div style={{ marginBottom: '24px', padding: '16px', background: '#f0f4ff', borderRadius: '12px', border: '1px solid #4a90e2' }}>
                        <p style={{ fontSize: '14px', color: '#333', marginBottom: '12px' }}>
                            管理者が点呼を開始しました。<br />下のボタンをタップして打ち合わせを始めてください。
                        </p>
                        {/* <a>タグで直接URLスキームを開く。buttonのonClickより確実にアプリが起動する */}
                        <a
                            href={SCHEMES[pendingPlatform]}
                            className="btn btn-primary"
                            style={{ fontSize: '16px', padding: '12px 24px', display: 'inline-block', textDecoration: 'none' }}
                        >
                            🚀 {pendingPlatform} を開く
                        </a>
                        {WEB_URLS[pendingPlatform] && (
                            <p style={{ fontSize: '12px', marginTop: '10px', color: '#666' }}>
                                アプリが開かない場合は
                                <a href={WEB_URLS[pendingPlatform]} target="_blank" rel="noopener noreferrer">
                                    こちら（Web版）
                                </a>
                            </p>
                        )}
                    </div>
                )}

                {isFullyApproved ? (
                    <>
                        <CheckCircle size={80} color="var(--success-color)" style={{ marginBottom: '24px' }} />
                        <h2 style={{ marginBottom: '16px' }}>点呼完了</h2>
                        <p style={{ color: '#666', marginBottom: '32px' }}>
                            管理者による承認が完了しました。<br />
                            今日も一日、安全運転でお願いします。
                        </p>
                    </>
                ) : (
                    <>
                        <div className="pulse-animation">
                            <Clock size={80} color="var(--warning-color)" style={{ marginBottom: '24px' }} />
                        </div>
                        <h2 style={{ marginBottom: '16px' }}>管理者の承認待ち</h2>
                        <p style={{ color: '#666', marginBottom: '32px' }}>
                            打ち合わせが終了したら、管理者が「承認」ボタンを押すまでこの画面でお待ちください。
                        </p>
                    </>
                )}

                <button className="btn btn-outline" onClick={handleLogoutWithConfirm}>
                    ログアウト
                </button>
            </main>
        </div>
    );
};

export default FinalCheck;

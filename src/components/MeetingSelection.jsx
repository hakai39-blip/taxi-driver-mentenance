import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCircle } from 'lucide-react';
import { addCheck, updateStatus, getStatus } from '../utils/db';

const MeetingSelection = () => {
    const navigate = useNavigate();
    const [sending, setSending] = useState(false);
    const [sent, setSent] = useState(false);
    const [managerResponse, setManagerResponse] = useState(null);

    const user = JSON.parse(sessionStorage.getItem('currentUser') || '{}');
    const survey = JSON.parse(sessionStorage.getItem('currentSurvey') || '{}');

    // 管理者のレスポンスを監視
    useEffect(() => {
        if (!sent) return;

        const interval = setInterval(async () => {
            const status = await getStatus();
            const s = status[user.id];
            if (!s) return;
            // LINE/Discord経由: requestedMeetingが立ったらアプリ起動ボタンを表示
            if (s.requestedMeeting) {
                setManagerResponse(s);
            }
            // 直接承認: requestedMeetingを介さずmanagerApprovedが立ったらfinalへ遷移
            if (s.managerApproved) {
                clearInterval(interval);
                navigate('/final');
            }
        }, 2000);
        return () => clearInterval(interval);
    }, [sent, user.id]);

    const handleSend = async () => {
        setSending(true);

        const video = JSON.parse(sessionStorage.getItem('currentVideo') || '{}');

        await addCheck({
            userId: user.id,
            survey: survey.answers,
            unhealthy: survey.unhealthy,
            video: video
        });

        await updateStatus(user.id, {
            waitingForManager: true,
            requestedMeeting: false,
            driverConfirmed: false,
            managerApproved: false
        });

        setSending(false);
        setSent(true);
    };

    const startMeeting = async (platform) => {
        await updateStatus(user.id, { driverConfirmed: true });
        // 起動するアプリをFinalCheck側に渡してから画面遷移
        sessionStorage.setItem('pendingAppLaunch', platform);
        navigate('/final');
    };

    const getConditionInfo = () => {
        const issues = survey.answers ? survey.answers.filter(a => a === '問題あり').length : 0;
        const normals = survey.answers ? survey.answers.filter(a => a === '普通').length : 0;

        if (issues > 0) return { label: '警告', color: 'var(--error-color)', advice: '複数の懸念事項があります。管理者と十分に相談してください。' };
        if (normals > 2) return { label: '注意', color: 'var(--warning-color)', advice: '少しお疲れのようです。休憩を多めに取りましょう。' };
        return { label: '良好', color: 'var(--success-color)', advice: '絶好調です！安全運転で行ってらっしゃい！' };
    };

    const condition = getConditionInfo();

    return (
        <div className="meeting-page">
            <header className="header">
                <h1>管理者との打ち合わせ</h1>
            </header>
            <main className="card">
                <div className="condition-summary" style={{
                    textAlign: 'center',
                    marginBottom: '24px',
                    padding: '16px',
                    borderRadius: '12px',
                    background: `${condition.color}15`,
                    border: `1px solid ${condition.color}`
                }}>
                    <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>AIコンディション診断</div>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: condition.color }}>{condition.label}</div>
                    <div style={{ fontSize: '13px', marginTop: '8px', color: '#333' }}>{condition.advice}</div>
                </div>

                {!sent ? (
                    <>
                        <h3>1. データの送信</h3>
                        <p style={{ fontSize: '14px', color: '#666', marginBottom: '16px' }}>
                            これまでのアンケートと動画データを管理者に送信します。
                        </p>
                        <button
                            className="btn btn-primary"
                            onClick={handleSend}
                            disabled={sending}
                        >
                            {sending ? '送信中...' : 'データを送信する'}
                        </button>
                    </>
                ) : (
                    <div style={{ textAlign: 'center', padding: '20px 0' }}>
                        {!managerResponse ? (
                            <>
                                <div className="pulse-animation">
                                    <CheckCircle size={64} color="var(--success-color)" />
                                </div>
                                <h3 style={{ marginTop: '24px' }}>送信が完了しました！</h3>
                                <p style={{ fontSize: '14px', color: '#666', marginTop: '8px' }}>
                                    管理者の承認を待っています。このままお待ちください...
                                </p>
                            </>
                        ) : (
                            <>
                                <div className="pulse-animation">
                                    <Bell size={64} color="var(--success-color)" />
                                </div>
                                <h3 style={{ marginTop: '24px' }}>管理者が点呼を開始しました</h3>
                                <p style={{ fontSize: '14px', color: '#666', marginTop: '8px' }}>
                                    以下のアプリを起動して打ち合わせを行ってください。
                                </p>
                                <div style={{ marginTop: '32px' }}>
                                    <button className="btn btn-primary" onClick={() => startMeeting(managerResponse.platform)}>
                                        🚀 {managerResponse.platform}を起動
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
};

export default MeetingSelection;

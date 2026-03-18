import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUsers, getChecks, getStatus, updateStatus, deleteUser } from '../utils/db';
import { User, ClipboardList, Bell, Trash2 } from 'lucide-react';
import { requestNotificationPermission, showNotification } from '../utils/notifications';

const ManagerDashboard = () => {
    const navigate = useNavigate();
    const [drivers, setDrivers] = useState([]);
    const [selectedDriver, setSelectedDriver] = useState(null);
    const [driverChecks, setDriverChecks] = useState([]);
    const [syncStatus, setSyncStatus] = useState({});
    const manager = JSON.parse(sessionStorage.getItem('currentUser') || '{}');
    const prevStatusRef = useRef({});

    useEffect(() => {
        if (manager.role !== 'manager') {
            navigate('/');
            return;
        }

        // ページ読み込み時に通知パーミッションを自動で要求
        requestNotificationPermission();

        const fetchData = async () => {
            const allUsers = await getUsers();
            // 管理者IDが一致する運転手のみを表示
            const filteredDrivers = allUsers.filter(u => u.role === 'driver' && u.managerId === manager.phone);
            setDrivers(filteredDrivers);

            const status = await getStatus();

            // 新規の申請を検知
            filteredDrivers.forEach(driver => {
                const current = status[driver.id] || {};
                const prev = prevStatusRef.current[driver.id] || {};

                if (current.waitingForManager && !prev.waitingForManager) {
                    showNotification("承認申請が届きました", {
                        body: `${driver.name}さんから業務前チェックの承認申請が届いています。`
                    });
                }
            });

            prevStatusRef.current = status;
            setSyncStatus(status);
        };

        fetchData();
        const interval = setInterval(fetchData, 2000);
        return () => clearInterval(interval);
    }, [manager.role, navigate]);

    const viewHistory = async (driver) => {
        setSelectedDriver(driver);
        const allChecks = await getChecks();
        setDriverChecks(allChecks.filter(c => c.userId === driver.id));
    };

    const handleAction = async (driverId, platform) => {
        const schemes = {
            'LINE': 'line://',
            'Discord': 'discord://',
            'Instagram': 'instagram://',
            'メッセージ+': 'messages://'
        };

        await updateStatus(driverId, {
            requestedMeeting: true,
            platform: platform,
            managerApproved: false,
            driverConfirmed: false // 念のため初期化
        });

        const url = schemes[platform];
        if (url) {
            window.location.assign(url);
        }
    };

    const approveCheck = async (driverId) => {
        await updateStatus(driverId, { managerApproved: true, waitingForManager: false });
        // ポーリングを待たずにローカルstateを即時更新して通知マークを消す
        setSyncStatus(prev => ({
            ...prev,
            [driverId]: { ...prev[driverId], managerApproved: true, waitingForManager: false }
        }));
        alert("点呼を承認しました。");
    };

    const handleDeleteDriver = async (driver) => {
        if (!window.confirm(`${driver.name} を削除しますか？\nこの操作は取り消せません。`)) return;
        try {
            const res = await deleteUser(driver.id);
            if (res.success) {
                alert("運転手アカウントを削除しました。");
                // 確実に画面を更新する
                setDrivers(prev => prev.filter(d => d.id !== driver.id));
            } else {
                alert(`削除に失敗しました: ${res.error || '不明なエラー'}`);
            }
        } catch (err) {
            console.error("Delete failed", err);
            alert("通信エラーにより削除できませんでした。");
        }
    };

    const maskPhone = (phone) => {
        if (!phone || phone.length < 7) return phone;
        return phone.slice(0, 3) + '****' + phone.slice(-4);
    };

    return (
        <div className="manager-dashboard">
            <header className="header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 16px' }}>
                <h1 style={{ fontSize: '18px' }}>管理者: {manager.name}</h1>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="btn btn-outline" style={{ width: 'auto', padding: '4px 12px', fontSize: '12px' }} onClick={() => navigate('/manager/settings')}>設定</button>
                    <button className="btn btn-outline" style={{ width: 'auto', padding: '4px 12px', fontSize: '12px' }} onClick={() => navigate('/')}>ログアウト</button>
                </div>
            </header>

            <main style={{ padding: '16px' }}>
                <h3>運転手一覧</h3>
                {drivers.map(driver => {
                    const status = syncStatus[driver.id] || {};
                    const hasNewData = status.waitingForManager;

                    return (
                        <div key={driver.id} className="card" style={{ marginBottom: '12px', borderColor: hasNewData ? 'var(--warning-color)' : '#ddd', borderWidth: hasNewData ? '2px' : '1px', borderStyle: 'solid' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div onClick={() => viewHistory(driver)} style={{ cursor: 'pointer', flex: 1 }}>
                                    <div style={{ fontWeight: 'bold' }}>
                                        {driver.name} {hasNewData && <Bell size={16} color="var(--warning-color)" style={{ display: 'inline', marginLeft: '4px' }} />}
                                    </div>
                                    <div style={{ fontSize: '12px', color: '#666' }}>電話: {maskPhone(driver.phone)} | 車両: {driver.carNumber}</div>
                                </div>

                                <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                    {hasNewData ? (
                                        <>
                                            <button className="btn btn-primary" style={{ padding: '6px', fontSize: '10px' }} onClick={() => handleAction(driver.id, 'LINE')}>LINE</button>
                                            <button className="btn btn-primary" style={{ padding: '6px', fontSize: '10px' }} onClick={() => handleAction(driver.id, 'Discord')}>Discord</button>
                                            <button className="btn btn-success" style={{ padding: '6px', fontSize: '10px', backgroundColor: 'var(--success-color)' }} onClick={() => approveCheck(driver.id)}>承認</button>
                                        </>
                                    ) : (
                                        <button className="btn btn-outline" style={{ width: 'auto', padding: '6px 12px', fontSize: '12px' }} onClick={() => viewHistory(driver)}>履歴</button>
                                    )}
                                    <button
                                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: '#ccc' }}
                                        onClick={() => handleDeleteDriver(driver)}
                                        title="削除"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })}

                {selectedDriver && (
                    <div className="history-modal card" style={{ marginTop: '24px', background: '#f9f9f9', position: 'fixed', top: '10px', bottom: '10px', left: '10px', right: '10px', zIndex: 1000, overflowY: 'auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', position: 'sticky', top: 0, background: '#f9f9f9', paddingBottom: '10px', borderBottom: '1px solid #ddd' }}>
                            <h3 style={{ margin: 0 }}>{selectedDriver.name} のチェック詳細</h3>
                            <button onClick={() => setSelectedDriver(null)} style={{ border: 'none', background: 'none', fontSize: '24px' }}>×</button>
                        </div>

                        {driverChecks.length === 0 ? (
                            <p>記録がありません</p>
                        ) : (
                            <div>
                                {driverChecks.slice().reverse().map((check, i) => (
                                    <div key={i} className="card" style={{ marginBottom: '16px', padding: '12px', fontSize: '13px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                            <div style={{ fontWeight: 'bold' }}>{new Date(check.timestamp).toLocaleString()}</div>
                                            <div style={{ color: check.unhealthy ? 'var(--error-color)' : 'var(--success-color)', fontWeight: 'bold' }}>
                                                {check.unhealthy ? '⚠️ 警告/要注意' : '✅ 良好'}
                                            </div>
                                        </div>

                                        <div style={{ background: '#eee', padding: '8px', borderRadius: '4px', marginBottom: '8px' }}>
                                            <strong>動画チェック:</strong>
                                            {check.video && check.video.url ? (
                                                <div style={{ marginTop: '8px' }}>
                                                    <video src={check.video.url} controls style={{ width: '100%', maxHeight: '200px', borderRadius: '4px' }} />
                                                </div>
                                            ) : (
                                                <span style={{ marginLeft: '8px', color: '#666' }}>動画なし</span>
                                            )}
                                        </div>

                                        <div style={{ fontSize: '12px' }}>
                                            <strong>アンケート詳細:</strong>
                                            <div style={{ marginTop: '4px', maxHeight: '150px', overflowY: 'auto', border: '1px solid #ddd', padding: '4px' }}>
                                                {check.survey ? check.survey.map((ans, idx) => (
                                                    <div key={idx} style={{ padding: '2px 0', borderBottom: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between' }}>
                                                        <span style={{ color: '#666', fontSize: '11px' }}>問{idx + 1}</span>
                                                        <span style={{ color: ans === '問題あり' ? 'red' : 'inherit' }}>{ans}</span>
                                                    </div>
                                                )) : '詳細なし'}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
};

export default ManagerDashboard;

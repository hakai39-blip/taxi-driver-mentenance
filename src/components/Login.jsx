import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUsers, normalizePhone, normalizeName, isValidPhone } from '../utils/db';

const Login = () => {
    const navigate = useNavigate();
    const [isManager, setIsManager] = useState(false);
    const [formData, setFormData] = useState({
        phone: '',
        name: '',
        password: ''
    });

    const handleSubmit = async (e) => {
        e.preventDefault();

        // 運転手ログインの場合のみ電話番号バリデーション（管理者は'admin'等のIDがあるため）
        if (!isManager && !isValidPhone(formData.phone)) {
            alert("有効な電話番号を入力してください（10桁または11桁の数字）。");
            return;
        }

        const users = await getUsers();

        const inputPhone = normalizePhone(formData.phone);
        const inputName = normalizeName(formData.name);

        if (isManager) {
            const manager = users.find(u => u.role === 'manager' && normalizePhone(u.phone) === inputPhone && u.password === formData.password);
            if (manager) {
                sessionStorage.setItem('currentUser', JSON.stringify(manager));
                navigate('/manager');
            } else {
                alert("IDまたはパスワードが正しくありません");
            }
        } else {
            const driver = users.find(u => u.role === 'driver' && normalizePhone(u.phone) === inputPhone && normalizeName(u.name) === inputName);
            if (driver) {
                sessionStorage.setItem('currentUser', JSON.stringify(driver));
                navigate('/home');
            } else {
                alert("登録情報（電話番号・氏名）が一致しません");
            }
        }
    };

    return (
        <div className="login-page">
            <header className="header">
                <h1>タクシー業務チェック</h1>
            </header>
            <main className="card">
                <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
                    <button
                        className={`btn ${!isManager ? 'btn-primary' : 'btn-outline'}`}
                        onClick={() => setIsManager(false)}
                        style={{ flex: 1, padding: '10px', fontSize: '14px' }}
                    >
                        運転手
                    </button>
                    <button
                        className={`btn ${isManager ? 'btn-primary' : 'btn-outline'}`}
                        onClick={() => setIsManager(true)}
                        style={{ flex: 1, padding: '10px', fontSize: '14px' }}
                    >
                        運行管理者
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div style={{ marginBottom: '16px' }}>
                        <label>{isManager ? '管理者ID' : '電話番号'}</label>
                        <input
                            type="text"
                            placeholder={isManager ? "admin" : "090xxxxxxxx"}
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            required
                        />
                    </div>
                    {!isManager ? (
                        <div style={{ marginBottom: '16px' }}>
                            <label>氏名</label>
                            <input
                                type="text"
                                placeholder="山田太郎"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                required
                            />
                        </div>
                    ) : (
                        <div style={{ marginBottom: '16px' }}>
                            <label>パスワード</label>
                            <input
                                type="password"
                                placeholder="••••••••"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                required
                            />
                        </div>
                    )}
                    <button type="submit" className="btn btn-primary">{isManager ? '管理画面へ' : '業務チェックを開始'}</button>
                    <p style={{ textAlign: 'center', marginTop: '16px', fontSize: '14px' }}>
                        アカウントをお持ちでない方は<br />
                        <span style={{ color: 'var(--primary-color)', cursor: 'pointer' }} onClick={() => navigate('/register')}>こちらから新規登録</span>
                    </p>
                </form>
            </main>
        </div>
    );
};

export default Login;

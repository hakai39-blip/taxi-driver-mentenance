import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { RefreshCw } from 'lucide-react';

const VideoCheck = () => {
    const navigate = useNavigate();
    const [recording, setRecording] = useState(false);
    const [timeLeft, setTimeLeft] = useState(30);
    const [videoUrl, setVideoUrl] = useState(null);
    const [uploading, setUploading] = useState(false);
    const videoRef = useRef(null);
    const streamRef = useRef(null);
    const chunksRef = useRef([]);
    const mediaRecorderRef = useRef(null);
    const timerRef = useRef(null); // タイマーをRefで管理（Reactの再レンダーに依存しない）
    const user = JSON.parse(sessionStorage.getItem('currentUser') || '{}');

    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            if (videoRef.current) videoRef.current.srcObject = stream;
            streamRef.current = stream;
        } catch (err) {
            console.error("Camera access denied", err);
            alert("カメラへのアクセスを許可してください");
        }
    };

    const stopCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        if (videoRef.current) videoRef.current.srcObject = null;
    };

    useEffect(() => {
        startCamera();
        return () => {
            // アンマウント時にタイマーとカメラを確実に停止
            if (timerRef.current) clearInterval(timerRef.current);
            stopCamera();
        };
    }, []);

    const stopRecording = () => {
        // タイマーを先に止める
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }

        // カメラ停止とREC表示消去は条件に関わらず必ず実行
        stopCamera();
        setRecording(false);

        const recorder = mediaRecorderRef.current;
        if (recorder && recorder.state !== 'inactive') {
            // 録画中 → stop()でonstopが発火してsetVideoUrlが呼ばれる
            recorder.stop();
        } else if (chunksRef.current.length > 0) {
            // 録画器がすでに停止済みでもデータがあれば即座にvideoUrlを設定
            const blob = new Blob(chunksRef.current, { type: 'video/mp4' });
            setVideoUrl(URL.createObjectURL(blob));
        }
    };

    const startRecording = () => {
        if (!streamRef.current) {
            alert("カメラが準備できていません");
            return;
        }
        chunksRef.current = [];

        const types = ['video/webm;codecs=vp8', 'video/webm', 'video/mp4'];
        let options = { videoBitsPerSecond: 500000 };
        for (const type of types) {
            if (MediaRecorder.isTypeSupported(type)) { options.mimeType = type; break; }
        }

        try {
            const recorder = new MediaRecorder(streamRef.current, options);
            recorder.ondataavailable = (e) => {
                if (e.data.size > 0) chunksRef.current.push(e.data);
            };
            recorder.onstop = () => {
                // 録画データをblobにまとめて表示切替
                const blob = new Blob(chunksRef.current, { type: 'video/mp4' });
                setVideoUrl(URL.createObjectURL(blob));
            };
            recorder.start();
            mediaRecorderRef.current = recorder;
            setRecording(true);

            // タイマーをReactの外（setInterval + Ref）で管理
            let count = 30;
            setTimeLeft(count);
            timerRef.current = setInterval(() => {
                count -= 1;
                setTimeLeft(count);
                if (count <= 0) stopRecording();
            }, 1000);

        } catch (err) {
            console.error("MediaRecorder error", err);
            alert("録画の開始に失敗しました。このブラウザーが対応していない可能性があります。");
        }
    };

    const handleNext = async () => {
        if (!videoUrl) return;
        setUploading(true);
        try {
            const blob = await fetch(videoUrl).then(r => r.blob());
            const reader = new FileReader();
            reader.readAsDataURL(blob);
            reader.onloadend = async () => {
                const base64data = reader.result;
                const response = await fetch('/api/upload-video', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId: user.id, videoData: base64data })
                });
                const result = await response.json();
                sessionStorage.setItem('currentVideo', JSON.stringify({
                    completed: true,
                    url: result.videoUrl,
                    timestamp: new Date().toISOString()
                }));
                navigate('/meeting');
            };
        } catch (err) {
            console.error("Upload failed", err);
            alert("動画の送信に失敗しました。");
            setUploading(false);
        }
    };

    return (
        <div className="video-page">
            <header className="header">
                <h1>アルコール検知動画撮影</h1>
            </header>
            <main className="card">
                <p style={{ fontSize: '14px', color: '#666', marginBottom: '16px' }}>
                    検知器を使用している様子を30秒間録画してください。
                </p>

                <div style={{
                    width: '100%', aspectRatio: '3/4', background: '#000', borderRadius: '8px',
                    overflow: 'hidden', position: 'relative', marginBottom: '16px'
                }}>
                    {!videoUrl ? (
                        <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }} />
                    ) : (
                        <video src={videoUrl} controls style={{ width: '100%', height: '100%' }} />
                    )}
                    {recording && !videoUrl && (
                        <div style={{
                            position: 'absolute', top: '16px', right: '16px', background: 'rgba(255,0,0,0.8)',
                            color: 'white', padding: '4px 12px', borderRadius: '20px', fontWeight: 'bold',
                            display: 'flex', alignItems: 'center', gap: '4px'
                        }}>
                            <div style={{ width: '8px', height: '8px', background: 'white', borderRadius: '50%' }}></div>
                            REC 00:{timeLeft < 10 ? `0${timeLeft}` : timeLeft}
                        </div>
                    )}
                </div>

                {!videoUrl ? (
                    <button
                        className={`btn ${recording ? 'btn-outline' : 'btn-primary'}`}
                        onClick={recording ? stopRecording : startRecording}
                        style={{ height: '50px', fontSize: '18px' }}
                    >
                        {recording ? '録画を停止' : '録画を開始'}
                    </button>
                ) : (
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button className="btn btn-outline" onClick={() => { setVideoUrl(null); startCamera(); }}>
                            <RefreshCw size={20} style={{ marginRight: '8px' }} /> 再撮影
                        </button>
                        <button className="btn btn-primary" onClick={handleNext} disabled={uploading}>
                            {uploading ? '送信中...' : '次へ進む'}
                        </button>
                    </div>
                )}
            </main>
        </div>
    );
};

export default VideoCheck;

/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"
import React, { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

const SimpleContainer = ({ children }: { children: any }) => (
    <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        textAlign: 'center',
        padding: '1rem',
        fontFamily: 'sans-serif',
        backgroundColor: '#f8f9fa'
    }}>
        {children}
    </div>
);

const SimpleButton = ({ children, onClick }: { children: any, onClick: any }) => (
    <button onClick={onClick} style={{
        padding: '0.75rem 1.5rem',
        fontSize: '1rem',
        color: '#fff',
        backgroundColor: '#007bff',
        border: 'none',
        borderRadius: '0.5rem',
        cursor: 'pointer',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
    }}>
        {children}
    </button>
);


export default function ServerOffline() {
    const params = useSearchParams();
    const router = useRouter();

    const getSafeNextLink = () => {
        const next = params.get("next");
        if (next && next.startsWith('/')) {
            return next;
        }
        return '/';
    };

    const nextLink = getSafeNextLink();

    const backoffDelays = [5, 10, 15, 25];

    const [retryCount, setRetryCount] = useState(0);
    const [countdown, setCountdown] = useState(backoffDelays[0]);
    const [maxRetriesReached, setMaxRetriesReached] = useState(false);

    useEffect(() => {
        let attempt = 0;
        try {
            attempt = parseInt(sessionStorage.getItem('serverRetryCount') || '0', 10);
        } catch (error) {
            console.error("Could not access sessionStorage. Defaulting to 0 attempts.", error);
        }

        if (attempt >= backoffDelays.length) {
            setMaxRetriesReached(true);
        } else {
            setRetryCount(attempt);
            setCountdown(backoffDelays[attempt]);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (maxRetriesReached) {
            return;
        }

        if (countdown <= 0) {
            try {
                sessionStorage.setItem('serverRetryCount', (retryCount + 1).toString());
            } catch (error) {
                console.error("Could not write to sessionStorage.", error);
            }
            router.push(nextLink);
            return;
        }

        const timerId = setInterval(() => {
            setCountdown(prev => prev - 1);
        }, 1000);

        return () => clearInterval(timerId);

    }, [countdown, maxRetriesReached, retryCount, nextLink, router]);

    const handleManualRefresh = () => {
        try {
            sessionStorage.setItem('serverRetryCount', '0');
        } catch (error) {
            console.error("Could not write to sessionStorage.", error);
        }
        router.push(nextLink);
    };

    return (
        <SimpleContainer>
            <div style={{ maxWidth: '600px' }}>
                <h1 style={{ fontSize: '6rem', fontWeight: 'bold', margin: 0 }}>503</h1>
                <p style={{ fontSize: '1.5rem', fontWeight: '500' }}>Server Offline!</p>

                {maxRetriesReached ? (
                    <div style={{ padding: '1rem', backgroundColor: '#fff3cd', borderRadius: '0.5rem', margin: '1rem 0' }}>
                        <p style={{ color: '#856404', margin: 0 }}>
                            <strong>Gagal terhubung ke server setelah beberapa kali percobaan.</strong>
                            <br />
                            Silakan coba lagi nanti secara manual.
                        </p>
                    </div>
                ) : (
                    <p style={{ fontSize: '1.1rem', color: '#6c757d', marginBottom: '2rem' }}>
                        Kami sedang mengalami kendala. Mohon mencoba beberapa saat lagi.
                        <br />
                        <strong style={{ display: 'block', marginTop: '0.5rem', color: '#343a40' }}>
                            Mencoba lagi dalam {countdown} detik...
                            (Percobaan {retryCount + 1} dari {backoffDelays.length})
                        </strong>
                    </p>
                )}

                <SimpleButton onClick={handleManualRefresh}>
                    Coba Muat Ulang Sekarang
                </SimpleButton>
            </div>
        </SimpleContainer>
    );
}

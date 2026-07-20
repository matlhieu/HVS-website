'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        const { error: authError } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (authError) {
            setError(authError.message);
            return;
        }

        // redirection vers l'administration après succès
        router.push('/admin');
    };

    return (
        <main className="flex min-h-screen items-center justify-center p-24">
            <form onSubmit={handleLogin} className="flex flex-col gap-4 w-full max-w-sm bg-gray-900 p-8 rounded border border-gray-700">
                <h1 className="text-2xl font-bold mb-4 text-center">Connexion HVS</h1>

                {error && <p className="text-red-500 text-sm">{error}</p>}

                <input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="p-2 text-black rounded"
                    required
                />
                <input
                    type="password"
                    placeholder="Mot de passe"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="p-2 text-black rounded"
                    required
                />
                <button type="submit" className="bg-blue-600 p-2 rounded hover:bg-blue-500 font-bold mt-4">
                    Se connecter
                </button>
            </form>
        </main>
    );
}
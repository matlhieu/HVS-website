'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '../../../lib/supabase';

export default function FolderPage() {
    // get folder id from url params
    const params = useParams();
    const folderId = params.id as string;

    const [pin, setPin] = useState('');
    const [error, setError] = useState('');
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [files, setFiles] = useState<any[]>([]);

    const verifyPin = async (e: React.FormEvent) => {
        e.preventDefault();

        // fetch category by id
        const { data: category, error: catError } = await supabase
            .from('categories')
            .select('pin_code')
            .eq('id', folderId)
            .single();

        if (catError || !category) {
            setError('Folder not found');
            return;
        }

        // validate pin
        if (category.pin_code === pin) {
            setIsAuthenticated(true);
            setError('');

            // fetch resources
            const { data: resources } = await supabase
                .from('resources')
                .select('*')
                .eq('category_id', folderId);

            if (resources) setFiles(resources);
        } else {
            setError('Invalid PIN');
        }
    };

    // render auth form
    if (!isAuthenticated) {
        return (
            <main className="flex min-h-screen flex-col items-center justify-center p-24">
                <form onSubmit={verifyPin} className="flex flex-col gap-4 p-8 border border-gray-600 rounded bg-gray-900">
                    <h2 className="text-2xl font-bold text-white mb-4">Accès restreint</h2>
                    <input
                        type="password"
                        maxLength={4}
                        value={pin}
                        onChange={(e) => setPin(e.target.value)}
                        placeholder="PIN"
                        className="p-2 border rounded text-black text-center text-lg"
                    />
                    <button type="submit" className="bg-white text-black font-bold p-2 rounded hover:bg-gray-200">
                        Valider
                    </button>
                    {error && <p className="text-red-500 text-center">{error}</p>}
                </form>
            </main>
        );
    }

    // render files
    return (
        <main className="p-24 min-h-screen">
            <h1 className="text-3xl font-bold mb-8">Ressources</h1>
            <div className="grid gap-4">
                {files.length === 0 ? (
                    <p>Dossier vide.</p>
                ) : (
                    files.map(file => (
                        <div key={file.id} className="p-4 border border-gray-600 rounded flex justify-between items-center">
                            <a
                                href={file.file_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-400 hover:text-blue-300 hover:underline font-bold"
                            >
                                {file.title}
                            </a>
                            <span className="text-sm bg-gray-800 p-1 rounded">{file.file_type}</span>
                        </div>
                    ))
                )}
            </div>
        </main>
    );
}
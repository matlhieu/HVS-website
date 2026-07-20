'use client';

import { useState, useEffect, use } from 'react';
import { createClient } from '@supabase/supabase-js';

// init db client
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function SubfolderPage({ params }: { params: Promise<{ id: string }> }) {
    // unwrap nextjs 15 params
    const resolvedParams = use(params);
    const categoryId = resolvedParams.id;

    const [files, setFiles] = useState<any[]>([]);
    const [isAdmin, setIsAdmin] = useState(false);
    const [newFile, setNewFile] = useState<File | null>(null);
    const [showUploadForm, setShowUploadForm] = useState(false); // toggle form visibility

    useEffect(() => {
        // check admin session
        const checkAuth = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            setIsAdmin(!!session);
        };

        // fetch files for this category
        const fetchFiles = async () => {
            const { data } = await supabase
                .from('resources')
                .select('*')
                .eq('category_id', categoryId);
            if (data) setFiles(data);
        };

        checkAuth();
        fetchFiles();
    }, [categoryId]);

    // handle new file upload
    const handleUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newFile) return;

        const fileExt = newFile.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const filePath = `${categoryId}/${fileName}`;

        // upload to bucket
        await supabase.storage.from('documents').upload(filePath, newFile);
        const { data: { publicUrl } } = supabase.storage.from('documents').getPublicUrl(filePath);

        // insert db record
        await supabase.from('resources').insert([{
            title: newFile.name.replace(`.${fileExt}`, ''),
            file_type: fileExt?.toUpperCase(),
            category_id: categoryId,
            file_url: publicUrl
        }]);

        window.location.reload();
    };

    // delete resource
    const handleDelete = async (fileId: string, fileUrl: string) => {
        // parse path from url
        const urlParts = fileUrl.split('/');
        const filePath = `${urlParts[urlParts.length - 2]}/${urlParts[urlParts.length - 1]}`;

        // rm from bucket and db
        await supabase.storage.from('documents').remove([filePath]);
        await supabase.from('resources').delete().eq('id', fileId);

        // update ui
        setFiles(files.filter(f => f.id !== fileId));
    };

    return (
        <main className="p-24 min-h-screen">
            <div className="flex items-center gap-4 mb-8">
                <h1 className="text-3xl font-bold">Ressources</h1>
                {isAdmin && (
                    <button
                        onClick={() => setShowUploadForm(!showUploadForm)}
                        className="bg-blue-600 hover:bg-blue-500 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-xl leading-none"
                        title="Add file"
                    >
                        +
                    </button>
                )}
            </div>

            {isAdmin && showUploadForm && (
                <form onSubmit={handleUpload} className="mb-8 p-4 bg-gray-900 rounded border border-gray-700 flex gap-4 items-center transition-all">
                    <input
                        type="file"
                        onChange={(e) => setNewFile(e.target.files?.[0] || null)}
                        className="text-white text-sm"
                        required
                    />
                    <button type="submit" className="bg-green-600 px-4 py-2 rounded font-bold text-white text-sm hover:bg-green-500">
                        Confirmer l'ajout
                    </button>
                </form>
            )}

            <div className="grid gap-4">
                {files.map(file => (
                    <div key={file.id} className="p-4 border border-gray-600 rounded flex justify-between items-center bg-gray-900">
                        <a href={file.file_url} target="_blank" className="text-blue-400 hover:underline text-sm font-medium">
                            {file.title}
                        </a>
                        <div className="flex items-center gap-4">
                            <span className="text-xs bg-gray-800 p-1 rounded text-white">{file.file_type}</span>
                            {isAdmin && (
                                <button
                                    onClick={() => handleDelete(file.id, file.file_url)}
                                    className="text-red-500 hover:text-red-400 p-1 transition-colors"
                                    title="Delete file"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                    </svg>
                                </button>
                            )}
                        </div>
                    </div>
                ))}
                {files.length === 0 && <p className="text-gray-400 italic text-sm">Aucune ressource disponible.</p>}
            </div>
        </main>
    );
}
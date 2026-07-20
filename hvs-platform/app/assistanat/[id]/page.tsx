'use client';

import { useState, useEffect, use, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';

// init supabase client
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function AssistanatSubfolderPage({ params }: { params: Promise<{ id: string }> }) {
    // unwrap params for next15 compat
    const resolvedParams = use(params);
    const categoryId = resolvedParams.id;

    // base states
    const [files, setFiles] = useState<any[]>([]);
    const [isAdmin, setIsAdmin] = useState(false);
    const [loading, setLoading] = useState(true);

    // pin states
    const [isUnlocked, setIsUnlocked] = useState(false);
    const [expectedPin, setExpectedPin] = useState<string | null>(null);
    const [pinInput, setPinInput] = useState('');
    const [pinError, setPinError] = useState(false); // err state for UI feedback

    // hidden input ref
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const loadData = async () => {
            // check admin auth
            const { data: { session } } = await supabase.auth.getSession();
            const adminStatus = !!session;
            setIsAdmin(adminStatus);

            // get category pin
            const { data: catData } = await supabase
                .from('categories')
                .select('pin_code')
                .eq('id', categoryId)
                .single();

            // bypass pin if admin or no pin
            if (adminStatus || !catData?.pin_code) {
                setIsUnlocked(true);
            } else {
                setExpectedPin(catData.pin_code);
                // check cache
                if (sessionStorage.getItem(`unlocked_${categoryId}`)) {
                    setIsUnlocked(true);
                }
            }

            // get subfolder files
            const { data: resData } = await supabase
                .from('resources')
                .select('*')
                .eq('category_id', categoryId);
            if (resData) setFiles(resData);

            setLoading(false);
        };

        loadData();
    }, [categoryId]);

    // handle pin validation silently
    const handlePinSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (pinInput === expectedPin) {
            setIsUnlocked(true);
            setPinError(false);
            sessionStorage.setItem(`unlocked_${categoryId}`, 'true');
        } else {
            setPinError(true);
            setPinInput('');
        }
    };

    // click trigger for native file picker
    const triggerFileInput = () => {
        fileInputRef.current?.click();
    };

    // auto upload when file picked
    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const filePath = `${categoryId}/${fileName}`;

        // push to storage
        await supabase.storage.from('documents').upload(filePath, file);
        const { data: { publicUrl } } = supabase.storage.from('documents').getPublicUrl(filePath);

        // link file to db category
        const { data: newResource } = await supabase.from('resources').insert([{
            title: file.name.replace(`.${fileExt}`, ''),
            file_type: fileExt?.toUpperCase(),
            category_id: categoryId,
            file_url: publicUrl
        }]).select().single();

        // sync UI
        if (newResource) setFiles([...files, newResource]);

        // clear input for same file re-upload
        e.target.value = '';
    };

    // rm file from storage and db
    const handleDelete = async (fileId: string, fileUrl: string) => {
        // prevent missclicks
        if (!window.confirm("Êtes-vous sûr de vouloir supprimer ce fichier ?")) return;

        // format path
        const urlParts = fileUrl.split('/');
        const filePath = `${urlParts[urlParts.length - 2]}/${urlParts[urlParts.length - 1]}`;

        await supabase.storage.from('documents').remove([filePath]);
        await supabase.from('resources').delete().eq('id', fileId);

        setFiles(files.filter(f => f.id !== fileId));
    };

    if (loading) return <main className="p-24"><p>Chargement...</p></main>;

    // pin lock view
    if (!isUnlocked) {
        return (
            <main className="flex min-h-screen items-center justify-center p-24">
                <form onSubmit={handlePinSubmit} className="bg-gray-900 p-8 rounded border border-gray-700 flex flex-col gap-4 shadow-lg">
                    <h2 className="text-xl font-bold text-center">Accès protégé</h2>
                    <input
                        type="password"
                        placeholder="Code PIN"
                        value={pinInput}
                        onChange={(e) => {
                            setPinInput(e.target.value);
                            setPinError(false); // hide err on typing
                        }}
                        className="p-2 text-black rounded text-center tracking-[0.5em]"
                        maxLength={4}
                        required
                    />
                    {pinError && (
                        <p className="text-red-500 text-sm text-center font-bold">Code PIN incorrect</p>
                    )}
                    <button type="submit" className="bg-blue-600 p-2 rounded hover:bg-blue-500 font-bold text-white transition-colors mt-2">
                        Déverrouiller
                    </button>
                </form>
            </main>
        );
    }

    // unlocked view
    return (
        <main className="p-24 min-h-screen">
            <div className="flex items-center gap-4 mb-8">
                <h1 className="text-3xl font-bold">Ressources</h1>
                {isAdmin && (
                    <>
                        <button
                            onClick={triggerFileInput}
                            className="bg-blue-600 hover:bg-blue-500 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-xl leading-none transition-colors"
                            title="Ajouter un fichier"
                        >
                            +
                        </button>
                        {/* hidden sys input */}
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileSelect}
                            className="hidden"
                        />
                    </>
                )}
            </div>

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
                                    title="Supprimer le fichier"
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
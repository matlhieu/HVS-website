'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

// init db client
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function AdminPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [categories, setCategories] = useState<any[]>([]);
    const [resources, setResources] = useState<any[]>([]);

    // upload states
    const [title, setTitle] = useState('');
    const [categoryId, setCategoryId] = useState('');
    const [file, setFile] = useState<File | null>(null);

    // pin states (mapping category id to its pin input value)
    const [pins, setPins] = useState<{ [key: string]: string }>({});

    // filters states
    const [searchTerm, setSearchTerm] = useState('');
    const [filterCategory, setFilterCategory] = useState('');

    // new folder states
    const [newFolderName, setNewFolderName] = useState('');
    const [newFolderParentId, setNewFolderParentId] = useState('');
    const [newFolderPin, setNewFolderPin] = useState('');
    const [parentCategories, setParentCategories] = useState<any[]>([]);

    useEffect(() => {
        const checkAuthAndFetchData = async () => {
            // checking auth
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                router.push('/login');
                return;
            }

            // get subfolders (excluding main folders like Gestion and Assistanat which have parent_id null)
            const { data: catData } = await supabase
                .from('categories')
                .select('id, name, pin_code')
                .not('parent_id', 'is', null);

            if (catData) {
                setCategories(catData);
                const initialPins: { [key: string]: string } = {};
                catData.forEach(c => {
                    initialPins[c.id] = c.pin_code || '';
                });
                setPins(initialPins);
            }

            // get parent categories (Gestion, Assistanat) for subfolder creation
            const { data: parentData } = await supabase
                .from('categories')
                .select('id, name')
                .is('parent_id', null);
            if (parentData) setParentCategories(parentData);

            // get all resources
            const { data: resData } = await supabase
                .from('resources')
                .select('id, title, file_type, file_url, category_id, categories(name)');
            if (resData) setResources(resData);

            setLoading(false);
        };

        checkAuthAndFetchData();
    }, [router]);

    // upload file
    const handleUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file || !categoryId || !title) return;

        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const filePath = `${categoryId}/${fileName}`;

        // push to storage
        const { error: uploadError } = await supabase.storage
            .from('documents')
            .upload(filePath, file, { cacheControl: '3600', upsert: false });
        if (uploadError) return alert(`Erreur Storage: ${uploadError.message}`);

        const { data: { publicUrl } } = supabase.storage.from('documents').getPublicUrl(filePath);

        // add row to db
        const { data: newResource, error: dbError } = await supabase
            .from('resources')
            .insert([{
                title: title,
                file_type: fileExt?.toUpperCase(),
                category_id: categoryId,
                file_url: publicUrl
            }])
            .select('id, title, file_type, file_url, category_id, categories(name)')
            .single();

        if (dbError) return alert(`Erreur DB: ${dbError.message}`);

        // update list
        setResources([...resources, newResource]);
        alert('Upload réussi');
        setTitle('');
        setFile(null);
    };

    // update folder pin
    const handleUpdatePin = async (catId: string) => {
        const newPin = pins[catId];
        const { error } = await supabase
            .from('categories')
            .update({ pin_code: newPin ? newPin : null })
            .eq('id', catId);

        if (error) {
            alert(`Erreur DB: ${error.message}`);
        } else {
            alert('Code PIN mis à jour avec succès');
        }
    };

    // create new subfolder
    const handleCreateCategory = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newFolderName || !newFolderParentId) return;

        const { data: newCat, error } = await supabase
            .from('categories')
            .insert([{
                name: newFolderName,
                parent_id: newFolderParentId,
                pin_code: newFolderPin ? newFolderPin : null
            }])
            .select('id, name, pin_code')
            .single();

        if (error) return alert(`Erreur DB: ${error.message}`);

        setCategories([...categories, newCat]);
        alert('Sous-dossier créé avec succès');
        setNewFolderName('');
        setNewFolderPin('');
        setNewFolderParentId('');
    };

    // delete resource
    const handleDeleteResource = async (resourceId: string, fileUrl: string) => {
        // extract path for deletion
        const urlParts = fileUrl.split('/');
        const filePath = `${urlParts[urlParts.length - 2]}/${urlParts[urlParts.length - 1]}`;

        // drop from bucket
        await supabase.storage.from('documents').remove([filePath]);

        // drop from db
        const { error: dbError } = await supabase.from('resources').delete().eq('id', resourceId);
        if (dbError) return alert(`Erreur DB: ${dbError.message}`);

        // refresh list
        setResources(resources.filter(r => r.id !== resourceId));
    };

    // compute filtered list
    const filteredResources = resources.filter(res => {
        const matchSearch = res.title.toLowerCase().includes(searchTerm.toLowerCase());
        const matchCat = filterCategory ? res.category_id === filterCategory : true;
        return matchSearch && matchCat;
    });

    if (loading) return <main className="p-24"><p>Vérification des accès...</p></main>;

    return (
        <main className="p-12 min-h-screen text-white">
            <div className="flex justify-between items-center mb-8 border-b border-gray-700 pb-4">
                <h1 className="text-3xl font-bold">Administration HVS</h1>
                <button
                    onClick={async () => { await supabase.auth.signOut(); router.push('/login'); }}
                    className="bg-red-600 px-4 py-2 rounded hover:bg-red-500 font-bold text-white"
                >
                    Déconnexion
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                {/* upload form */}
                <section className="bg-gray-900 p-6 rounded border border-gray-700">
                    <h2 className="text-xl font-bold mb-4">Ajouter un document</h2>
                    <form onSubmit={handleUpload} className="flex flex-col gap-3">
                        <input type="text" placeholder="Titre du document" value={title} onChange={(e) => setTitle(e.target.value)} className="p-2 text-black rounded text-sm" required />
                        <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="p-2 text-black rounded text-sm" required>
                            <option value="">Sélectionner un dossier</option>
                            {categories.map((cat) => (
                                <option key={cat.id} value={cat.id}>{cat.name}</option>
                            ))}
                        </select>
                        <input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} className="p-2 border border-gray-600 rounded bg-gray-800 text-white text-sm" required />
                        <button type="submit" className="bg-blue-600 p-2 rounded hover:bg-blue-500 font-bold text-white mt-1 text-sm">Ajouter</button>
                    </form>
                </section>

                {/* create folder form */}
                <section className="bg-gray-900 p-6 rounded border border-gray-700">
                    <h2 className="text-xl font-bold mb-4">Créer un sous-dossier</h2>
                    <form onSubmit={handleCreateCategory} className="flex flex-col gap-3">
                        <input
                            type="text"
                            placeholder="Nom du sous-dossier"
                            value={newFolderName}
                            onChange={(e) => setNewFolderName(e.target.value)}
                            className="p-2 text-black rounded text-sm"
                            required
                        />
                        <select
                            value={newFolderParentId}
                            onChange={(e) => setNewFolderParentId(e.target.value)}
                            className="p-2 text-black rounded text-sm"
                            required
                        >
                            <option value="">Sélectionner le dossier parent</option>
                            {parentCategories.map((parent) => (
                                <option key={parent.id} value={parent.id}>{parent.name}</option>
                            ))}
                        </select>
                        <input
                            type="text"
                            placeholder="Code PIN (optionnel, 4 chiffres)"
                            value={newFolderPin}
                            onChange={(e) => setNewFolderPin(e.target.value)}
                            className="p-2 text-black rounded text-sm"
                            maxLength={4}
                        />
                        <button type="submit" className="bg-purple-600 p-2 rounded hover:bg-purple-500 font-bold text-white mt-1 text-sm">
                            Créer le sous-dossier
                        </button>
                    </form>
                </section>

                {/* pin management section */}
                <section className="bg-gray-900 p-6 rounded border border-gray-700">
                    <h2 className="text-xl font-bold mb-4">Gestion des codes PIN des dossiers</h2>
                    <div className="flex flex-col gap-3 max-h-72 overflow-y-auto pr-2">
                        {categories.map((cat) => (
                            <div key={cat.id} className="p-3 border border-gray-700 rounded bg-gray-800 flex justify-between items-center">
                                <div>
                                    <p className="font-bold text-sm">{cat.name}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        maxLength={4}
                                        value={pins[cat.id] || ''}
                                        onChange={(e) => setPins({ ...pins, [cat.id]: e.target.value })}
                                        placeholder="PIN"
                                        className="p-1 w-16 text-black rounded text-center text-sm"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => handleUpdatePin(cat.id)}
                                        className="bg-green-600 px-3 py-1 rounded text-xs hover:bg-green-500 font-bold"
                                    >
                                        Modifier
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
                {/* compact list with filters and scroll */}
                <section className="bg-gray-900 p-6 rounded border border-gray-700">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-bold">Gestion des documents</h2>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                placeholder="Rechercher..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="p-1 px-2 text-black rounded text-sm w-48"
                            />
                            <select
                                value={filterCategory}
                                onChange={(e) => setFilterCategory(e.target.value)}
                                className="p-1 px-2 text-black rounded text-sm w-40"
                            >
                                <option value="">Tous les dossiers</option>
                                {categories.map((cat) => (
                                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* fixed height scrollable container */}
                    <div className="flex flex-col gap-2 max-h-96 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-600">
                        {filteredResources.map((resource) => (
                            <div key={resource.id} className="flex justify-between items-center p-2 bg-gray-800 rounded border border-gray-600">
                                <div className="flex flex-col">
                                    <span className="font-bold text-sm">{resource.title} <span className="text-xs font-normal bg-gray-600 px-1 rounded ml-1">{resource.file_type}</span></span>
                                    <span className="text-xs text-gray-400">{resource.categories?.name}</span>
                                </div>
                                <div className="flex gap-3 items-center">
                                    <a href={resource.file_url} target="_blank" className="text-blue-400 hover:underline text-xs">Voir</a>
                                    <button
                                        onClick={() => handleDeleteResource(resource.id, resource.file_url)}
                                        className="bg-red-600 px-2 py-1 rounded text-xs font-bold text-white hover:bg-red-500"
                                    >
                                        Supprimer
                                    </button>
                                </div>
                            </div>
                        ))}
                        {filteredResources.length === 0 && <p className="text-gray-400 text-sm italic">Aucun document trouvé.</p>}
                    </div>
                </section>
            </div>
        </main>
    );
}
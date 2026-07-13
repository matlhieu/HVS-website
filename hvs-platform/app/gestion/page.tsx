import Link from 'next/link';
import { supabase } from '../../lib/supabase';

export default async function GestionDashboard() {
    // fetching parent folder to get its id
    const { data: parent } = await supabase
        .from('categories')
        .select('id')
        .eq('name', 'Gestion')
        .single();

    let subFolders: any[] = [];

    // getting subfolders if parent exists
    if (parent) {
        const { data: children } = await supabase
            .from('categories')
            .select('id, name')
            .eq('parent_id', parent.id);

        if (children) subFolders = children;
    }

    // returning ui with mapping
    return (
        <main className="p-24 min-h-screen">
            <h1 className="text-3xl font-bold mb-8">Espace Gestion</h1>
            <div className="grid grid-cols-2 gap-4">
                {subFolders.map((folder) => (
                    <Link
                        key={folder.id}
                        href={`/gestion/${folder.id}`}
                        className="p-4 border rounded hover:bg-gray-800 text-center"
                    >
                        Dossier {folder.name}
                    </Link>
                ))}
            </div>
        </main>
    );
}
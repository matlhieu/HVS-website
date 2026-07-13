import Link from 'next/link';

export default function Home() {
  // main dashboard ui
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="text-4xl font-bold mb-8">Plateforme HVS</h1>
      <div className="grid grid-cols-2 gap-4 text-center">
        <Link href="/" className="p-4 border rounded hover:bg-gray-800">Accueil</Link>
        <Link href="/gestion" className="p-4 border rounded hover:bg-gray-800">Gestion</Link>
        <Link href="/assistanat" className="p-4 border rounded hover:bg-gray-800">Assistanat</Link>
        <Link href="/contact" className="p-4 border rounded hover:bg-gray-800">Contact</Link>
      </div>
    </main>
  );
}
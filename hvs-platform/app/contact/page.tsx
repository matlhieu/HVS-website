'use client';

import { useState } from 'react';

export default function ContactPage() {
    const [formData, setFormData] = useState({ name: '', email: '', message: '' });
    const [status, setStatus] = useState('');

    // handling submit to trigger my backend api
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setStatus('Envoi en cours...');

        try {
            // sending the payload to the local route handler
            const response = await fetch('/api/contact', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData),
            });

            // checking if the email was sent successfully
            if (response.ok) {
                setStatus('Message envoyé avec succès.');
                // clearing inputs
                setFormData({ name: '', email: '', message: '' });
            } else {
                setStatus("Erreur lors de l'envoi du message.");
            }
        } catch (error) {
            setStatus('Erreur de connexion au serveur.');
        }
    };

    // rendering the contact form
    return (
        <main className="flex min-h-screen flex-col items-center justify-center p-24">
            <h1 className="text-3xl font-bold mb-8 text-white">Contact</h1>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-8 border border-gray-600 rounded-lg w-full max-w-md bg-gray-900">
                <input
                    type="text"
                    value={formData.name}
                    placeholder="Nom complet"
                    required
                    className="p-2 border rounded text-black"
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
                <input
                    type="email"
                    value={formData.email}
                    placeholder="Adresse e-mail"
                    required
                    className="p-2 border rounded text-black"
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
                <textarea
                    value={formData.message}
                    placeholder="Votre message"
                    required
                    rows={5}
                    className="p-2 border rounded text-black resize-none"
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                />
                <button type="submit" className="bg-white text-black font-bold p-2 rounded hover:bg-gray-200 transition-colors">
                    Envoyer
                </button>
                {status && <p className="text-yellow-500 text-center font-semibold mt-2">{status}</p>}
            </form>
        </main>
    );
}
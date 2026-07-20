import { NextResponse } from 'next/server';
import { Resend } from 'resend';

// Initialization of the Resend client
const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
    try {
        // Parsing the incoming JSON payload
        const { name, email, message } = await req.json();

        // Sending the email via Resend
        const data = await resend.emails.send({
            from: 'Acme <onboarding@resend.dev>', // default test domain
            to: ['nguyen.n2ha@gmail.com'], // address receiving the contact form
            subject: `Nouveau message de ${name} depuis la plateforme HVS`,
            html: `
                <h3>Nouveau contact via le formulaire</h3>
                <p><strong>Nom :</strong> ${name}</p>
                <p><strong>E-mail :</strong> ${email}</p>
                <p><strong>Message :</strong></p>
                <p>${message}</p>
            `
        });

        return NextResponse.json(data);
    } catch (error) {
        return NextResponse.json({ error: "Échec de l'envoi de l'e-mail" }, { status: 500 });
    }
}
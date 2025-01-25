export async function sendEmail(payload) {
    try {
        const response = await fetch('https://us-central1-rose-app-e062e.cloudfunctions.net/sendEmail', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        const result = await response.json();

        if (response.ok) {
            console.log("Email sent:", result.message);
            return { success: true, message: result.message };
        } else {
            console.error('Error sending email:', result.error);
            return { success: false, error: result.error };
        }
    } catch (error) {
        console.error('Error sending email:', error);
        return { success: false, error: 'An unexpected error occurred.' };
    }
}
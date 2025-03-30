// Update your route.ts to handle more event types
import { Webhook } from 'svix';
import { headers } from 'next/headers';
import { WebhookEvent } from '@clerk/nextjs/server';
import { syncUserById, handleUserDelete } from '@/actions/user.action';

export async function POST(req: Request) {
    const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;
    
    if (!WEBHOOK_SECRET) {
        console.error('Webhook secret not found in environment variables');
        return new Response('Webhook secret not configured', { status: 500 });
    }

    try {
        const headerPayload = headers();
        const svix_id = headerPayload.get("svix-id");
        const svix_timestamp = headerPayload.get("svix-timestamp");
        const svix_signature = headerPayload.get("svix-signature");

        if (!svix_id || !svix_timestamp || !svix_signature) {
            console.error('Missing svix headers');
            return new Response('Missing svix headers', { status: 400 });
        }

        // Get the raw payload
        const payload = await req.json();
        console.log('Received webhook event type:', payload.type);

        // Verify the webhook
        const wh = new Webhook(WEBHOOK_SECRET);
        let evt: WebhookEvent;
        
        try {
            evt = await wh.verify(
                JSON.stringify(payload),
                {
                    "svix-id": svix_id,
                    "svix-timestamp": svix_timestamp,
                    "svix-signature": svix_signature
                }
            ) as WebhookEvent;
        } catch (verifyError) {
            console.error('Webhook verification failed:', verifyError);
            return new Response('Webhook verification failed', { status: 400 });
        }

        // Check for required data
        if (!evt.data?.id) {
            console.error('Missing user ID in webhook payload');
            return new Response('Missing user ID in payload', { status: 400 });
        }

        // Handle user events
        if (evt.type === 'user.created' || evt.type === 'user.updated') {
            console.log(`${evt.type} - Processing webhook for user ID:`, evt.data.id);
            try {
                // Pass the entire evt.data object to syncUserById
                await syncUserById(evt.data.id, evt.data);
                return new Response(`User ${evt.type === 'user.created' ? 'created' : 'updated'} successfully`, { status: 200 });
            } catch (syncError) {
                console.error(`Error during ${evt.type} sync:`, syncError);
                // Return 200 to acknowledge receipt
                return new Response(`User ${evt.type} processed with warnings`, { status: 200 });
            }
        }

        // Handle user deletion
        if (evt.type === 'user.deleted') {
            console.log('Processing user deletion webhook for ID:', evt.data.id);
            try {
                await handleUserDelete(evt.data.id);
                return new Response('User deleted successfully', { status: 200 });
            } catch (deleteError) {
                console.error('Error during user deletion:', deleteError);
                // Return 200 to acknowledge receipt
                return new Response('User deletion processed with warnings', { status: 200 });
            }
        }

        // Unhandled event type
        console.log('Unhandled webhook event type:', evt.type);
        return new Response(`Event type ${evt.type} not handled`, { status: 200 });
    } catch (err) {
        console.error('Webhook processing error:', err);
        // Always return 200 to prevent webhook retries
        const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
        return new Response(
            JSON.stringify({ 
                message: 'Webhook received but encountered errors', 
                error: errorMessage 
            }), 
            { 
                status: 200, 
                headers: { 'Content-Type': 'application/json' } 
            }
        );
    }
}
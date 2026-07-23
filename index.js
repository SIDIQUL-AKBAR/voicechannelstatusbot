const { Client, GatewayIntentBits } = require('discord.js');
const express = require('express');

// ==========================================
// 1. EXPRESS WEB SERVER (For Render Hosting)
// ==========================================
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.status(200).send('24/7 Voice Channel Status Engine Online!');
});

app.listen(PORT, () => {
    console.log(`[Server] Web host running on port ${PORT}`);
});

// ==========================================
// 2. DISCORD INITIALIZATION & TARGET CHANNELS
// ==========================================
const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates]
});

// YOUR CUSTOM CHANNEL LAYOUT:
// Replace 'YOUR_..._ID' with the actual numeric channel IDs from your server.
const TARGET_CHANNELS = [
    { id: '1521736965441978442', status: '🏠 Welcome to the Lounge! Chill here with friends' },
    { id: '1521736971125264474',         status: '👥 Duo Room • Find your partner here' },
    { id: '1521736973709082677',   status: '🤫 Quiet Zone • Solo space / Mute ok' },
    { id: '1521736974505869333',     status: '🤍 Safe Space • Comfort zone for everyone' },
    { id: '1521736978180341820',       status: '🍃 Chilling area • Good vibes only' },
    { id: '1521737076905607168',     status: '💤 Away From Keyboard • Sleeping/Away' },
    { id: '1521737022572593182',       status: '🎵 Music Room • Vibe to the beats' }
];

client.once('ready', async () => {
    console.log(`[Discord] Bot active. Authenticated as ${client.user.tag}`);
    
    // Initial sync upon booting up on Render
    await forceStatusUpdate();

    // Safety loop every 10 minutes to verify status hasn't been wiped out
    setInterval(async () => {
        await forceStatusUpdate();
    }, 10 * 60 * 1000); 
});

// ==========================================
// 3. LISTEN FOR USER JOINS & LEAVES
// ==========================================
client.on('voiceStateUpdate', async (oldState, newState) => {
    const oldChannelId = oldState.channelId;
    const newChannelId = newState.channelId;

    // Check if the affected channel is in our monitored target list
    const affectedChannel = TARGET_CHANNELS.find(ch => ch.id === oldChannelId || ch.id === newChannelId);
    
    if (affectedChannel) {
        console.log(`[Activity Change] User activity detected in monitored VC (${affectedChannel.id}). Triggering safe update...`);
        
        // Wait 3.5 seconds before updating. This buffer gives Discord's native client time to process 
        // the disconnect, completely avoiding the API "locked status" rate limit bug!
        setTimeout(async () => {
            try {
                await client.rest.put(`/channels/${affectedChannel.id}/voice-status`, {
                    body: { status: affectedChannel.status }
                });
                console.log(`[Auto-Heal] Successfully maintained status for: ${affectedChannel.id}`);
            } catch (error) {
                console.error(`[Rate-Limit Safeguard] Could not overwrite status instantly: ${error.message}`);
            }
        }, 3500);
    }
});

// ==========================================
// 4. CORE API INJECTION FUNCTION
// ==========================================
async function forceStatusUpdate() {
    console.log('[Engine] Running scheduled status synchronization...');

    for (const channelConfig of TARGET_CHANNELS) {
        if (channelConfig.id.startsWith('YOUR_')) continue; // Ignore placeholders

        try {
            await client.rest.put(`/channels/${channelConfig.id}/voice-status`, {
                body: { status: channelConfig.status }
            });
            console.log(`[Sync Success] Enforced status layout for channel: ${channelConfig.id}`);
        } catch (error) {
            console.error(`[API Issue] Failed enforcing status on channel ${channelConfig.id}:`, error.message);
        }
        
        // 2-second rate-limit spacing between channels during batch operations
        await new Promise(resolve => setTimeout(resolve, 2000));
    }
}

// Global exception catchers to protect Render container from crashes
process.on('unhandledRejection', (error) => {
    console.error('Unhandled promise rejection:', error);
});

client.login(process.env.DISCORD_TOKEN);

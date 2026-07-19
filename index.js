const { Client, GatewayIntentBits } = require('discord.js');
const express = require('express');

// ==========================================
// 1. EXPRESS WEB SERVER CONFIGURATION
// ==========================================
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.status(200).send('Bot status engine is running 24/7!');
});

app.listen(PORT, () => {
    console.log(`[Server] Web server listening on port ${PORT}`);
});

// ==========================================
// 2. DISCORD CONFIGURATION
// ==========================================
const client = new Client({
    intents: [GatewayIntentBits.Guilds]
});

// CONFIGURE YOUR CHANNELS HERE: 
// Add the exact Voice Channel ID and the text status you want it to display
const CHANNELS_TO_UPDATE = [
    { id: '1521736965441978442', status: '»——　𝙏𝘼𝙇𝙆 𝙒𝙄𝙏𝙃 𝙁𝙍𝙄𝙀𝙉𝘿𝙎　——«' },
    { id: '1521736971125264474', status: '»——　𝘿𝙐𝙊 𝙑𝘾　——«' },
    { id: '1521736975428616372', status: '»——　𝘿𝙀𝙋𝙍𝙀𝙎𝙎𝙄𝙊𝙉　——«' },
    { id: '1521736978180341820', status: '»——　𝘾𝙃𝙄𝙇𝙇 𝙑𝘾　——«' },
    { id: '1521737076905607168', status: '»——　𝘼𝙁𝙆　——«' }
];

client.once('ready', async () => {
    console.log(`[Discord] Logged in successfully as ${client.user.tag}`);
    
    // Apply statuses right when the bot turns on
    await applyVoiceChannelStatuses();
});

// ==========================================
// 3. VOICE STATUS UPDATE ENGINE
// ==========================================
async function applyVoiceChannelStatuses() {
    console.log('[Status Engine] Initializing custom channel updates...');

    for (const ch of CHANNELS_TO_UPDATE) {
        try {
            // Using Discord REST API directly to bypass library limitations
            await client.rest.put(`/channels/${ch.id}/voice-status`, {
                body: { status: ch.status }
            });
            console.log(`[Success] Updated Channel ${ch.id} -> "${ch.status}"`);
        } catch (error) {
            console.error(`[Error] Failed updating channel ${ch.id}:`, error.message);
        }
        
        // Brief pause to obey Discord's global rate limits safely
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
}

// Global error handlers to ensure Render app never crashes
process.on('unhandledRejection', (error) => {
    console.error('Unhandled promise rejection:', error);
});

client.login(process.env.DISCORD_TOKEN);

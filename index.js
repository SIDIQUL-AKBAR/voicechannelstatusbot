const { Client, GatewayIntentBits } = require('discord.js');
const { joinVoiceChannel, VoiceConnectionStatus, entersState } = require('@discordjs/voice');
const express = require('express');

// ==========================================
// 1. EXPRESS WEB SERVER CONFIGURATION
// ==========================================
const app = express();
const PORT = process.env.PORT || 3000;

// Health check endpoint for Render and UptimeRobot
app.get('/', (req, res) => {
    res.status(200).send('Bot is active and running 24/7!');
});

app.listen(PORT, () => {
    console.log(`[Server] Web server listening on port ${PORT}`);
});

// ==========================================
// 2. DISCORD CONFIGURATION & INITIALIZATION
// ==========================================
// Pull configuration parameters safely from environment variables
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const GUILD_ID = process.env.GUILD_ID;
const CHANNEL_ID = process.env.CHANNEL_ID;

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates
    ]
});

client.once('ready', () => {
    console.log(`[Discord] Logged in successfully as ${client.user.tag}`);
    
    // Safety check for critical IDs
    if (!GUILD_ID || !CHANNEL_ID) {
        console.error("[Error] Missing GUILD_ID or CHANNEL_ID in Environment Variables.");
        return;
    }
    
    // Trigger initial connection
    connectToVoice(GUILD_ID, CHANNEL_ID);
});

// ==========================================
// 3. ROBUST VC CONNECTION ENGINE
// ==========================================
function connectToVoice(guildId, channelId) {
    const guild = client.guilds.cache.get(guildId);
    if (!guild) {
        console.error(`[Error] Could not find guild with ID: ${guildId}`);
        return;
    }

    console.log(`[Voice] Attempting connection to channel: ${channelId}`);

    const connection = joinVoiceChannel({
        channelId: channelId,
        guildId: guildId,
        adapterCreator: guild.voiceAdapterCreator,
        selfDeafen: true,  // Saves server bandwidth
        selfMute: false
    });

    // Handle sudden network drop or kick events
    connection.on(VoiceConnectionStatus.Disconnected, async () => {
        try {
            console.log("[Voice] Disconnected. Checking if Discord is automatically reconnecting...");
            // Wait up to 5 seconds to see if Discord native protocol patches the connection
            await Promise.race([
                entersState(connection, VoiceConnectionStatus.Signalling, 5000),
                entersState(connection, VoiceConnectionStatus.Connecting, 5000),
            ]);
        } catch (error) {
            // If it remains broken, clear out the instance and start fresh after 5 seconds
            console.log("[Voice] Hard disconnect detected. Re-initiating connection loop in 5s...");
            connection.destroy();
            setTimeout(() => connectToVoice(guildId, channelId), 5000);
        }
    });

    connection.on(VoiceConnectionStatus.Ready, () => {
        console.log(`[Voice] Successfully locked onto Voice Channel!`);
    });
    
    // Catch generic websocket errors to prevent node app crashes
    connection.on('error', (error) => {
        console.error('[Voice Error]', error);
    });
}

// Global process error catchers to maximize 24/7 uptime
process.on('unhandledRejection', (error) => {
    console.error('Unhandled promise rejection:', error);
});

client.login(DISCORD_TOKEN);

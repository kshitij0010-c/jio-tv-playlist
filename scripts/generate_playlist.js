
// scripts/generate_playlist.js
const fs = require('fs');
const https = require('https');

// ⚠️ IMPORTANT: Replace this with your actual Cloudflare Worker URL
const WORKER_BASE_URL = 'https://jio-auto-token-worker.kshitijborde.workers.dev';

// Your EPG URL (optional, but recommended for a better experience)
const EPG_URL = 'https://your-epg-url.com/epg.xml';

// Helper to make GET requests
function httpsGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

async function generatePlaylist() {
  try {
    console.log('Fetching channel list from Worker...');
    const channelsJson = await httpsGet(`${WORKER_BASE_URL}/channels`);
    const channels = JSON.parse(channelsJson);

    if (!Array.isArray(channels) || channels.length === 0) {
      throw new Error('No channels returned from Worker.');
    }

    let m3uContent = '#EXTM3U\n';
    if (EPG_URL) {
      m3uContent += `#EXT-X-EPG:${EPG_URL}\n`;
    }

    for (const channel of channels) {
      // Use channel_id as the tvg-id for the playlist
      const channelId = channel.channel_id;
      const channelName = channel.channel_name || `Channel ${channelId}`;
      const logoUrl = channel.logoUrl || '';

      // The /key/ route is for DRM-protected channels (like Widevine)
      // The /mpd/ route handles both .mpd and .m3u8 streams automatically
      const keyUrl = `${WORKER_BASE_URL}/key/${channelId}`;
      const streamUrl = `${WORKER_BASE_URL}/mpd/${channelId}`;

      // Write the M3U entry in the format you requested
      m3uContent += `#EXTINF:-1 tvg-id="${channelId}" tvg-name="${channelName}" tvg-logo="${logoUrl}" group-title="Jio TV", ${channelName}\n`;
      m3uContent += `#KODIPROP:inputstream=inputstream.adaptive\n`;
      m3uContent += `#KODIPROP:inputstream.adaptive.manifest_type=mpd\n`; // or hls
      m3uContent += `#KODIPROP:inputstream.adaptive.license_key=${keyUrl}\n`;
      m3uContent += `${streamUrl}\n\n`;
    }

    fs.writeFileSync('jiotv.m3u', m3uContent);
    console.log('Successfully generated jiotv.m3u');

  } catch (error) {
    console.error('Failed to generate playlist:', error.message);
    process.exit(1); // Fail the workflow if the script errors
  }
}

generatePlaylist();
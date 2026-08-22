/**
 * discordService.js — Live member count via Discord's public widget API.
 *
 * Discord exposes a no-auth, CORS-enabled JSON endpoint per server:
 *   https://discord.com/api/guilds/{guildId}/widget.json
 * It only works once the "Server Widget" toggle is turned on for the
 * server in Discord: Server Settings → Widget → Enable Server Widget.
 * The guild ID is NOT the invite code — copy it from Server Settings →
 * Widget (or right-click the server icon with Developer Mode on).
 *
 * Configure via REACT_APP_DISCORD_GUILD_ID in .env.local. If it's unset,
 * or the widget is disabled/the request fails, getWidget() resolves to
 * null so callers can quietly hide the widget instead of erroring.
 */

const GUILD_ID = process.env.REACT_APP_DISCORD_GUILD_ID;

const discordService = {
  isConfigured() {
    return !!GUILD_ID;
  },

  /**
   * Returns { presence_count, members: [{ username, status, avatar_url }], instant_invite }
   * or null if unconfigured/unavailable.
   */
  async getWidget() {
    if (!GUILD_ID) return null;
    try {
      const res = await fetch(`https://discord.com/api/guilds/${GUILD_ID}/widget.json`);
      if (!res.ok) return null; // 403 = widget disabled for this server, 404 = bad guild id
      return await res.json();
    } catch {
      return null; // offline, blocked, or CORS-restricted network
    }
  },
};

export default discordService;

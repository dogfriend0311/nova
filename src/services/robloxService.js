import axios from 'axios';

/**
 * Roblox service — rewritten to use the CURRENT Roblox public API.
 *
 * Background: the old code used `https://api.roblox.com/users/get-by-username`,
 * which Roblox deprecated and shut down. That is why every lookup returned
 * "unable to find username". The modern endpoint is
 * `POST https://users.roblox.com/v1/usernames/users`.
 *
 * Roblox's APIs do not send CORS headers, so every browser request must be
 * routed through a CORS proxy. We try several in order for reliability.
 */

const CORS_PROXIES = [
  (url) => `https://corsproxy.io/?url=${encodeURIComponent(url)}`,
  (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  (url) => `https://thingproxy.freeboard.io/fetch/${url}`,
];

async function proxiedGet(targetUrl) {
  let lastErr;
  for (const wrap of CORS_PROXIES) {
    try {
      const res = await axios.get(wrap(targetUrl), {
        timeout: 12000,
        headers: { Accept: 'application/json' },
      });
      return res.data;
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error('All CORS proxies failed');
}

async function proxiedPost(targetUrl, body) {
  let lastErr;
  for (const wrap of CORS_PROXIES) {
    try {
      const res = await axios.post(wrap(targetUrl), body, {
        timeout: 12000,
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
      });
      return res.data;
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error('All CORS proxies failed');
}

/** Roblox presence enum: 0 = offline, 1 = online, 2 = in game, 3 = in studio */
export const PRESENCE = {
  OFFLINE: 0,
  ONLINE: 1,
  IN_GAME: 2,
  IN_STUDIO: 3,
};

export const robloxService = {
  /**
   * Resolve a username → { id, name, displayName, description, created, isBanned }.
   * Uses the modern users.roblox.com endpoint.
   */
  async resolveByUsername(username) {
    const data = await proxiedPost(
      'https://users.roblox.com/v1/usernames/users',
      { usernames: [username], excludeBannedUsers: false }
    );
    const match = Array.isArray(data?.data) ? data.data[0] : null;
    if (!match) return null;
    // fetch full profile for description / created date / ban flag
    const full = await proxiedGet(`https://users.roblox.com/v1/users/${match.id}`);
    return {
      id: full.id,
      name: full.name,
      displayName: full.displayName,
      description: full.description || '',
      created: full.created,
      isBanned: !!full.isBanned,
    };
  },

  /** Backwards-compatible alias used elsewhere in the app. */
  async getUserByUsername(username) {
    try {
      const user = await this.resolveByUsername(username);
      return user ? { data: user } : { error: 'User not found' };
    } catch (error) {
      console.error('Error searching for Roblox user:', error);
      return { error: error.message };
    }
  },

  async getUserInfo(userId) {
    try {
      return await proxiedGet(`https://users.roblox.com/v1/users/${userId}`);
    } catch (error) {
      console.error('Error fetching Roblox user info:', error);
      return { error: error.message };
    }
  },

  /** Circular headshot avatar URL. */
  async getUserAvatar(userId) {
    try {
      const data = await proxiedGet(
        `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userId}&size=420x420&format=Png&isCircular=true`
      );
      return data?.data?.[0]?.imageUrl || null;
    } catch (error) {
      console.error('Error fetching user avatar:', error);
      return null;
    }
  },

  /** Full-body avatar thumbnail. */
  async getUserAvatarFull(userId) {
    try {
      const data = await proxiedGet(
        `https://thumbnails.roblox.com/v1/users/avatar?userIds=${userId}&size=420x420&format=Png&isCircular=false`
      );
      return data?.data?.[0]?.imageUrl || null;
    } catch (error) {
      console.error('Error fetching user full avatar:', error);
      return null;
    }
  },

  /** Presence: online/in-game/offline + last location. */
  async getUserPresence(userId) {
    try {
      const data = await proxiedPost(
        'https://presence.roblox.com/v1/presence/users',
        { userIds: [userId] }
      );
      return data?.userPresences?.[0] || null;
    } catch (error) {
      console.error('Error fetching user presence:', error);
      return null;
    }
  },

  /** Count of badges the user has earned. */
  async getBadgeCount(userId) {
    try {
      const data = await proxiedGet(
        `https://badges.roblox.com/v1/users/${userId}/badges?limit=100&sortOrder=Desc`
      );
      return Array.isArray(data?.data) ? data.data.length : 0;
    } catch (error) {
      console.error('Error fetching badge count:', error);
      return 0;
    }
  },

  async getMultipleUsers(userIds) {
    try {
      const data = await proxiedPost('https://users.roblox.com/v1/users', {
        userIds,
        excludeBannedUsers: false,
      });
      return { data: data?.data || [] };
    } catch (error) {
      console.error('Error fetching multiple users:', error);
      return { error: error.message };
    }
  },

  async getGroupInfo(groupId) {
    try {
      return await proxiedGet(`https://groups.roblox.com/v1/groups/${groupId}`);
    } catch (error) {
      console.error('Error fetching group info:', error);
      return { error: error.message };
    }
  },
};

export default robloxService;
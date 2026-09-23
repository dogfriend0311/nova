// src/services/messagingService.js
//
// Everything for the Messages page: unified DM + group conversation list,
// sending/editing/deleting messages, reactions, groups, blocks/mutes,
// sharing Nova objects (player cards, game results, etc.) into a chat,
// and the mini profile popover.
//
// IMPORTANT: the Rivestack query shim (supabaseClient.js -> /api/query)
// does NOT support .or() the way real Supabase does — there's no `or`
// filter op on the backend. Any "message involves me" query is therefore
// done as two separate .eq() queries (one for from_username, one for
// to_username/to_group_id) and merged here in JS. Don't add .or() calls
// to this file; they will silently fail (caught, empty result) exactly
// like the pre-existing db.js getConversations() bug this file replaces.

import { supabase } from './supabaseClient';
import db from './db';

const REACTION_SET = ['❤️', '😂', '🔥', '💀', '👍', '👎', '⚾'];

const dmConversationId = (a, b) => [a, b].sort().join('::');
const groupConversationId = (groupId) => `group:${groupId}`;
const isGroupConversationId = (id) => typeof id === 'string' && id.startsWith('group:');

async function safeSelect(table, build) {
  try {
    const { data, error } = await build(supabase.from(table).select('*'));
    if (error) return [];
    return data || [];
  } catch {
    return [];
  }
}

const messagingService = {
  REACTION_SET,
  dmConversationId,
  groupConversationId,
  isGroupConversationId,

  /* ── Conversation list (DMs + groups, merged) ──────────────── */
  async getConversations(username) {
    if (!username) return [];

    const [sentDm, recvDm, groupIds, blockedList] = await Promise.all([
      safeSelect('nova_direct_messages', (q) => q.eq('from_username', username).order('created_at', { ascending: false })),
      safeSelect('nova_direct_messages', (q) => q.eq('to_username', username).order('created_at', { ascending: false })),
      safeSelect('nova_group_members', (q) => q.eq('username', username)),
      this.getBlockedUsers(username),
    ]);
    const blocked = new Set(blockedList);

    const groupMsgRows = groupIds.length
      ? await safeSelect('nova_direct_messages', (q) => q.in('to_group_id', groupIds.map(g => g.group_id)).order('created_at', { ascending: false }))
      : [];

    const groups = groupIds.length
      ? await safeSelect('nova_group_conversations', (q) => q.in('id', groupIds.map(g => g.group_id)))
      : [];
    const groupById = new Map(groups.map(g => [g.id, g]));

    const reads = await safeSelect('nova_conversation_reads', (q) => q.eq('username', username));
    const lastReadByConvo = new Map(reads.map(r => [r.conversation_id, r.last_read_at]));

    const allDm = [...sentDm, ...recvDm].filter(m => !m.deleted_at);
    const sentByConvo = new Set(sentDm.map(m => m.conversation_id));

    const byConvo = new Map();
    for (const m of allDm) {
      const existing = byConvo.get(m.conversation_id);
      if (!existing || new Date(m.created_at) > new Date(existing.created_at)) {
        byConvo.set(m.conversation_id, m);
      }
    }

    const previewText = (m) => {
      if (!m) return '';
      if (m.deleted_at) return 'Message deleted';
      if (m.message_type === 'shared_object') return `Shared ${(m.payload && m.payload.object_type) || 'something'}`;
      if (m.message_type === 'gif') return 'Sent a GIF';
      if (m.message_type === 'voice') return 'Sent a voice message';
      if (m.message_type === 'image') return 'Sent an image';
      if (m.message_type === 'video') return 'Sent a video';
      if (m.message_type === 'file') return `Sent a file: ${m.content || ''}`.trim();
      return m.content;
    };

    const isUnread = (convoId, latest) => {
      if (!latest || latest.from_username === username) return false;
      const lastRead = lastReadByConvo.get(convoId);
      return !lastRead || new Date(latest.created_at) > new Date(lastRead);
    };

    const dmList = [];
    for (const [convoId, latest] of byConvo.entries()) {
      const other = latest.from_username === username ? latest.to_username : latest.from_username;
      if (!other || blocked.has(other)) continue;
      dmList.push({
        conversation_id: convoId,
        type: 'dm',
        other_username: other,
        title: other,
        last_message: previewText(latest),
        last_at: latest.created_at,
        unread: isUnread(convoId, latest),
        is_request: !sentByConvo.has(convoId),
      });
    }

    const groupLatestByGroup = new Map();
    for (const m of groupMsgRows) {
      if (m.deleted_at) continue;
      const existing = groupLatestByGroup.get(m.to_group_id);
      if (!existing || new Date(m.created_at) > new Date(existing.created_at)) {
        groupLatestByGroup.set(m.to_group_id, m);
      }
    }
    const groupList = groupIds.map(g => {
      const group = groupById.get(g.group_id);
      if (!group) return null;
      const convoId = groupConversationId(g.group_id);
      const latest = groupLatestByGroup.get(g.group_id);
      return {
        conversation_id: convoId,
        type: 'group',
        group_id: g.group_id,
        title: group.name,
        emoji: group.emoji || '🪐',
        last_message: latest ? previewText(latest) : 'No messages yet',
        last_at: latest ? latest.created_at : group.created_at,
        unread: isUnread(convoId, latest),
        is_request: false,
      };
    }).filter(Boolean);

    const mutedIds = new Set((await safeSelect('nova_conversation_mutes', (q) => q.eq('username', username))).map(r => r.conversation_id));

    return [...dmList, ...groupList]
      .map(c => ({ ...c, muted: mutedIds.has(c.conversation_id) }))
      .sort((a, b) => new Date(b.last_at) - new Date(a.last_at));
  },

  /* ── Messages in a conversation ────────────────────────────── */
  async getMessages(conversationId) {
    const rows = await safeSelect('nova_direct_messages', (q) => q.eq('conversation_id', conversationId).order('created_at', { ascending: true }));
    if (!rows.length) return [];

    const reactions = await safeSelect('nova_message_reactions', (q) => q.in('message_id', rows.map(r => r.id)));
    const reactionsByMsg = new Map();
    for (const r of reactions) {
      if (!reactionsByMsg.has(r.message_id)) reactionsByMsg.set(r.message_id, []);
      reactionsByMsg.get(r.message_id).push(r);
    }
    const byId = new Map(rows.map(r => [r.id, r]));

    return rows.map(m => ({
      ...m,
      reply_to: m.reply_to_id ? byId.get(m.reply_to_id) || null : null,
      reactions: (reactionsByMsg.get(m.id) || []).reduce((acc, r) => {
        const entry = acc.find(e => e.emoji === r.emoji);
        if (entry) { entry.count += 1; entry.usernames.push(r.username); }
        else acc.push({ emoji: r.emoji, count: 1, usernames: [r.username] });
        return acc;
      }, []),
    }));
  },

  /* ── Send / edit / delete ──────────────────────────────────── */
  async sendMessage({ from, toUsername = null, groupId = null, content, messageType = 'text', payload = null, replyToId = null }) {
    const conversationId = groupId ? groupConversationId(groupId) : dmConversationId(from, toUsername);
    const record = {
      conversation_id: conversationId,
      from_username: from,
      to_username: groupId ? null : toUsername,
      to_group_id: groupId || null,
      content: content || '',
      message_type: messageType,
      payload: payload,
      reply_to_id: replyToId,
      created_at: new Date().toISOString(),
    };

    let data, error;
    try {
      ({ data, error } = await supabase.from('nova_direct_messages').insert([record]).select());
    } catch (err) {
      error = { message: err?.message || 'Network error reaching /api/query' };
    }

    if (error) {
      console.error('[messagingService.sendMessage] failed:', error);
      return { ...record, id: `failed-${Date.now()}`, __failed: true, __error: error.message || String(error) };
    }
    const saved = (data && data[0]) ? data[0] : { ...record, id: `local-${Date.now()}` };

    if (!groupId && toUsername) {
      db.createNotification(toUsername, {
        type: 'dm',
        title: `New message from ${from}`,
        body: messageType === 'shared_object' ? `Shared ${(payload && payload.object_type) || 'something'}` : content.slice(0, 120),
        link: `#messages/${from}`,
      }).catch(() => {});
    } else if (groupId) {
      const members = await safeSelect('nova_group_members', (q) => q.eq('group_id', groupId));
      members.filter(m => m.username !== from).forEach(m => {
        db.createNotification(m.username, {
          type: 'dm', title: `New message in group`, body: content.slice(0, 120), link: `#messages`,
        }).catch(() => {});
      });
    }
    return saved;
  },

  /** Convenience wrapper for "Share -> Messages" on a Nova object page. */
  async shareObject({ from, toUsername = null, groupId = null, objectType, title, subtitle = '', meta = '', imageUrl = '', link = '' }) {
    return this.sendMessage({
      from, toUsername, groupId, content: title, messageType: 'shared_object',
      payload: { object_type: objectType, title, subtitle, meta, image_url: imageUrl, link },
    });
  },

  async editMessage(messageId, content) {
    const { data, error } = await supabase.from('nova_direct_messages')
      .update({ content, edited_at: new Date().toISOString() }).eq('id', messageId);
    return !error ? (data && data[0]) : null;
  },

  async deleteMessage(messageId) {
    const { error } = await supabase.from('nova_direct_messages')
      .update({ content: '', deleted_at: new Date().toISOString() }).eq('id', messageId);
    return !error;
  },

  /* ── Reactions ──────────────────────────────────────────────── */
  async toggleReaction(messageId, username, emoji) {
    try {
      const existing = await safeSelect('nova_message_reactions', (q) => q.eq('message_id', messageId).eq('username', username).eq('emoji', emoji));
      if (existing.length) {
        const { error } = await supabase.from('nova_message_reactions').delete().eq('id', existing[0].id);
        if (error) throw error;
        return { ok: true, added: false };
      }
      const { error } = await supabase.from('nova_message_reactions').insert([{ message_id: messageId, username, emoji }]);
      if (error) throw error;
      return { ok: true, added: true };
    } catch (err) {
      console.error('[messagingService.toggleReaction] failed:', err);
      return { ok: false, error: err?.message || String(err) };
    }
  },

  /* ── Read state ─────────────────────────────────────────────── */
  async markConversationRead(username, conversationId) {
    await supabase.from('nova_conversation_reads')
      .upsert([{ username, conversation_id: conversationId, last_read_at: new Date().toISOString() }], { onConflict: 'username,conversation_id' });
  },

  async getUnreadCount(username) {
    const convos = await this.getConversations(username);
    return convos.filter(c => c.unread).length;
  },

  /* ── Groups ─────────────────────────────────────────────────── */
  async createGroup({ name, emoji = '🪐', createdBy, memberUsernames = [] }) {
    const { data, error } = await supabase.from('nova_group_conversations')
      .insert([{ name, emoji, created_by: createdBy }]).select();
    if (error || !data || !data[0]) return null;
    const group = data[0];
    const members = [createdBy, ...memberUsernames.filter(u => u !== createdBy)]
      .map(username => ({ group_id: group.id, username, role: username === createdBy ? 'owner' : 'member' }));
    await supabase.from('nova_group_members').insert(members);
    return group;
  },

  async addGroupMember(groupId, username) {
    await supabase.from('nova_group_members').insert([{ group_id: groupId, username }]);
  },

  async getGroupMembers(groupId) {
    return safeSelect('nova_group_members', (q) => q.eq('group_id', groupId));
  },

  /* ── Blocks & mutes ─────────────────────────────────────────── */
  async blockUser(blocker, blocked) {
    await supabase.from('nova_user_blocks').insert([{ blocker_username: blocker, blocked_username: blocked }]);
  },
  async unblockUser(blocker, blocked) {
    await supabase.from('nova_user_blocks').delete().eq('blocker_username', blocker).eq('blocked_username', blocked);
  },
  async getBlockedUsers(username) {
    const rows = await safeSelect('nova_user_blocks', (q) => q.eq('blocker_username', username));
    return rows.map(r => r.blocked_username);
  },
  async toggleMute(username, conversationId) {
    const existing = await safeSelect('nova_conversation_mutes', (q) => q.eq('username', username).eq('conversation_id', conversationId));
    if (existing.length) {
      await supabase.from('nova_conversation_mutes').delete().eq('username', username).eq('conversation_id', conversationId);
      return false;
    }
    await supabase.from('nova_conversation_mutes').insert([{ username, conversation_id: conversationId }]);
    return true;
  },

  /* ── Mini profile ───────────────────────────────────────────── */
  async getMiniProfile(username) {
    const profiles = await db.getMemberProfiles().catch(() => []);
    const profile = (profiles || []).find(p => p.username === username) || {};
    return {
      username,
      bio: profile.bio || '',
      badges: Array.isArray(profile.displayed_badges) ? profile.displayed_badges.slice(0, 3) : [],
    };
  },

  /* ── Search (client-side over an already-fetched list) ────────── */
  searchConversations(conversations, query) {
    const q = (query || '').trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter(c => c.title.toLowerCase().includes(q));
  },
};

export default messagingService;

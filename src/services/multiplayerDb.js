// Online multiplayer persistence for Nova baseball.
// Uses Nova's existing /api/query -> Rivestack adapter through supabaseClient.
// Polling is intentional because the project emulates Supabase Realtime.

import { supabase } from './supabaseClient';

const LS_PREFIX = 'nova_baseball_room_';

function roomKey(id) {
  return `${LS_PREFIX}${id}`;
}

export async function createRoom({
  name,
  ownerId,
  mode = 'head_to_head',
  maxPlayers = 2,
  settings = {}
}) {
  const room = {
    id: `room_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    name: name || 'Nova Baseball League',
    owner_id: ownerId || 'guest',
    mode,
    max_players: maxPlayers,
    status: 'lobby',
    settings,
    players: [
      {
        id: ownerId || 'guest',
        name: 'Commissioner',
        team: null,
        ready: false
      }
    ],
    state: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const { data, error } = await supabase
    .from('nova_baseball_rooms')
    .insert([room])
    .select();

  if (!error && data?.[0]) {
    localStorage.setItem(
      roomKey(room.id),
      JSON.stringify(data[0])
    );

    return data[0];
  }

  localStorage.setItem(
    roomKey(room.id),
    JSON.stringify(room)
  );

  return room;
}

export async function getRoom(roomId) {
  const { data, error } = await supabase
    .from('nova_baseball_rooms')
    .select('*')
    .eq('id', roomId)
    .maybeSingle();

  if (!error && data) {
    localStorage.setItem(
      roomKey(roomId),
      JSON.stringify(data)
    );

    return data;
  }

  try {
    return JSON.parse(
      localStorage.getItem(roomKey(roomId)) || 'null'
    );
  } catch {
    return null;
  }
}

export async function joinRoom(roomId, player) {
  const room = await getRoom(roomId);

  if (!room) {
    throw new Error('Room not found.');
  }

  const players = Array.isArray(room.players)
    ? room.players
    : [];

  if (
    players.length >= Number(room.max_players || 2) &&
    !players.some((p) => p.id === player.id)
  ) {
    throw new Error('This room is full.');
  }

  const nextPlayers = players.some(
    (p) => p.id === player.id
  )
    ? players.map((p) =>
        p.id === player.id
          ? { ...p, ...player }
          : p
      )
    : [
        ...players,
        {
          ...player,
          ready: false
        }
      ];

  return updateRoom(roomId, {
    players: nextPlayers,
    updated_at: new Date().toISOString()
  });
}

export async function leaveRoom(roomId, playerId) {
  const room = await getRoom(roomId);

  if (!room) {
    return null;
  }

  return updateRoom(roomId, {
    players: (room.players || []).filter(
      (p) => p.id !== playerId
    ),
    updated_at: new Date().toISOString()
  });
}

export async function setPlayerReady(
  roomId,
  playerId,
  ready
) {
  const room = await getRoom(roomId);

  if (!room) {
    throw new Error('Room not found.');
  }

  return updateRoom(roomId, {
    players: (room.players || []).map((p) =>
      p.id === playerId
        ? {
            ...p,
            ready
          }
        : p
    ),
    updated_at: new Date().toISOString()
  });
}

export async function updateRoom(roomId, patch) {
  const { data, error } = await supabase
    .from('nova_baseball_rooms')
    .update(patch)
    .eq('id', roomId)
    .select();

  if (!error && data?.[0]) {
    localStorage.setItem(
      roomKey(roomId),
      JSON.stringify(data[0])
    );

    return data[0];
  }

  const existing = await getRoom(roomId);

  const next = {
    ...(existing || {}),
    ...patch,
    id: roomId,
    updated_at: new Date().toISOString()
  };

  localStorage.setItem(
    roomKey(roomId),
    JSON.stringify(next)
  );

  return next;
}

export async function startRoom(
  roomId,
  gameState
) {
  return updateRoom(roomId, {
    status: 'live',
    state: gameState,
    updated_at: new Date().toISOString()
  });
}

export async function finishRoom(
  roomId,
  gameState
) {
  return updateRoom(roomId, {
    status: 'finished',
    state: gameState,
    updated_at: new Date().toISOString()
  });
}

export function subscribeToRoom(
  roomId,
  callback,
  interval = 2500
) {
  let stopped = false;
  let lastUpdated = null;

  const poll = async () => {
    if (stopped) {
      return;
    }

    const room = await getRoom(roomId);

    if (
      room &&
      room.updated_at !== lastUpdated
    ) {
      lastUpdated = room.updated_at;
      callback(room);
    }
  };

  poll();

  const timer = setInterval(
    poll,
    interval
  );

  return () => {
    stopped = true;
    clearInterval(timer);
  };
}

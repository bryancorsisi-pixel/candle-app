'use client';

import { useEffect, useState } from 'react';
import { getSupabaseBrowserClient } from './supabaseClient';

// Contagem de usuários online em tempo real (seção 6 do doc de
// arquitetura), via Supabase Realtime Presence — nunca um número fixo no
// código. Cada aba aberta no site "anuncia presença" nesse canal; o
// Supabase mantém a contagem de conexões ativas do lado do servidor e
// remove automaticamente quem fecha a aba ou perde conexão.
export function usePresenceCount(channelName = 'online-users') {
  const [count, setCount] = useState(null);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    const channel = supabase.channel(channelName, {
      config: { presence: { key: crypto.randomUUID() } },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        setCount(Object.keys(state).length);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ online_at: new Date().toISOString() });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [channelName]);

  return count;
}

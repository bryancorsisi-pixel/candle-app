export function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const ID_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sem 0/O/1/I, pra evitar confusão

export function randomPublicId() {
  let suffix = '';
  for (let i = 0; i < 4; i++) suffix += ID_CHARS[Math.floor(Math.random() * ID_CHARS.length)];
  return `CNDL-${suffix}`;
}

// Gera um id_publico único, tentando de novo em caso de colisão (rara,
// mas possível com sufixo de 4 caracteres).
export async function generateUniquePublicId(supabaseAdmin) {
  for (let attempt = 0; attempt < 8; attempt++) {
    const candidate = randomPublicId();
    const { data } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('id_publico', candidate)
      .maybeSingle();
    if (!data) return candidate;
  }
  throw new Error('Não foi possível gerar um ID público único. Tente de novo.');
}

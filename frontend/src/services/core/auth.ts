// O token JWT é transmitido via cookie HttpOnly pelo backend.
// Aqui guardamos apenas uma flag de sessão (sem o token em si) para que o
// frontend saiba se o usuário está logado sem precisar ler cookies.
// O token retornado no corpo do login é mantido em memória para uso exclusivo
// do Socket.IO, que não suporta cookies HttpOnly nativamente.

const SESSION_FLAG_KEY = 'auth_session';

/** Sinalizador em memória para Socket.IO — não persiste entre reloads */
let _socketToken: string | null = null;

export const setAuthToken = (token: string): void => {
  // Marca a sessão como autenticada
  sessionStorage.setItem(SESSION_FLAG_KEY, '1');
  // Guarda o token em memória para Socket.IO (não vai para storage persistente)
  _socketToken = token;
};

export const removeAuthToken = (): void => {
  sessionStorage.removeItem(SESSION_FLAG_KEY);
  _socketToken = null;
};

/**
 * Retorna '1' se há sessão ativa, null caso contrário.
 * NÃO retorna o token JWT — use getSocketToken() para Socket.IO.
 */
export const getAuthToken = (): string | null => {
  return sessionStorage.getItem(SESSION_FLAG_KEY);
};

/** Token JWT em memória — uso exclusivo para autenticação Socket.IO */
export const getSocketToken = (): string | null => _socketToken;

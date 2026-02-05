import { SessionData } from './types';

/**
 * Interface pour le stockage des sessions
 * Permet d'utiliser différentes implémentations (Redis, Memory, etc.)
 */
export interface SessionStore {
  /**
   * Stocke une session
   */
  set(sessionId: string, session: SessionData, ttlSeconds: number): Promise<void>;

  /**
   * Récupère une session
   */
  get(sessionId: string): Promise<SessionData | null>;

  /**
   * Supprime une session
   */
  delete(sessionId: string): Promise<void>;

  /**
   * Trouve les sessions d'un utilisateur
   */
  findByUserId(userId: string): Promise<string[]>;

  /**
   * Supprime toutes les sessions expirées
   */
  cleanup?(): Promise<number>;
}

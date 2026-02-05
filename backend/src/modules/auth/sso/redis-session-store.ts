import Redis from 'ioredis';
import { SessionStore } from './session-store.interface';
import { SessionData } from './types';

/**
 * Implémentation Redis du stockage de sessions
 */
export class RedisSessionStore implements SessionStore {
  private readonly redis: Redis;
  private readonly keyPrefix = 'sso:session:';
  private readonly userIndexPrefix = 'sso:user:';

  constructor(redisUrl: string) {
    this.redis = new Redis(redisUrl, {
      retryStrategy: (times: number) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      maxRetriesPerRequest: 3,
    });

    this.redis.on('error', (error) => {
      console.error('Redis session store error:', error);
    });

    this.redis.on('connect', () => {
      console.log('Redis session store connected');
    });
  }

  /**
   * Stocke une session dans Redis avec TTL
   */
  async set(sessionId: string, session: SessionData, ttlSeconds: number): Promise<void> {
    const key = this.getSessionKey(sessionId);
    const userIndexKey = this.getUserIndexKey(session.userId);

    try {
      // Stocke la session avec TTL
      await this.redis.setex(key, ttlSeconds, JSON.stringify(session));

      // Ajoute l'ID de session à l'index utilisateur
      await this.redis.sadd(userIndexKey, sessionId);

      // Définit le TTL sur l'index utilisateur aussi
      await this.redis.expire(userIndexKey, ttlSeconds);
    } catch (error: any) {
      console.error('Failed to store session:', error.message);
      throw new Error(`Session store error: ${error.message}`);
    }
  }

  /**
   * Récupère une session depuis Redis
   */
  async get(sessionId: string): Promise<SessionData | null> {
    const key = this.getSessionKey(sessionId);

    try {
      const data = await this.redis.get(key);

      if (!data) {
        return null;
      }

      return JSON.parse(data) as SessionData;
    } catch (error: any) {
      console.error('Failed to get session:', error.message);
      return null;
    }
  }

  /**
   * Supprime une session de Redis
   */
  async delete(sessionId: string): Promise<void> {
    const key = this.getSessionKey(sessionId);

    try {
      // Récupère la session pour obtenir l'userId
      const session = await this.get(sessionId);

      // Supprime la session
      await this.redis.del(key);

      // Supprime de l'index utilisateur si la session existe
      if (session) {
        const userIndexKey = this.getUserIndexKey(session.userId);
        await this.redis.srem(userIndexKey, sessionId);
      }
    } catch (error: any) {
      console.error('Failed to delete session:', error.message);
      throw new Error(`Session delete error: ${error.message}`);
    }
  }

  /**
   * Trouve toutes les sessions d'un utilisateur
   */
  async findByUserId(userId: string): Promise<string[]> {
    const userIndexKey = this.getUserIndexKey(userId);

    try {
      const sessionIds = await this.redis.smembers(userIndexKey);
      return sessionIds;
    } catch (error: any) {
      console.error('Failed to find sessions by user:', error.message);
      return [];
    }
  }

  /**
   * Nettoie les sessions expirées (Redis le fait automatiquement avec TTL)
   * Cette méthode nettoie les orphelins dans les index utilisateur
   */
  async cleanup(): Promise<number> {
    let cleaned = 0;

    try {
      // Trouve tous les index utilisateur
      const userKeys = await this.redis.keys(`${this.userIndexPrefix}*`);

      for (const userKey of userKeys) {
        const sessionIds = await this.redis.smembers(userKey);

        for (const sessionId of sessionIds) {
          const sessionKey = this.getSessionKey(sessionId);
          const exists = await this.redis.exists(sessionKey);

          if (!exists) {
            // Session expirée mais encore dans l'index
            await this.redis.srem(userKey, sessionId);
            cleaned++;
          }
        }

        // Supprime l'index utilisateur s'il est vide
        const count = await this.redis.scard(userKey);
        if (count === 0) {
          await this.redis.del(userKey);
        }
      }

      return cleaned;
    } catch (error: any) {
      console.error('Failed to cleanup sessions:', error.message);
      return cleaned;
    }
  }

  /**
   * Ferme la connexion Redis
   */
  async close(): Promise<void> {
    await this.redis.quit();
  }

  /**
   * Vérifie la connexion Redis
   */
  async ping(): Promise<boolean> {
    try {
      const result = await this.redis.ping();
      return result === 'PONG';
    } catch (error) {
      return false;
    }
  }

  private getSessionKey(sessionId: string): string {
    return `${this.keyPrefix}${sessionId}`;
  }

  private getUserIndexKey(userId: string): string {
    return `${this.userIndexPrefix}${userId}`;
  }
}

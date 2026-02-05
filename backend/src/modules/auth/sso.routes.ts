import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import * as crypto from 'crypto';
import { config } from '../../config';
import {
  JumpCloudOidcService,
  SessionService,
  RoleSelectorService,
  AuditService,
  RedisSessionStore,
  SsoConfig,
  PkceData,
} from './sso';

// Interface pour les données PKCE temporaires (stockées en Redis)
interface PkceState {
  codeVerifier: string;
  state: string;
  timestamp: number;
}

/**
 * Routes SSO pour l'authentification JumpCloud
 */
export async function ssoRoutes(app: FastifyInstance) {
  // Initialisation des services SSO
  const ssoConfig: SsoConfig = {
    clientId: config.sso.clientId,
    clientSecret: config.sso.clientSecret,
    orgId: config.sso.orgId,
    callbackUrl: config.sso.callbackUrl,
    issuer: config.sso.issuer,
    authorizationEndpoint: config.sso.authorizationEndpoint,
    tokenEndpoint: config.sso.tokenEndpoint,
    userInfoEndpoint: config.sso.userInfoEndpoint,
    jwksUri: config.sso.jwksUri,
    endSessionEndpoint: config.sso.endSessionEndpoint,
    revocationEndpoint: config.sso.revocationEndpoint,
    scopes: config.sso.scopes,
    roleMapping: config.sso.roleMapping,
    roleHierarchy: config.sso.roleHierarchy,
    defaultRole: config.sso.defaultRole,
    allowRoleSelection: config.sso.allowRoleSelection,
    sessionTtlSeconds: config.sso.sessionTtlSeconds,
    sessionCookieName: config.sso.sessionCookieName,
  };

  const sessionStore = new RedisSessionStore(config.redis.url);
  const oidcService = new JumpCloudOidcService(ssoConfig);
  const sessionService = new SessionService(ssoConfig, sessionStore);
  const roleSelectorService = new RoleSelectorService(ssoConfig);
  const auditService = new AuditService(ssoConfig);

  /**
   * GET /auth/sso/login
   * Initie le flow d'authentification JumpCloud
   */
  app.get('/auth/sso/login', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      // Génère PKCE
      const pkce: PkceData = oidcService.generatePkce();
      const state = crypto.randomBytes(16).toString('base64url');

      // Stocke PKCE dans Redis (expire dans 10 minutes)
      const pkceState: PkceState = {
        codeVerifier: pkce.codeVerifier,
        state,
        timestamp: Date.now(),
      };
      await sessionStore.set(`pkce:${state}`, pkceState as any, 600);

      // Génère l'URL d'autorisation
      const authUrl = oidcService.getAuthorizationUrl({
        codeChallenge: pkce.codeChallenge,
        state,
      });

      await auditService.log({
        eventType: 'LOGIN_INITIATED' as any,
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'],
        success: true,
      });

      // Redirige vers JumpCloud
      return reply.redirect(authUrl);
    } catch (error: any) {
      app.log.error('SSO login initiation failed:', error);
      await auditService.logLoginFailed({
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'],
        errorMessage: error.message,
      });
      return reply.status(500).send({
        error: 'Authentication initiation failed',
        message: error.message,
      });
    }
  });

  /**
   * GET /auth/sso/callback
   * Callback OIDC après authentification JumpCloud
   */
  app.get(
    '/auth/sso/callback',
    async (
      request: FastifyRequest<{
        Querystring: { code?: string; state?: string; error?: string };
      }>,
      reply: FastifyReply,
    ) => {
      try {
        const { code, state, error } = request.query;

        // Vérifie les erreurs OAuth
        if (error) {
          throw new Error(`OAuth error: ${error}`);
        }

        if (!code || !state) {
          throw new Error('Missing code or state parameter');
        }

        // Récupère PKCE depuis Redis
        const pkceState = (await sessionStore.get(`pkce:${state}`)) as any as PkceState | null;
        if (!pkceState) {
          throw new Error('Invalid or expired state parameter');
        }

        // Supprime PKCE de Redis
        await sessionStore.delete(`pkce:${state}`);

        // Échange le code contre des tokens
        const tokens = await oidcService.exchangeCode(code, pkceState.codeVerifier);

        // Valide l'ID token
        await oidcService.validateIdToken(tokens.id_token);

        // Récupère les infos utilisateur
        const userInfo = await oidcService.getUserInfo(tokens.access_token);

        // Détermine les rôles disponibles
        const availableRoles = roleSelectorService.getRolesForGroups(userInfo.groups);

        if (availableRoles.length === 0) {
          throw new Error('User has no roles assigned');
        }

        // Crée la session
        const session = await sessionService.createSession({
          userId: userInfo.sub,
          email: userInfo.email,
          name: userInfo.name,
          groups: userInfo.groups,
          availableRoles,
          accessToken: tokens.access_token,
          idToken: tokens.id_token,
          refreshToken: tokens.refresh_token,
          tokenExpiresIn: tokens.expires_in,
          ipAddress: request.ip,
          userAgent: request.headers['user-agent'],
        });

        // Configure le cookie de session
        const cookieOptions = sessionService.getCookieOptions();
        reply.setCookie(cookieOptions.name, session.sessionId, {
          httpOnly: cookieOptions.httpOnly,
          secure: cookieOptions.secure,
          sameSite: cookieOptions.sameSite,
          maxAge: cookieOptions.maxAge,
          path: '/',
        });

        // Log l'événement
        await auditService.logLoginSuccess({
          userId: session.userId,
          email: session.email,
          sessionId: session.sessionId,
          ipAddress: request.ip,
          userAgent: request.headers['user-agent'],
          role: session.currentRole,
        });

        // Si sélection de rôle requise, redirige vers page de sélection
        if (!session.roleSelected) {
          return reply.redirect(`${config.sso.frontendUrl}/auth/role-selection`);
        }

        // Sinon redirige vers l'application
        return reply.redirect(config.sso.frontendUrl);
      } catch (error: any) {
        app.log.error('SSO callback failed:', error);
        await auditService.logLoginFailed({
          ipAddress: request.ip,
          userAgent: request.headers['user-agent'],
          errorMessage: error.message,
        });
        return reply.redirect(`${config.sso.frontendUrl}/auth/error?message=${encodeURIComponent(error.message)}`);
      }
    },
  );

  /**
   * POST /auth/sso/role
   * Sélection de rôle (multi-rôles)
   */
  app.post(
    '/auth/sso/role',
    async (
      request: FastifyRequest<{
        Body: { role: string };
      }>,
      reply: FastifyReply,
    ) => {
      try {
        // Récupère la session depuis le cookie
        const cookieOptions = sessionService.getCookieOptions();
        const sessionId = request.cookies[cookieOptions.name];

        if (!sessionId) {
          return reply.status(401).send({ error: 'No active session' });
        }

        const session = await sessionService.getSession(sessionId);
        if (!session) {
          return reply.status(401).send({ error: 'Invalid session' });
        }

        const { role } = request.body;

        if (!role) {
          return reply.status(400).send({ error: 'Role is required' });
        }

        // Valide le rôle
        if (!roleSelectorService.validateRole(role, session.availableRoles)) {
          return reply.status(400).send({
            error: 'Invalid role',
            availableRoles: session.availableRoles,
          });
        }

        // Sélectionne le rôle
        const updatedSession = await sessionService.selectRole(sessionId, role);

        // Log l'événement
        await auditService.logRoleSelected({
          userId: updatedSession.userId,
          email: updatedSession.email,
          sessionId: updatedSession.sessionId,
          role,
          ipAddress: request.ip,
        });

        return reply.send({
          success: true,
          session: {
            userId: updatedSession.userId,
            email: updatedSession.email,
            name: updatedSession.name,
            currentRole: updatedSession.currentRole,
            availableRoles: updatedSession.availableRoles,
          },
        });
      } catch (error: any) {
        app.log.error('Role selection failed:', error);
        return reply.status(500).send({
          error: 'Role selection failed',
          message: error.message,
        });
      }
    },
  );

  /**
   * GET /auth/sso/session
   * Récupère les informations de session
   */
  app.get('/auth/sso/session', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const cookieOptions = sessionService.getCookieOptions();
      const sessionId = request.cookies[cookieOptions.name];

      if (!sessionId) {
        return reply.status(401).send({ error: 'No active session' });
      }

      const session = await sessionService.getSession(sessionId);
      if (!session) {
        return reply.status(401).send({ error: 'Invalid session' });
      }

      // Vérifie si le token est expiré
      if (sessionService.isTokenExpired(session)) {
        // Tente de rafraîchir le token
        if (session.refreshToken) {
          try {
            const tokens = await oidcService.refreshTokens(session.refreshToken);
            await sessionService.updateTokens(
              sessionId,
              tokens.access_token,
              tokens.id_token,
              tokens.refresh_token,
              tokens.expires_in,
            );

            await auditService.logTokenRefresh({
              userId: session.userId,
              sessionId: session.sessionId,
              success: true,
            });
          } catch (error: any) {
            await auditService.logTokenRefresh({
              userId: session.userId,
              sessionId: session.sessionId,
              success: false,
              errorMessage: error.message,
            });
            return reply.status(401).send({ error: 'Token refresh failed' });
          }
        } else {
          return reply.status(401).send({ error: 'Token expired' });
        }
      }

      return reply.send({
        userId: session.userId,
        email: session.email,
        name: session.name,
        currentRole: session.currentRole,
        availableRoles: session.availableRoles,
        roleSelected: session.roleSelected,
        groups: session.groups,
      });
    } catch (error: any) {
      app.log.error('Get session failed:', error);
      return reply.status(500).send({
        error: 'Failed to get session',
        message: error.message,
      });
    }
  });

  /**
   * GET /auth/sso/logout
   * Déconnexion SSO
   */
  app.get('/auth/sso/logout', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const cookieOptions = sessionService.getCookieOptions();
      const sessionId = request.cookies[cookieOptions.name];

      if (sessionId) {
        const session = await sessionService.getSession(sessionId);

        if (session) {
          // Révoque le token dans JumpCloud
          if (session.accessToken) {
            await oidcService.revokeToken(session.accessToken, 'access_token');
          }

          // Log l'événement
          await auditService.logLogout({
            userId: session.userId,
            email: session.email,
            sessionId: session.sessionId,
            ipAddress: request.ip,
          });

          // Révoque la session locale
          await sessionService.revokeSession(sessionId);
        }

        // Supprime le cookie
        reply.clearCookie(cookieOptions.name, { path: '/' });
      }

      // Construit l'URL de déconnexion JumpCloud
      const logoutUrl = oidcService.getLogoutUrl({
        postLogoutRedirectUri: config.sso.frontendUrl,
      });

      return reply.redirect(logoutUrl);
    } catch (error: any) {
      app.log.error('SSO logout failed:', error);
      return reply.status(500).send({
        error: 'Logout failed',
        message: error.message,
      });
    }
  });

  /**
   * GET /auth/sso/roles
   * Liste les options de rôles disponibles pour l'utilisateur
   */
  app.get('/auth/sso/roles', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const cookieOptions = sessionService.getCookieOptions();
      const sessionId = request.cookies[cookieOptions.name];

      if (!sessionId) {
        return reply.status(401).send({ error: 'No active session' });
      }

      const session = await sessionService.getSession(sessionId);
      if (!session) {
        return reply.status(401).send({ error: 'Invalid session' });
      }

      const roleOptions = roleSelectorService.getRoleOptionsForUi(session.availableRoles);

      return reply.send({
        roles: roleOptions,
        currentRole: session.currentRole,
        requiresSelection: !session.roleSelected,
      });
    } catch (error: any) {
      app.log.error('Get roles failed:', error);
      return reply.status(500).send({
        error: 'Failed to get roles',
        message: error.message,
      });
    }
  });
}

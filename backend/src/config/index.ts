import 'dotenv/config';

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  logLevel: process.env.LOG_LEVEL || 'info',

  database: {
    url: process.env.DATABASE_URL!,
  },

  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },

  jwt: {
    secret: process.env.JWT_SECRET!,
    accessTokenExpiry: '1h',
    refreshTokenExpiry: '7d',
  },

  security: {
    masterKey: Buffer.from(process.env.MASTER_KEY || '', 'base64'),
    bcryptRounds: 10,
  },

  s3: {
    endpoint: process.env.S3_ENDPOINT || 'http://localhost:9000',
    accessKey: process.env.S3_ACCESS_KEY || 'minioadmin',
    secretKey: process.env.S3_SECRET_KEY || 'minioadmin',
    bucket: process.env.S3_BUCKET || 'testforge-artifacts',
  },

  cors: {
    origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:5173'],
  },

  sso: {
    clientId: process.env.JUMPCLOUD_CLIENT_ID || '',
    clientSecret: process.env.JUMPCLOUD_CLIENT_SECRET || '',
    orgId: process.env.JUMPCLOUD_ORG_ID || '',
    callbackUrl: process.env.JUMPCLOUD_CALLBACK_URL || 'http://localhost:3000/auth/sso/callback',
    issuer: 'https://oauth.id.jumpcloud.com',
    authorizationEndpoint: 'https://oauth.id.jumpcloud.com/oauth2/auth',
    tokenEndpoint: 'https://oauth.id.jumpcloud.com/oauth2/token',
    userInfoEndpoint: 'https://oauth.id.jumpcloud.com/userinfo',
    jwksUri: 'https://oauth.id.jumpcloud.com/.well-known/jwks.json',
    endSessionEndpoint: 'https://oauth.id.jumpcloud.com/oauth2/sessions/logout',
    revocationEndpoint: 'https://oauth.id.jumpcloud.com/oauth2/revoke',
    scopes: ['openid', 'profile', 'email', 'groups'],
    roleMapping: {
      [process.env.SSO_GROUP_SUPER_ADMIN || 'secuaas-super-admins']: 'SUPER_ADMIN',
      [process.env.SSO_GROUP_ADMIN || 'secuaas-admins']: 'ADMIN',
      [process.env.SSO_GROUP_USER || 'secuaas-users']: 'USER',
    },
    roleHierarchy: ['SUPER_ADMIN', 'ADMIN', 'USER'],
    defaultRole: 'USER',
    allowRoleSelection: true,
    sessionTtlSeconds: 86400, // 24 heures
    sessionCookieName: 'testforge_sso_session',
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  },
};

// Validate required config
const requiredEnvVars = ['DATABASE_URL', 'JWT_SECRET', 'MASTER_KEY'];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

if (config.security.masterKey.length !== 32) {
  throw new Error('MASTER_KEY must be a base64-encoded 32-byte string');
}

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

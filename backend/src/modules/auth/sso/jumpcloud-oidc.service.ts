import axios, { AxiosInstance } from 'axios';
import * as crypto from 'crypto';
import * as jose from 'jose';
import {
  SsoConfig,
  PkceData,
  TokenResponse,
  UserInfo,
  OidcDiscoveryResponse,
} from './types';

export class JumpCloudOidcService {
  private readonly baseUrl = 'https://oauth.id.jumpcloud.com';
  private readonly httpClient: AxiosInstance;
  private jwksCache: jose.JWTVerifyGetKey | null = null;
  private discoveryCache: OidcDiscoveryResponse | null = null;

  constructor(private readonly config: SsoConfig) {
    this.httpClient = axios.create({
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Génère les données PKCE pour l'authentification
   */
  generatePkce(): PkceData {
    const codeVerifier = crypto.randomBytes(64).toString('base64url');
    const codeChallenge = crypto
      .createHash('sha256')
      .update(codeVerifier)
      .digest('base64url');

    return {
      codeVerifier,
      codeChallenge,
      codeChallengeMethod: 'S256',
    };
  }

  /**
   * Construit l'URL d'autorisation JumpCloud
   */
  getAuthorizationUrl(params: {
    codeChallenge: string;
    state: string;
    redirectUri?: string;
  }): string {
    const redirectUri = params.redirectUri || this.config.callbackUrl;

    const queryParams = new URLSearchParams({
      client_id: this.config.clientId,
      response_type: 'code',
      scope: this.config.scopes.join(' '),
      redirect_uri: redirectUri,
      state: params.state,
      code_challenge: params.codeChallenge,
      code_challenge_method: 'S256',
    });

    return `${this.config.authorizationEndpoint}?${queryParams.toString()}`;
  }

  /**
   * Échange le code d'autorisation contre des tokens
   */
  async exchangeCode(
    code: string,
    codeVerifier: string,
    redirectUri?: string,
  ): Promise<TokenResponse> {
    const tokenEndpoint = this.config.tokenEndpoint;
    const uri = redirectUri || this.config.callbackUrl;

    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: uri,
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      code_verifier: codeVerifier,
    });

    try {
      const response = await this.httpClient.post<TokenResponse>(
        tokenEndpoint,
        params.toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        },
      );

      return response.data;
    } catch (error: any) {
      console.error('Token exchange failed:', error.response?.data || error.message);
      throw new Error(`Failed to exchange authorization code: ${error.message}`);
    }
  }

  /**
   * Rafraîchit les tokens avec un refresh token
   */
  async refreshTokens(refreshToken: string): Promise<TokenResponse> {
    const tokenEndpoint = this.config.tokenEndpoint;

    const params = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
    });

    try {
      const response = await this.httpClient.post<TokenResponse>(
        tokenEndpoint,
        params.toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        },
      );

      return response.data;
    } catch (error: any) {
      console.error('Token refresh failed:', error.response?.data || error.message);
      throw new Error(`Failed to refresh token: ${error.message}`);
    }
  }

  /**
   * Récupère les informations utilisateur depuis JumpCloud
   */
  async getUserInfo(accessToken: string): Promise<UserInfo> {
    const userInfoEndpoint = this.config.userInfoEndpoint;

    try {
      const response = await this.httpClient.get(userInfoEndpoint, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const data = response.data;

      return {
        sub: data.sub,
        email: data.email,
        name: data.name || data.email,
        groups: data.groups || [],
        rawClaims: data,
      };
    } catch (error: any) {
      console.error('Get user info failed:', error.response?.data || error.message);
      throw new Error(`Failed to get user info: ${error.message}`);
    }
  }

  /**
   * Valide l'ID token JWT
   */
  async validateIdToken(idToken: string): Promise<Record<string, any>> {
    try {
      // Initialise le cache JWKS si nécessaire
      if (!this.jwksCache) {
        const jwksUri = this.config.jwksUri;
        this.jwksCache = jose.createRemoteJWKSet(new URL(jwksUri));
      }

      // Vérifie et décode le JWT
      const { payload } = await jose.jwtVerify(idToken, this.jwksCache, {
        issuer: this.config.issuer,
        audience: this.config.clientId,
      });

      return payload as Record<string, any>;
    } catch (error: any) {
      console.error('ID token validation failed:', error.message);
      throw new Error(`Failed to validate ID token: ${error.message}`);
    }
  }

  /**
   * Découvre les endpoints OIDC via .well-known
   */
  async discoverOidcEndpoints(): Promise<OidcDiscoveryResponse> {
    if (this.discoveryCache) {
      return this.discoveryCache;
    }

    const discoveryUrl = `${this.baseUrl}/.well-known/openid-configuration`;

    try {
      const response = await this.httpClient.get<OidcDiscoveryResponse>(discoveryUrl);
      this.discoveryCache = response.data;
      return response.data;
    } catch (error: any) {
      console.error('OIDC discovery failed:', error.message);
      throw new Error(`Failed to discover OIDC endpoints: ${error.message}`);
    }
  }

  /**
   * Révoque un token (access ou refresh)
   */
  async revokeToken(token: string, tokenTypeHint?: 'access_token' | 'refresh_token'): Promise<void> {
    const revocationEndpoint = this.config.revocationEndpoint;

    if (!revocationEndpoint) {
      console.warn('Revocation endpoint not configured, skipping token revocation');
      return;
    }

    const params = new URLSearchParams({
      token,
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
    });

    if (tokenTypeHint) {
      params.append('token_type_hint', tokenTypeHint);
    }

    try {
      await this.httpClient.post(revocationEndpoint, params.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });
    } catch (error: any) {
      console.error('Token revocation failed:', error.response?.data || error.message);
      // Ne pas throw car la révocation peut échouer si le token est déjà expiré
    }
  }

  /**
   * Construit l'URL de déconnexion JumpCloud
   */
  getLogoutUrl(params: { idTokenHint?: string; postLogoutRedirectUri?: string }): string {
    const endSessionEndpoint = this.config.endSessionEndpoint;

    if (!endSessionEndpoint) {
      // Fallback: simple redirection vers la page de login
      return this.config.authorizationEndpoint;
    }

    const queryParams = new URLSearchParams();

    if (params.idTokenHint) {
      queryParams.append('id_token_hint', params.idTokenHint);
    }

    if (params.postLogoutRedirectUri) {
      queryParams.append('post_logout_redirect_uri', params.postLogoutRedirectUri);
    }

    const query = queryParams.toString();
    return query ? `${endSessionEndpoint}?${query}` : endSessionEndpoint;
  }
}

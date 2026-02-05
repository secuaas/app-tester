import { SsoConfig, RoleOption } from './types';

/**
 * Service de sélection et validation de rôles
 */
export class RoleSelectorService {
  private readonly roleIndex: Map<string, number> = new Map();

  constructor(private readonly config: SsoConfig) {
    // Crée un index de priorité des rôles
    if (this.config.roleHierarchy) {
      this.config.roleHierarchy.forEach((role, index) => {
        this.roleIndex.set(role, index);
      });
    }
  }

  /**
   * Convertit les groupes JumpCloud en rôles applicatifs
   */
  getRolesForGroups(groups: string[]): string[] {
    if (!this.config.roleMapping) {
      return [];
    }

    const roles = new Set<string>();
    for (const group of groups) {
      const role = this.config.roleMapping[group];
      if (role) {
        roles.add(role);
      }
    }

    // Si aucun rôle trouvé et un rôle par défaut est configuré
    if (roles.size === 0 && this.config.defaultRole) {
      roles.add(this.config.defaultRole);
    }

    // Trie par priorité si une hiérarchie existe
    if (this.config.roleHierarchy) {
      return Array.from(roles).sort((a, b) => {
        const priorityA = this.roleIndex.get(a) ?? 999;
        const priorityB = this.roleIndex.get(b) ?? 999;
        return priorityA - priorityB;
      });
    }

    return Array.from(roles);
  }

  /**
   * Vérifie si la sélection de rôle est requise
   */
  requiresRoleSelection(roles: string[]): boolean {
    if (this.config.allowRoleSelection === false) {
      return false;
    }
    return roles.length > 1;
  }

  /**
   * Retourne le rôle de plus haute priorité
   */
  getHighestPriorityRole(roles: string[]): string | undefined {
    if (roles.length === 0) {
      return undefined;
    }

    if (!this.config.roleHierarchy) {
      return roles[0];
    }

    return roles.sort((a, b) => {
      const priorityA = this.roleIndex.get(a) ?? 999;
      const priorityB = this.roleIndex.get(b) ?? 999;
      return priorityA - priorityB;
    })[0];
  }

  /**
   * Valide qu'un rôle est disponible pour l'utilisateur
   */
  validateRole(role: string, availableRoles: string[]): boolean {
    return availableRoles.includes(role);
  }

  /**
   * Vérifie si un rôle inclut un autre rôle (basé sur la hiérarchie)
   */
  roleIncludes(role: string, targetRole: string): boolean {
    if (role === targetRole) {
      return true;
    }

    if (!this.config.roleHierarchy) {
      return false;
    }

    const rolePriority = this.roleIndex.get(role) ?? 999;
    const targetPriority = this.roleIndex.get(targetRole) ?? 999;

    // Un rôle de priorité plus haute (index plus bas) inclut les rôles de priorité plus basse
    return rolePriority <= targetPriority;
  }

  /**
   * Génère les options de rôles pour l'interface de sélection
   */
  getRoleOptionsForUi(availableRoles: string[]): RoleOption[] {
    return availableRoles.map((role) => ({
      name: role,
      displayName: this.formatRoleName(role),
      description: this.getRoleDescription(role),
    }));
  }

  private formatRoleName(role: string): string {
    return role
      .replace(/-/g, ' ')
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase());
  }

  private getRoleDescription(role: string): string {
    const descriptions: Record<string, string> = {
      'SUPER_ADMIN': 'Accès complet à toutes les fonctionnalités du système',
      'super-admin': 'Accès complet à toutes les fonctionnalités du système',
      'ADMIN': "Accès aux fonctions d'administration de l'application",
      'admin': "Accès aux fonctions d'administration de l'application",
      'USER': "Accès standard à l'application",
      'user': "Accès standard à l'application",
      'MANAGER': "Accès aux fonctions de gestion d'équipe",
      'manager': "Accès aux fonctions de gestion d'équipe",
      'VIEWER': 'Accès en lecture seule',
      'viewer': 'Accès en lecture seule',
    };
    return descriptions[role] || '';
  }
}

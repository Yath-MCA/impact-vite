const ADMIN_PERMISSIONS = new Set([
  'manage_config',
  'manage_users',
  'debug',
  'view_logs'
]);

export const hasMenuPermission = (permissions, { isAuthenticated, isAdmin }) => {
  if (!permissions || permissions.length === 0) {
    return isAuthenticated;
  }

  return permissions.every((permission) => {
    if (ADMIN_PERMISSIONS.has(permission)) {
      return isAdmin;
    }
    return isAuthenticated;
  });
};

export const filterMenuItemsByPermission = (items, authState) => {
  if (!items || items.length === 0) {
    return [];
  }

  return items
    .filter((item) => hasMenuPermission(item.permissions, authState))
    .map((item) => ({
      ...item,
      subItems: item.subItems
        ? filterMenuItemsByPermission(item.subItems, authState)
        : undefined
    }));
};

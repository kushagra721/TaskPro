/** OWNER has every right ADMIN has (plus exclusively editing/deleting the
 *  workspace itself, gated separately by checking `role === 'OWNER'`) —
 *  everywhere else that used to check `role === 'ADMIN'` should use this. */
export const isAdminRole = (role) => role === 'ADMIN' || role === 'OWNER';

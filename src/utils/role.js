/** OWNER has every right ADMIN has (plus exclusively editing/deleting the
 *  workspace itself, gated separately via `requireOrgOwner`) — everywhere
 *  else that used to check `role === 'ADMIN'` should use this instead.
 *
 *  CLIENT is deliberately absent: it is an external role carrying MEMBER's
 *  rights, so every admin-or-better check keeps a client out untouched. */
export const isAdminRole = (role) => role === 'ADMIN' || role === 'OWNER';

/** CLIENT — the customer the work is being done for, taking part in the
 *  workspace from outside the team.
 *
 *  Permissions are MEMBER's, exactly. What differs is what they are SHOWN: the
 *  Hub's Projects, Clients and Members tabs are hidden, because a supplier's
 *  other clients and its internal project list are not this customer's
 *  business. Treat that as a presentation rule and never as a security boundary
 *  on its own — the underlying endpoints answer a client exactly as they answer
 *  a member, which is what "same MEMBER logic applies" means. */
export const isClientRole = (role) => role === 'CLIENT';

/** Roles an admin may hand out. OWNER is absent because it moves only through
 *  the ownership transfer in `leaveOrganization`, never by direct assignment.
 *  Ordered as the invite form lists them — the default first. */
export const ASSIGNABLE_ROLES = ['MEMBER', 'ADMIN', 'CLIENT'];

/** Display names. Only the frontend copy of this file renders them; it lives
 *  here too so `diff` between the two copies stays empty, which is the only
 *  thing keeping them honest — there is no shared package between the projects. */
export const ROLE_LABEL = {
  OWNER: 'Owner',
  ADMIN: 'Admin',
  MEMBER: 'Member',
  CLIENT: 'Client',
};

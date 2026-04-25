import { ResizableSidebar } from '@/components/resizable-sidebar';
import { UserAvatar } from '@/components/user-avatar';
import { useUserRoles } from '@/features/server/hooks';
import { useRoles } from '@/features/server/roles/hooks';
import { useUsers } from '@/features/server/users/hooks';
import { LocalStorageKey } from '@/helpers/storage';
import { cn } from '@/lib/utils';
import { DELETED_USER_IDENTITY_AND_NAME } from '@sharkord/shared';
import { memo, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { UserPopover } from '../user-popover';

const MAX_USERS_TO_SHOW = 100;
const MIN_WIDTH = 180;
const MAX_WIDTH = 360;
const DEFAULT_WIDTH = 240; // w-60 = 240px

type TUserProps = {
  userId: number;
  name: string;
  banned: boolean;
};

type TUserGroup = {
  name: string;
  color?: string;
  users: TUserProps[];
};

const User = memo(({ userId, name, banned }: TUserProps) => {
  const displayedRole = useUserRoles(userId)
    .sort((a, b) => a.orderNr - b.orderNr)
    .find((r) => r.isGrouping === true);
  let roleColor = '#ffffff';
  if (displayedRole) {
    roleColor = displayedRole.color;
  }
  return (
    <UserPopover userId={userId}>
      <div className="flex items-center gap-3 rounded px-2 py-1.5 hover:bg-accent select-none min-w-0">
        <UserAvatar userId={userId} className="h-8 w-8 shrink-0" />
        <span
          className={cn(
            'text-sm text-foreground truncate',
            banned && 'line-through text-muted-foreground'
          )}
        >
          <span style={{ color: roleColor }}>{name}</span>
        </span>
      </div>
    </UserPopover>
  );
});

const UserGroup = memo(({ group }: { group: TUserGroup }) => {
  return (
    <>
      <div className="flex h-12 items-center border-b border-border px-4">
        <h3 className="text-sm font-semibold text-foreground">
          {group.name} — {group.users.length}
        </h3>
      </div>
      <div>
        {group.users.map((user) => (
          <User
            key={user.userId}
            userId={user.userId}
            name={user.name}
            banned={user.banned}
          />
        ))}
      </div>
    </>
  );
});

type TRightSidebarProps = {
  className?: string;
  isOpen?: boolean;
};

const RightSidebar = memo(
  ({ className, isOpen = true }: TRightSidebarProps) => {
    const { t } = useTranslation('sidebar');
    const users = useUsers();
    const visibleUsers = useMemo(
      () =>
        users
          .filter((user) => user.name !== DELETED_USER_IDENTITY_AND_NAME) // hide deleted user placeholder from the sidebar
          .slice(0, MAX_USERS_TO_SHOW),
      [users]
    );
    const roles = useRoles();

    const userGroups: TUserGroup[] = useMemo(() => {
      if (!roles || roles.length === 0 || !visibleUsers) return [];

      const groups: TUserGroup[] = [];

      for (const role of roles) {
        if (!role.isGrouping) continue; // Ignore non Grouping Roles

        const usersInGroup = visibleUsers.filter((user) => {
          if (!user?.roleIds || !Array.isArray(user.roleIds)) return false;

          const userRoles = roles
            .filter((r) => user.roleIds.includes(r.id))
            .sort((a, b) => a.orderNr - b.orderNr); // Get all Roles User has

          const sortingRole = userRoles.find((r) => r.isGrouping === true);

          return sortingRole?.id === role.id;
        });

        if (usersInGroup.length > 0) {
          groups.push({
            name: role.name,
            color: role.color,
            users: usersInGroup.map((u) => ({
              userId: u.id,
              name: u.name,
              banned: u.banned
            }))
          });
        }
      }

      return groups;
    }, [visibleUsers, roles]);

    return (
      <ResizableSidebar
        storageKey={LocalStorageKey.RIGHT_SIDEBAR_WIDTH}
        minWidth={MIN_WIDTH}
        maxWidth={MAX_WIDTH}
        defaultWidth={DEFAULT_WIDTH}
        edge="left"
        isOpen={isOpen}
        className={cn('h-full', className)}
      >
        {isOpen && (
          <>
            <div className="flex-1 overflow-y-auto p-2">
              {userGroups.map((g) => (
                <UserGroup key={g.name} group={g} />
              ))}
            </div>
          </>
        )}
      </ResizableSidebar>
    );
  }
);

export { RightSidebar };

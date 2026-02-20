import { openDialog } from '@/features/dialogs/actions';
import { openServerScreen } from '@/features/server-screens/actions';
import { disconnectFromServer } from '@/features/server/actions';
import { useServerName } from '@/features/server/hooks';
import { cn } from '@/lib/utils';
import { Permission } from '@sharkord/shared';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@sharkord/ui';
import { Menu, ChevronDown } from 'lucide-react';
import { memo, useMemo, useState } from 'react';
import { Dialog } from '../dialogs/dialogs';
import { Protect } from '../protect';
import { ServerScreen } from '../server-screens/screens';
import { Button } from '@sharkord/ui';
import { Categories } from './categories';
import { UserControl } from './user-control';
import { VoiceControl } from './voice-control';
import { PrivateChannels } from './private-messaging'; 

type TLeftSidebarProps = {
  className?: string;
};


const ServerTabSandwich = memo(() => {
    const serverSettingsPermissions = useMemo(
    () => [
      Permission.MANAGE_SETTINGS,
      Permission.MANAGE_ROLES,
      Permission.MANAGE_EMOJIS,
      Permission.MANAGE_STORAGE,
      Permission.MANAGE_USERS,
      Permission.MANAGE_INVITES,
      Permission.MANAGE_UPDATES
    ],
    []
  );
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <Menu className="h-4 w-4 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuLabel>Server</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <Protect permission={Permission.MANAGE_CATEGORIES}>
          <DropdownMenuItem
            onClick={() => openDialog(Dialog.CREATE_CATEGORY)}
          >
            Add Category
          </DropdownMenuItem>
        </Protect>
        <Protect permission={serverSettingsPermissions}>
          <DropdownMenuItem
            onClick={() => openServerScreen(ServerScreen.SERVER_SETTINGS)}
          >
            Server Settings
          </DropdownMenuItem>
          <DropdownMenuSeparator />
        </Protect>
        <DropdownMenuItem onClick={disconnectFromServer}>
          Disconnect
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
});

const LeftSidebar = memo(({ className }: TLeftSidebarProps) => {
  const serverName = useServerName();
  const [tabState, setTabState] = useState(0);
  const tabName = [serverName, "Private Messages"];
  return (
    <aside
      className={cn(
        'flex w-72 flex-col border-r border-border bg-card h-full',
        className
      )}
    >
      <div className="flex w-full justify-between h-12 items-center border-b border-border px-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="flex items-center gap-2 font-semibold text-foreground select-none hover:bg-accent px-2 py-1 rounded-md transition-colors">
              {tabName[tabState]}
              <ChevronDown className="h-4 w-4 opacity-70" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem
              onClick={() => setTabState(0)}
            >
              {serverName}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setTabState(1)}
            >
              Private Messages
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <div>
          <ServerTabSandwich/>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {tabState === 0 ? <Categories /> : <PrivateChannels />}
      </div>
      <VoiceControl />
      <UserControl />
    </aside>
  );
});

export { UserControl } from './user-control';
export { LeftSidebar };

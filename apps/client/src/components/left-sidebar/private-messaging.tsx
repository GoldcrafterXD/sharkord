import { setSelectedChannelId } from '@/features/server/channels/actions';
import {
  useChannelById,
  useChannels,
  useSelectedChannelId
} from '@/features/server/channels/hooks';
import {
  useChannelCan,
  useUnreadMessagesCount,
  useVoiceUsersByChannelId
} from '@/features/server/hooks';
import { useOwnUserId, useUserById } from '@/features/server/users/hooks';
import { getInitialsFromName } from '@/helpers/get-initials-from-name';
import { cn } from '@/lib/utils';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  ChannelPermission,
  type TChannelUserPermission,
  type TJoinedChannel
} from '@sharkord/shared';
import { Avatar, AvatarFallback } from '@sharkord/ui';
import { Phone } from 'lucide-react';
import { memo, useCallback } from 'react';
import { UserAvatar } from '../user-avatar';

type TVoiceProps = Omit<TItemWrapperProps, 'children'> & {
  channel: TJoinedChannel;
};

const Private = memo(({ channel, ...props }: TVoiceProps) => {
  const unreadCount = useUnreadMessagesCount(channel.id);
  const thisChannel = useChannelById(channel.id);
  const ownUserId = useOwnUserId();
  let channelName = thisChannel!.name;
  const hasActiveVoiceCall = useVoiceUsersByChannelId(channel.id).length > 0;
  const accessPrivateChannelPermissions =
    thisChannel!.channelPermissions.filter(
      (channelPermission: TChannelUserPermission) =>
        channelPermission.permission ===
        ChannelPermission.ACCESS_PRIVATE_CHANNEL
    );
  const isNotGroupDm = accessPrivateChannelPermissions.length === 2;
  let otherUserId: number | undefined;

  if (isNotGroupDm) {
    otherUserId = accessPrivateChannelPermissions.find(
      (channelPermission: TChannelUserPermission) =>
        channelPermission.userId != ownUserId
    )!.userId;
  }

  const otherUser = useUserById(otherUserId!);

  if (otherUser) {
    channelName = otherUser?.name;
  }

  return (
    <>
      <ItemWrapper {...props}>
        {isNotGroupDm && otherUserId ? (
          <UserAvatar userId={otherUserId} className="h-8 w-8 shrink-0" />
        ) : (
          <Avatar className={cn('h-8 w-8', 'h-8 w-8')}>
            <AvatarFallback className="bg-muted text-xs">
              {getInitialsFromName(channel.name)}
            </AvatarFallback>
          </Avatar>
        )}
        <span className="flex-1">{channelName}</span>
        {unreadCount > 0 && (
          <div className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-medium text-primary-foreground">
            {unreadCount > 99 ? '99+' : unreadCount}
          </div>
        )}
        {hasActiveVoiceCall && (
          <div className="px-1.5">
            <Phone className="h-4 w-4 text-green-500" />
          </div>
        )}
      </ItemWrapper>
    </>
  );
});

type TItemWrapperProps = {
  children: React.ReactNode;
  className?: string;
  isSelected: boolean;
  onClick: () => void;
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>;
  style?: React.CSSProperties;
  disabled?: boolean;
};

const ItemWrapper = memo(
  ({
    children,
    isSelected,
    onClick,
    className,
    dragHandleProps,
    style,
    disabled = false
  }: TItemWrapperProps) => {
    return (
      <div
        {...dragHandleProps}
        style={style}
        className={cn(
          'flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground select-none cursor-pointer',
          {
            'bg-accent text-accent-foreground': isSelected,
            'cursor-default opacity-50 hover:bg-transparent hover:text-muted-foreground':
              disabled
          },
          className
        )}
        onClick={disabled ? undefined : onClick}
      >
        {children}
      </div>
    );
  }
);

type TChannelProps = {
  channelId: number;
  isSelected: boolean;
};

const PrivateChannel = memo(({ channelId, isSelected }: TChannelProps) => {
  const channel = useChannelById(channelId);
  const channelCan = useChannelCan(channelId, true);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: channelId });

  const onClick = useCallback(async () => {
    setSelectedChannelId(channelId);
  }, [channelId]);

  if (!channel) {
    return null;
  }

  if (!channelCan(ChannelPermission.VIEW_CHANNEL)) return null;

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform && { ...transform, x: 0 }),
        transition,
        opacity: isDragging ? 0.5 : 1
      }}
    >
      <div>
        {channel.type === 'PRIVATE' && (
          <Private
            channel={channel}
            isSelected={isSelected}
            onClick={onClick}
            dragHandleProps={{ ...attributes, ...listeners }}
          />
        )}
      </div>
    </div>
  );
});

const PrivateChannels = memo(() => {
  const channels = useChannels();
  const selectedChannelId = useSelectedChannelId();

  return (
    <div className="space-y-0.5">
      {channels.map((channel) => (
        <PrivateChannel
          key={channel.id}
          channelId={channel.id}
          isSelected={selectedChannelId === channel.id}
        />
      ))}
    </div>
  );
});

export { PrivateChannels };

import { setSelectedChannelId } from '@/features/server/channels/actions';
import {
  useChannelById,
  useChannels,
  useSelectedChannelId
} from '@/features/server/channels/hooks';
import { useChannelCan, useUnreadMessagesCount } from '@/features/server/hooks';
import { getInitialsFromName } from '@/helpers/get-initials-from-name';
import { cn } from '@/lib/utils';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ChannelPermission, type TJoinedChannel } from '@sharkord/shared';
import { Avatar, AvatarFallback } from '@sharkord/ui';
import { memo, useCallback } from 'react';

type TVoiceProps = Omit<TItemWrapperProps, 'children'> & {
  channel: TJoinedChannel;
};

const Private = memo(({ channel, ...props }: TVoiceProps) => {
  const unreadCount = useUnreadMessagesCount(channel.id);

  return (
    <>
      <ItemWrapper {...props}>
        <Avatar className={cn('h-8 w-8', 'h-8 w-8')}>
          <AvatarFallback className="bg-muted text-xs">
            {getInitialsFromName(channel.name)}
          </AvatarFallback>
        </Avatar>
        <span className="flex-1">{channel.name}</span>
        {unreadCount > 0 && (
          <div className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-medium text-primary-foreground">
            {unreadCount > 99 ? '99+' : unreadCount}
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

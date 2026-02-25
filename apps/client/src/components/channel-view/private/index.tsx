import {
  MessageCompose,
  type TMessageComposeHandle
} from '@/components/message-compose';
import { UserAvatar } from '@/components/user-avatar';
import { setSelectedChannelId } from '@/features/server/channels/actions';
import { useChannelById } from '@/features/server/channels/hooks';
import {
  useChannelCan,
  useTypingUsersByChannelId,
  useVoiceUsersByChannelId
} from '@/features/server/hooks';
import { useMessages } from '@/features/server/messages/hooks';
import { playSound } from '@/features/server/sounds/actions';
import { SoundType } from '@/features/server/types';
import { useOwnUserId } from '@/features/server/users/hooks';
import { joinVoice } from '@/features/server/voice/actions';
import { useVoice } from '@/features/server/voice/hooks';
import { getTRPCClient } from '@/lib/trpc';
import {
  ChannelPermission,
  TYPING_MS,
  getTrpcError,
  linkifyHtml
} from '@sharkord/shared';
import { Spinner } from '@sharkord/ui';
import { throttle } from 'lodash-es';
import { Phone } from 'lucide-react';
import { memo, useCallback, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { TextSkeleton } from '../text//text-skeleton';
import { useScrollController } from '../text//use-scroll-controller';
import { MessagesGroup } from '../text/messages-group';
import {
  getChannelDraftKey,
  getDraftMessage,
  setDraftMessage
} from '../text/use-draft-messages';
import { VoiceChannel } from '../voice';

type TChannelProps = {
  channelId: number;
};

const PrivateChannel = memo(({ channelId }: TChannelProps) => {
  const { messages, hasMore, loadMore, loading, fetching, groupedMessages } =
    useMessages(channelId);

  const typingUsers = useTypingUsersByChannelId(channelId);
  const channel = useChannelById(channelId);
  const { init } = useVoice();
  const composeRef = useRef<TMessageComposeHandle>(null);
  const draftChannelKey = getChannelDraftKey(channelId);
  const [newMessage, setNewMessage] = useState(
    getDraftMessage(draftChannelKey)
  );
  const ownUserId = useOwnUserId();
  const usersInVoiceChannel = useVoiceUsersByChannelId(channel!.id);
  let isInVoiceChannel = false;
  if (usersInVoiceChannel.find((user) => user.id === ownUserId)) {
    isInVoiceChannel = true;
  }

  let currentlyActiveVoiceCall = false;

  if (usersInVoiceChannel.length > 0) {
    currentlyActiveVoiceCall = true;
  }

  const { containerRef, onScroll } = useScrollController({
    messages,
    fetching,
    hasMore,
    loadMore,
    hasTypingUsers: typingUsers.length > 0
  });
  const channelCan = useChannelCan(channelId, true);

  const sendTypingSignal = useMemo(
    () =>
      throttle(async () => {
        const trpc = getTRPCClient();

        try {
          await trpc.messages.signalTyping.mutate({ channelId });
        } catch {
          // ignore
        }
      }, TYPING_MS),
    [channelId]
  );

  const setNewMessageHandler = useCallback(
    (value: string) => {
      setNewMessage(value);
      setDraftMessage(draftChannelKey, value);
    },
    [setNewMessage, draftChannelKey]
  );

  const onSend = useCallback(
    async (message: string, files: { id: string }[]) => {
      sendTypingSignal.cancel();
      const trpc = getTRPCClient();
      try {
        await trpc.messages.send.mutate({
          content: linkifyHtml(message),
          channelId,
          files: files.map((f) => f.id)
        });
        playSound(SoundType.MESSAGE_SENT);
      } catch (error) {
        toast.error(getTrpcError(error, 'Failed to send message'));
        return false;
      }
      setNewMessageHandler('');
      return true;
    },
    [channelId, sendTypingSignal, setNewMessageHandler]
  );

  const onCall = useCallback(async () => {
    const response = await joinVoice(channelId);

    if (!response) {
      // joining voice failed
      setSelectedChannelId(undefined);
      toast.error('Failed to join voice channel');

      return;
    }

    try {
      await init(response, channelId);
      await onSend('is Calling you!', []);
    } catch {
      setSelectedChannelId(undefined);
      toast.error('Failed to initialize voice connection');
    }
  }, [channelId, init, onSend]);

  if (!channelCan(ChannelPermission.VIEW_CHANNEL) || loading) {
    return <TextSkeleton />;
  }

  return (
    <>
      {isInVoiceChannel ? (
        <VoiceChannel channelId={channelId} />
      ) : (
        <>
          <div className="shrink-0 h-12 border-b border-border bg-background flex items-center justify-between px-4">
            <div className="text-sm font-medium">{channel!.name!}</div>

            <div className="flex items-center gap-2">
              <button
                className="text-xs text-muted-foreground hover:text-foreground"
                onClick={onCall}
              >
                <Phone className="h-4 w-4" />
              </button>
            </div>
          </div>
          {currentlyActiveVoiceCall && (
            <div className="shrink-0 h-12 border border-green-500 bg-background flex items-center justify-between px-4">
              <div className="text-sm font-medium">
                Currently Active Voice Call
              </div>

              <div className="flex items-center gap-2">
                {usersInVoiceChannel.map((user) => (
                  <UserAvatar userId={user.id} className="h-8 w-8 shrink-0" />
                ))}
              </div>
            </div>
          )}
          {fetching && (
            <div className="absolute top-0 left-0 right-0 h-12 z-10 flex items-center justify-center">
              <div className="flex items-center gap-2 bg-background/80 backdrop-blur-sm border border-border rounded-full px-4 py-2 shadow-lg">
                <Spinner size="xs" />
                <span className="text-sm text-muted-foreground">
                  Fetching older messages...
                </span>
              </div>
            </div>
          )}

          <div
            ref={containerRef}
            onScroll={onScroll}
            className="flex-1 overflow-y-auto overflow-x-hidden p-2 animate-in fade-in duration-500"
          >
            <div className="space-y-4">
              {groupedMessages.map((group, index) => (
                <MessagesGroup key={index} group={group} />
              ))}
            </div>
          </div>
          <MessageCompose
            ref={composeRef}
            channelId={channelId}
            message={newMessage}
            onMessageChange={setNewMessageHandler}
            onSend={onSend}
            onTyping={sendTypingSignal}
            typingUsers={typingUsers}
            showPluginSlot
          />
        </>
      )}
    </>
  );
});

export { PrivateChannel };

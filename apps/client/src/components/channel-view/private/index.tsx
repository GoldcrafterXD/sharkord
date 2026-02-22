import { PluginSlotRenderer } from '@/components/plugin-slot-renderer';
import { TiptapInput } from '@/components/tiptap-input';
import { setSelectedChannelId } from '@/features/server/channels/actions';
import { useChannelById } from '@/features/server/channels/hooks';
import {
  useChannelCan,
  useTypingUsersByChannelId
} from '@/features/server/hooks';
import { useMessages } from '@/features/server/messages/hooks';
import { playSound } from '@/features/server/sounds/actions';
import { SoundType } from '@/features/server/types';
import { joinVoice } from '@/features/server/voice/actions';
import { useVoice } from '@/features/server/voice/hooks';
import { useUploadFiles } from '@/hooks/use-upload-files';
import { getTRPCClient } from '@/lib/trpc';
import {
  ChannelPermission,
  PluginSlot,
  TYPING_MS,
  getTrpcError,
  isEmptyMessage
} from '@sharkord/shared';
import { Button, Spinner } from '@sharkord/ui';
import { filesize } from 'filesize';
import { throttle } from 'lodash-es';
import { Paperclip, Phone, Send } from 'lucide-react';
import { memo, useCallback, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { FileCard } from '../text//file-card';
import { TextSkeleton } from '../text//text-skeleton';
import { useScrollController } from '../text//use-scroll-controller';
import { UsersTyping } from '../text//users-typing';
import { MessagesGroup } from '../text/messages-group';

type TChannelProps = {
  channelId: number;
};

const PrivateChannel = memo(({ channelId }: TChannelProps) => {
  const { messages, hasMore, loadMore, loading, fetching, groupedMessages } =
    useMessages(channelId);

  const [newMessage, setNewMessage] = useState('');
  const typingUsers = useTypingUsersByChannelId(channelId);
  const channel = useChannelById(channelId);
  const { init } = useVoice();

  const { containerRef, onScroll } = useScrollController({
    messages,
    fetching,
    hasMore,
    loadMore,
    hasTypingUsers: typingUsers.length > 0
  });

  // keep this ref just as a safeguard
  const sendingRef = useRef(false);
  const [sending, setSending] = useState(false);
  const channelCan = useChannelCan(channelId, true);

  const canSendMessages = useMemo(() => {
    return channelCan(ChannelPermission.SEND_MESSAGES);
  }, [channelCan]);

  const canUploadFiles = useMemo(() => {
    return channelCan(ChannelPermission.SEND_MESSAGES);
  }, [channelCan]);

  const pluginCommands = undefined;

  const {
    files,
    removeFile,
    clearFiles,
    uploading,
    uploadingSize,
    openFileDialog,
    fileInputProps
  } = useUploadFiles(!canSendMessages);

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

  const onSendMessage = useCallback(async () => {
    if (
      (isEmptyMessage(newMessage) && !files.length) ||
      !canSendMessages ||
      sendingRef.current
    ) {
      return;
    }

    setSending(true);
    sendingRef.current = true;
    sendTypingSignal.cancel();

    const trpc = getTRPCClient();

    try {
      await trpc.messages.send.mutate({
        content: newMessage,
        channelId,
        files: files.map((f) => f.id)
      });

      playSound(SoundType.MESSAGE_SENT);
    } catch (error) {
      toast.error(getTrpcError(error, 'Failed to send message'));
      return;
    } finally {
      sendingRef.current = false;
      setSending(false);
    }

    setNewMessage('');
    clearFiles();
  }, [
    newMessage,
    channelId,
    files,
    clearFiles,
    sendTypingSignal,
    canSendMessages
  ]);

  const onRemoveFileClick = useCallback(
    async (fileId: string) => {
      removeFile(fileId);

      const trpc = getTRPCClient();

      try {
        trpc.files.deleteTemporary.mutate({ fileId });
      } catch {
        // ignore error
      }
    },
    [removeFile]
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
    } catch {
      setSelectedChannelId(undefined);
      toast.error('Failed to initialize voice connection');
    }
  }, [channelId, init]);

  if (!channelCan(ChannelPermission.VIEW_CHANNEL) || loading) {
    return <TextSkeleton />;
  }

  return (
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

      <div className="flex shrink-0 flex-col gap-2 border-t border-border p-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)]">
        {uploading && (
          <div className="flex items-center gap-2">
            <div className="text-xs text-muted-foreground mb-1">
              Uploading files ({filesize(uploadingSize)})
            </div>
            <Spinner size="xxs" />
          </div>
        )}
        {files.length > 0 && (
          <div className="flex gap-1 flex-wrap">
            {files.map((file) => (
              <FileCard
                key={file.id}
                name={file.originalName}
                extension={file.extension}
                size={file.size}
                onRemove={() => onRemoveFileClick(file.id)}
              />
            ))}
          </div>
        )}
        <UsersTyping channelId={channelId} />
        <div className="flex items-center gap-2 rounded-lg">
          <TiptapInput
            value={newMessage}
            onChange={setNewMessage}
            onSubmit={onSendMessage}
            onTyping={sendTypingSignal}
            disabled={uploading || !canSendMessages}
            readOnly={sending}
            commands={pluginCommands}
          />
          <PluginSlotRenderer slotId={PluginSlot.CHAT_ACTIONS} />
          <input {...fileInputProps} />
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            disabled={uploading || !canUploadFiles}
            onClick={openFileDialog}
          >
            <Paperclip className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            onClick={onSendMessage}
            disabled={
              uploading || sending || files.length === 0 || !canSendMessages
            }
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </>
  );
});

export { PrivateChannel };

import { RelativeTime } from '@/components/relative-time';
import { requestConfirmation } from '@/features/dialogs/actions';
import { useOwnUserId, useUserById } from '@/features/server/users/hooks';
import { getFileUrl } from '@/helpers/get-file-url';
import { getRenderedUsername } from '@/helpers/get-rendered-username';
import { getTRPCClient } from '@/lib/trpc';
import { cn } from '@/lib/utils';
import {
  imageExtensions,
  isEmojiOnlyMessage,
  type TJoinedMessage
} from '@sharkord/shared';
import { Tooltip } from '@sharkord/ui';
import parse from 'html-react-parser';
import { memo, useCallback, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { FileCard } from '../file-card';
import { MessageReactions } from '../message-reactions';
import { ImageOverride } from '../overrides/image';
import { serializer } from './serializer';
import type { TFoundMedia } from './types';

const MAX_INLINE_MEDIA = 4;

type TMessageRendererProps = {
  message: TJoinedMessage;
  disableFiles?: boolean;
  disableReactions?: boolean;
};

const MessageRenderer = memo(
  ({ message, disableFiles, disableReactions }: TMessageRendererProps) => {
    const ownUserId = useOwnUserId();
    const editedByUser = useUserById(message.editedBy ?? -1);
    const isOwnMessage = useMemo(
      () => message.userId === ownUserId,
      [message.userId, ownUserId]
    );

    const emojiOnly = useMemo(
      () => isEmojiOnlyMessage(message.content),
      [message.content]
    );
    const hasMediaRef = useRef(false);
    hasMediaRef.current = false;

    const { foundMedia, messageHtml } = useMemo(() => {
      const foundMedia: TFoundMedia[] = [];

      const messageHtml = parse(message.content ?? '', {
        replace: (domNode) =>
          serializer(
            domNode,
            (found) => foundMedia.push(found),
            message.id,
            () => (hasMediaRef.current = true)
          )
      });

      return { messageHtml, foundMedia };
    }, [message.content, message.id]);

    const pickBestImage = (urls: string[] | undefined): string | undefined => {
      if (!urls || urls.length === 0) return undefined;

      const cleaned = urls.filter((url) => !/favicon|logo/.test(url));

      // 1) Prefer gifs
      let targetUrl = cleaned.find((url) => url.endsWith('.gif'));
      if (targetUrl) return targetUrl;

      // 2) Any Maxresdefault or hqdefault
      targetUrl = cleaned.find((url) =>
        /maxresdefault|hqdefault|max/.test(url)
      );
      if (targetUrl) return targetUrl;

      // 3) Logos
      targetUrl = urls.find((url) => /favicon|logo/.test(url));
      if (targetUrl) return targetUrl;

      // 4) Fallback to first remaining
      return cleaned[0];
    };

    if (
      foundMedia.length === 0 &&
      message.metadata &&
      message.metadata.length > 0 &&
      !hasMediaRef.current
    ) {
      for (const metadata of message.metadata) {
        const mediaUrl = pickBestImage(metadata.images);
        if (mediaUrl) {
          foundMedia.push({
            type: 'image',
            url: mediaUrl
          });
        }
      }
    }

    const onRemoveFileClick = useCallback(async (fileId: number) => {
      if (!fileId) return;

      const choice = await requestConfirmation({
        title: 'Delete file',
        message: 'Are you sure you want to delete this file?',
        confirmLabel: 'Delete'
      });

      if (!choice) return;

      const trpc = getTRPCClient();

      try {
        await trpc.files.delete.mutate({
          fileId
        });

        toast.success('File deleted');
      } catch {
        toast.error('Failed to delete file');
      }
    }, []);

    const allMedia = useMemo(() => {
      const mediaFromFiles: TFoundMedia[] = message.files
        .filter((file) =>
          imageExtensions.includes(file.extension.toLowerCase())
        )
        .map((file) => ({
          type: 'image',
          url: getFileUrl(file)
        }));

      return [...foundMedia, ...mediaFromFiles];
    }, [foundMedia, message.files]);

    const [showAllMedia, setShowAllMedia] = useState(false);
    const mediaToRender = useMemo(
      () => (showAllMedia ? allMedia : allMedia.slice(0, MAX_INLINE_MEDIA)),
      [allMedia, showAllMedia]
    );
    const hiddenMediaCount = allMedia.length - mediaToRender.length;

    return (
      <div className="flex flex-col gap-1">
        <div
          className={cn(
            'prose max-w-full wrap-break-word msg-content',
            emojiOnly && 'emoji-only'
          )}
        >
          {messageHtml}
          {message.editedAt && (
            <Tooltip
              content={
                <div className="flex flex-col gap-1">
                  <RelativeTime date={new Date(message.editedAt)}>
                    {(relativeTime) => (
                      <span className="text-secondary text-xs">
                        {editedByUser
                          ? getRenderedUsername(editedByUser)
                          : 'Unknown User'}{' '}
                        {relativeTime}
                      </span>
                    )}
                  </RelativeTime>
                </div>
              }
            >
              <span className="msg-edit ml-1 text-xs text-muted-foreground">
                (edited)
              </span>
            </Tooltip>
          )}
        </div>

        {mediaToRender.map((media, index) => {
          if (media.type === 'image') {
            return (
              <ImageOverride src={media.url} key={`media-image-${index}`} />
            );
          }

          return null;
        })}

        {hiddenMediaCount > 0 && (
          <button
            type="button"
            className="text-xs text-primary hover:underline self-start"
            onClick={() => setShowAllMedia(true)}
          >
            Show {hiddenMediaCount} more image
            {hiddenMediaCount === 1 ? '' : 's'}
          </button>
        )}

        {!disableReactions && (
          <MessageReactions
            reactions={message.reactions}
            messageId={message.id}
          />
        )}

        {message.files.length > 0 && !disableFiles && (
          <div className="flex gap-1 flex-wrap">
            {message.files.map((file) => (
              <FileCard
                key={file.id}
                name={file.originalName}
                extension={file.extension}
                size={file.size}
                onRemove={
                  isOwnMessage ? () => onRemoveFileClick(file.id) : undefined
                }
                href={getFileUrl(file)}
              />
            ))}
          </div>
        )}
      </div>
    );
  }
);

export { MessageRenderer };

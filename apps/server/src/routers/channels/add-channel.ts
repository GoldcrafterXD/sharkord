import {
  ActivityLogType,
  ChannelPermission,
  ChannelType,
  Permission
} from '@sharkord/shared';
import { randomUUIDv7 } from 'bun';
import { desc, eq, isNull } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../../db';
import { publishChannel, publishChannelPermissions } from '../../db/publishers';
import { getAffectedUserIdsForChannel } from '../../db/queries/channels';
import { channels, channelUserPermissions } from '../../db/schema';
import { enqueueActivityLog } from '../../queues/activity-log';
import { VoiceRuntime } from '../../runtimes/voice';
import { invariant } from '../../utils/invariant';
import { protectedProcedure } from '../../utils/trpc';

const addChannelRoute = protectedProcedure
  .input(
    z.object({
      type: z.enum(ChannelType),
      name: z.string().min(1).max(27),
      categoryId: z.number().optional(),
      userIdA: z.number().optional(),
      userIdB: z.number().optional()
    })
  )
  .mutation(async ({ input, ctx }) => {
    let isPrivate = false;
    if (input.type !== ChannelType.PRIVATE) {
      await ctx.needsPermission(Permission.MANAGE_CHANNELS);
    } else {
      isPrivate = true;
      invariant(input.userIdA && input.userIdB, 'Malformed Request');
    }

    const channel = await db.transaction(async (tx) => {
      const maxPositionChannel = await tx
        .select()
        .from(channels)
        .orderBy(desc(channels.position))
        .where(
          input.categoryId === undefined
            ? isNull(channels.categoryId)
            : eq(channels.categoryId, input.categoryId)
        )
        .limit(1)
        .get();

      const now = Date.now();

      const newChannel = await tx
        .insert(channels)
        .values({
          position:
            maxPositionChannel?.position !== undefined
              ? maxPositionChannel.position + 1
              : 0,
          name: input.name,
          type: input.type,
          fileAccessToken: randomUUIDv7(),
          fileAccessTokenUpdatedAt: now,
          private: isPrivate,
          categoryId: input.categoryId ?? null,
          createdAt: now
        })
        .returning()
        .get();

      return newChannel;
    });

    if (
      channel.type === ChannelType.VOICE ||
      channel.type === ChannelType.PRIVATE
    ) {
      const runtime = new VoiceRuntime(channel.id);

      await runtime.init();
    }

    publishChannel(channel.id, 'create');
    enqueueActivityLog({
      type: ActivityLogType.CREATED_CHANNEL,
      userId: ctx.user.id,
      details: {
        channelId: channel.id,
        channelName: channel.name,
        type: channel.type as ChannelType
      }
    });

    if (channel.type === ChannelType.PRIVATE) {
      const permissions = Object.values(ChannelPermission);
      const now = Date.now();

      const userChannelPermissions = [input.userIdA, input.userIdB].flatMap(
        (userId) =>
          permissions.map((permission) => ({
            channelId: channel.id,
            userId: userId!,
            permission,
            allow: true,
            createdAt: now
          }))
      );

      await db.insert(channelUserPermissions).values(userChannelPermissions);

      const affectedUserIds = await getAffectedUserIdsForChannel(channel.id);

      publishChannelPermissions(affectedUserIds);

      enqueueActivityLog({
        type: ActivityLogType.UPDATED_CHANNEL_PERMISSIONS,
        userId: ctx.user.id,
        details: {
          channelId: channel.id,
          targetUserId: input.userIdA,
          targetRoleId: undefined,
          permissions: permissions.map((perm) => ({
            permission: perm,
            allow: true
          }))
        }
      });

      enqueueActivityLog({
        type: ActivityLogType.UPDATED_CHANNEL_PERMISSIONS,
        userId: ctx.user.id,
        details: {
          channelId: channel.id,
          targetUserId: input.userIdB,
          targetRoleId: undefined,
          permissions: permissions.map((perm) => ({
            permission: perm,
            allow: true
          }))
        }
      });

      publishChannel(channel.id, 'update');
    }

    return channel.id;
  });

export { addChannelRoute };

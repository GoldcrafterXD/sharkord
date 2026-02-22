import {
  ChannelPermission,
  Permission,
  type TJoinedChannel
} from '@sharkord/shared';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../../db';
import { channels, channelUserPermissions } from '../../db/schema';
import { invariant } from '../../utils/invariant';
import { protectedProcedure } from '../../utils/trpc';

const getChannelRoute = protectedProcedure
  .input(
    z.object({
      channelId: z.number().min(1)
    })
  )
  .query(async ({ input, ctx }) => {
    await ctx.needsPermission(Permission.MANAGE_CHANNELS);

    const dbChannel = await db
      .select()
      .from(channels)
      .where(eq(channels.id, input.channelId))
      .get();

    invariant(dbChannel, {
      code: 'NOT_FOUND',
      message: 'Channel not found'
    });

    const channel: TJoinedChannel = {
      id: dbChannel!.id,
      type: dbChannel!.type,
      name: dbChannel!.name,
      topic: dbChannel!.topic ?? null,
      fileAccessToken: dbChannel!.fileAccessToken,
      fileAccessTokenUpdatedAt: dbChannel!.fileAccessTokenUpdatedAt,
      private: dbChannel!.private,
      position: dbChannel!.position,
      categoryId: dbChannel!.categoryId ?? null,
      createdAt: dbChannel!.createdAt,
      updatedAt: dbChannel!.updatedAt ?? null,
      channelPermissions: []
    };

    if (dbChannel && dbChannel.id) {
      const channelPermissions = await db
        .select()
        .from(channelUserPermissions)
        .where(
          and(
            eq(
              channelUserPermissions.permission,
              ChannelPermission.ACCESS_PRIVATE_CHANNEL
            ),
            eq(channelUserPermissions.channelId, dbChannel!.id)
          )
        );

      channel.channelPermissions = channelPermissions;
    }

    return channel;
  });

export { getChannelRoute };

"use client";

import { useEffect, useRef } from "react";
import type { Channel } from "pusher-js";
import { getPusherClient, jobChannel } from "@/lib/pusher-client";

type JobChannelHandlers = {
  onTrackingUpdated?: (payload: unknown) => void;
  onNewMessage?: (payload: unknown) => void;
};

const channelRefCounts = new Map<string, number>();
const channelBindings = new Map<
  string,
  { tracking?: (payload: unknown) => void; message?: (payload: unknown) => void }
>();

function getOrSubscribeChannel(pusher: NonNullable<ReturnType<typeof getPusherClient>>, name: string) {
  const existing = pusher.channel(name);
  if (existing) return existing;
  return pusher.subscribe(name);
}

function bindChannelHandlers(channelName: string, channel: Channel) {
  const bindings = channelBindings.get(channelName);
  if (!bindings) return;

  if (bindings.tracking) {
    channel.unbind("tracking-updated", bindings.tracking);
    channel.bind("tracking-updated", bindings.tracking);
  }
  if (bindings.message) {
    channel.unbind("new-message", bindings.message);
    channel.bind("new-message", bindings.message);
  }
}

/**
 * Subscribe to the unified private job channel. Reference-counted so chat and
 * tracking listeners can share one WebSocket subscription per job.
 */
export function useJobChannel(
  jobId: string | undefined,
  enabled: boolean,
  handlers: JobChannelHandlers
): void {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    if (!enabled || !jobId) return;

    const pusher = getPusherClient();
    if (!pusher) return;

    const channelName = jobChannel(jobId);

    const onTracking = (payload: unknown) => {
      handlersRef.current.onTrackingUpdated?.(payload);
    };
    const onMessage = (payload: unknown) => {
      handlersRef.current.onNewMessage?.(payload);
    };

    const prevBindings = channelBindings.get(channelName) ?? {};
    channelBindings.set(channelName, {
      tracking: handlersRef.current.onTrackingUpdated
        ? onTracking
        : prevBindings.tracking,
      message: handlersRef.current.onNewMessage ? onMessage : prevBindings.message,
    });

    const refCount = (channelRefCounts.get(channelName) ?? 0) + 1;
    channelRefCounts.set(channelName, refCount);

    const channel = getOrSubscribeChannel(pusher, channelName);
    bindChannelHandlers(channelName, channel);

    return () => {
      const bindings = channelBindings.get(channelName);
      if (bindings?.tracking === onTracking) bindings.tracking = undefined;
      if (bindings?.message === onMessage) bindings.message = undefined;
      if (bindings && !bindings.tracking && !bindings.message) {
        channelBindings.delete(channelName);
      }

      const nextCount = (channelRefCounts.get(channelName) ?? 1) - 1;
      if (nextCount <= 0) {
        channelRefCounts.delete(channelName);
        channel.unbind("tracking-updated");
        channel.unbind("new-message");
        pusher.unsubscribe(channelName);
      } else {
        channelRefCounts.set(channelName, nextCount);
        bindChannelHandlers(channelName, channel);
      }
    };
  }, [enabled, jobId]);
}

"use server";

import webpush from "web-push";

type PushSubscription = {
  endpoint: string;
  expirationTime: number | null;
  keys: {
    p256dh: string;
    auth: string;
  };
};

const subscriptions = new Set<PushSubscription>();

webpush.setVapidDetails(
  "mailto:your-email@example.com",
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

export async function subscribeUser(subscription: PushSubscription) {
  try {
    subscriptions.add(subscription);
    return { success: true };
  } catch (error) {
    console.error("Failed to subscribe user:", error);
    return { success: false, error: "Failed to subscribe user" };
  }
}

export async function unsubscribeUser() {
  try {
    subscriptions.clear();
    return { success: true };
  } catch (error) {
    console.error("Failed to unsubscribe user:", error);
    return { success: false, error: "Failed to unsubscribe user" };
  }
}

export async function sendNotification(message: string) {
  try {
    const notifications = Array.from(subscriptions).map((subscription) =>
      webpush.sendNotification(
        subscription,
        JSON.stringify({
          title: "Tetris Party",
          body: message,
        })
      )
    );

    await Promise.all(notifications);
    return { success: true };
  } catch (error) {
    console.error("Failed to send notification:", error);
    return { success: false, error: "Failed to send notification" };
  }
}

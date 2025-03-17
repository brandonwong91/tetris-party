"use client";

import { useState, useEffect } from "react";

// function urlBase64ToUint8Array(base64String: string) {
//   const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
//   const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
//   const rawData = window.atob(base64);
//   const outputArray = new Uint8Array(rawData.length);

//   for (let i = 0; i < rawData.length; ++i) {
//     outputArray[i] = rawData.charCodeAt(i);
//   }
//   return outputArray;
// }

// import {
//   subscribeUser,
//   unsubscribeUser,
//   sendNotification,
// } from "@/app/actions/push";

// type PushSubscriptionJSON = {
//   endpoint: string;
//   expirationTime: number | null;
//   keys: {
//     p256dh: string;
//     auth: string;
//   };
// };

// function PushNotificationManager() {
//   const [isSupported, setIsSupported] = useState(false);
//   const [subscription, setSubscription] = useState<PushSubscription | null>(
//     null
//   );
//   const [message, setMessage] = useState("");

//   useEffect(() => {
//     if ("serviceWorker" in navigator && "PushManager" in window) {
//       setIsSupported(true);
//       registerServiceWorker();
//     }
//   }, []);

//   async function registerServiceWorker() {
//     try {
//       const registration = await navigator.serviceWorker.register("/sw.js", {
//         scope: "/",
//         updateViaCache: "none",
//       });
//       const sub = await registration.pushManager.getSubscription();
//       setSubscription(sub);
//     } catch (error) {
//       console.error("Service worker registration failed:", error);
//     }
//   }

//   async function subscribeToPush() {
//     try {
//       const registration = await navigator.serviceWorker.ready;
//       const sub = await registration.pushManager.subscribe({
//         userVisibleOnly: true,
//         applicationServerKey: urlBase64ToUint8Array(
//           process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
//         ),
//       });
//       setSubscription(sub);
//       const serializedSub = JSON.parse(JSON.stringify(sub));
//       await subscribeUser(serializedSub);
//     } catch (error) {
//       console.error("Failed to subscribe to push notifications:", error);
//     }
//   }

//   async function unsubscribeFromPush() {
//     try {
//       await subscription?.unsubscribe();
//       setSubscription(null);
//       await unsubscribeUser();
//     } catch (error) {
//       console.error("Failed to unsubscribe from push notifications:", error);
//     }
//   }

//   async function sendTestNotification() {
//     if (subscription) {
//       try {
//         await sendNotification(message);
//         setMessage("");
//       } catch (error) {
//         console.error("Failed to send test notification:", error);
//       }
//     }
//   }

//   if (!isSupported) {
//     return (
//       <div className="p-4 bg-red-50 text-red-700 rounded-md">
//         <p>Push notifications are not supported in this browser.</p>
//       </div>
//     );
//   }

//   return (
//     <div className="space-y-4">
//       <h3 className="text-lg font-semibold">Push Notifications</h3>
//       {subscription ? (
//         <div className="space-y-4">
//           <p className="text-green-600">
//             You are subscribed to push notifications.
//           </p>
//           <button
//             onClick={unsubscribeFromPush}
//             className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
//           >
//             Unsubscribe
//           </button>
//           <div className="flex gap-2">
//             <input
//               type="text"
//               placeholder="Enter notification message"
//               value={message}
//               onChange={(e) => setMessage(e.target.value)}
//               className="flex-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
//             />
//             <button
//               onClick={sendTestNotification}
//               className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
//             >
//               Send Test
//             </button>
//           </div>
//         </div>
//       ) : (
//         <div className="space-y-4">
//           <p className="text-yellow-600">
//             You are not subscribed to push notifications.
//           </p>
//           <button
//             onClick={subscribeToPush}
//             className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
//           >
//             Subscribe
//           </button>
//         </div>
//       )}
//     </div>
//   );
// }

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }
}

function InstallPrompt() {
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    setIsIOS(/iPad|iPhone|iPod/.test(navigator.userAgent));
    setIsStandalone(window.matchMedia("(display-mode: standalone)").matches);

    // Handle Chrome/Android install prompt
    window.addEventListener(
      "beforeinstallprompt",
      (e: BeforeInstallPromptEvent) => {
        e.preventDefault();
        setDeferredPrompt(e);
      }
    );

    return () => {
      window.removeEventListener("beforeinstallprompt", () => {});
    };
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setDeferredPrompt(null);
      }
    }
  };

  if (isStandalone) {
    return null;
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Install App</h3>
      {isIOS ? (
        <div className="p-4 bg-blue-50 text-blue-700 rounded-md">
          <p>
            To install this app on your iOS device, tap the share button
            <span role="img" aria-label="share icon" className="mx-1">
              ⎋
            </span>
            and then &quot;Add to Home Screen&quot;
            <span role="img" aria-label="plus icon" className="mx-1">
              ➕
            </span>
            .
          </p>
        </div>
      ) : deferredPrompt ? (
        <button
          onClick={handleInstall}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          Install App
        </button>
      ) : (
        <div className="p-4 bg-blue-50 text-blue-700 rounded-md">
          <p>
            To install this app, use your browser&apos;s install feature or add
            it to your home screen from the menu.
          </p>
        </div>
      )}
    </div>
  );
}

export default function PushComponent() {
  return (
    <div className="space-y-8 p-4">
      {/* <PushNotificationManager /> */}
      <InstallPrompt />
    </div>
  );
}

importScripts(
    "https://exam.csii.com.cn/cdnjs/workbox-v4.3.1/workbox-sw.js",
    "precache-manifest-527a0c59.js"
  );
  
  workbox.core.setCacheNameDetails({
    prefix: "chatgpr-mirror",
    suffix: "v1.0.0",
  });
  
  workbox.core.skipWaiting(); // 强制等待中的 Service Worker 被激活
  workbox.core.clientsClaim(); // Service Worker 被激活后使其立即获得页面控制权
  workbox.precaching.precacheAndRoute(self.__precacheManifest || []);
  
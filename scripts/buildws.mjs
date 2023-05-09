import path from "path";
import fs from "fs";
import crypto from "crypto";
import { exec } from "child_process";

exec("rm -rf ./public/precache-manifest*", (error, stdout, stderr) => {
  console.log(stderr, stdout);
});

build();

function build() {
  const list = [];

  walkSync("./public", function(filePath, stat) {
    if (/(service-worker|precache-man)/.test(filePath)) {
      return;
    }

    try {
      const md5val = getFileMd5(filePath);
      list.push({
        url: filePath.replace(/public\//, ""),
        revision: md5val,
      });
    } catch (err) {
      // ignore invalid package.json
    } finally {
    }
  });

  const precachejs = buildPrecacheList(list);
  buildWorker(precachejs);
}

function buildPrecacheList(filelist) {
  const code = JSON.stringify(filelist, null, 2);

  const template = `self.__precacheManifest = (self.__precacheManifest || []).concat(${code});\n`;

  const precachejs = `precache-manifest-${getMd5(template)}.js`;
  fs.writeFileSync('./public/'+precachejs, template, "utf8");
  return precachejs;
}

function buildWorker(precachejs) {
  const tpl = `importScripts(
    "https://exam.csii.com.cn/cdnjs/workbox-v4.3.1/workbox-sw.js",
    "${precachejs}"
  );
  
  workbox.core.setCacheNameDetails({
    prefix: "chatgpr-mirror",
    suffix: "v1.0.0",
  });
  
  workbox.core.skipWaiting(); // 强制等待中的 Service Worker 被激活
  workbox.core.clientsClaim(); // Service Worker 被激活后使其立即获得页面控制权
  workbox.precaching.precacheAndRoute(self.__precacheManifest || []);
  `;

  fs.writeFileSync("./public/service-worker.js", tpl, "utf8");
}

function walkSync(currentDirPath, callback) {
  try {
    fs.readdirSync(currentDirPath, { withFileTypes: true }).forEach(
      (dirent) => {
        var filePath = path.join(currentDirPath, dirent.name);
        if (dirent.isFile()) {
          callback(filePath, dirent);
        } else if (dirent.isDirectory()) {
          walkSync(filePath, callback);
        }
      }
    );
  } catch (err) {
    //
    console.log(err.message);
  }
}

function getFileMd5(file) {
  // console.log(pkg.name);
  const buffer = fs.readFileSync(file);
  const hash = crypto.createHash("md5");
  hash.update(buffer, "utf8");
  const md5 = hash.digest("hex");
  return md5;
}

function getMd5(str) {
  // console.log(pkg.name);
  const buffer = Buffer.from(str);
  const hash = crypto.createHash("md5");
  hash.update(buffer, "utf8");
  const md5 = hash.digest("hex");
  return md5.slice(0, 8);
}

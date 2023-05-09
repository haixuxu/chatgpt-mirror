import fs from "fs";

let passObj = {};

try {
  const allFileContents = fs.readFileSync("./passwd.txt", "utf-8");
  allFileContents.split(/\r?\n/).forEach((line) => {
    const parts = line.split(":");
    passObj[parts[0]] = parts[1];
  });
} catch (err) {
  console.log(err);
}

export default function(user, pass) {
  return passObj[user] && passObj[user] === pass;
}

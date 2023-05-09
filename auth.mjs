import fs from "fs";

const allFileContents = fs.readFileSync("./passwd.txt", "utf-8");
let passObj = {};
try {
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

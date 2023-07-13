import fs from "fs";
import path from "path";

const cwd = process.cwd();

const passfile = path.resolve(cwd,'passwd.txt');

export default function(user, pass) {
  try {
    let passObj = {};
    const allFileContents = fs.readFileSync(passfile, "utf-8");
    allFileContents.split(/\r?\n/).forEach((line) => {
      const parts = line.split(":");
      passObj[parts[0]] = parts[1];
    });
    return passObj[user] && passObj[user] === pass;
  } catch (err) {
    console.log(err);
  }
}

import { User } from "../models/user.model.js";

export const generateUniqueUsername = async (email) => {
  const baseUsername = email
    .split("@")[0]
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 24);

  let username = baseUsername || "user";
  let counter = 1;

  while (await User.exists({ username })) {
    username = `${baseUsername || "user"}${counter}`;
    counter++;
  }

  return username;
};
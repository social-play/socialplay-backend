import mongoose from "mongoose";

const registerForm = new mongoose.Schema(
  {
    userName: String,
    hash: String,
    firstName: String,
    lastName: String,
    birthDate: String,
    email: {
      type: String,
      lowerCase: true,
    },
    accessGroups: [String],
    confirmationCode: String,
  },

  { versionKey: false }
);

export const Users = mongoose.model("register", registerForm);

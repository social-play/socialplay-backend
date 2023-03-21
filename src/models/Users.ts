import mongoose from "mongoose";

const registerForm = new mongoose.Schema(
  {
    userName: String,
    hash: String,
    firstName: String,
    lastName: String,

    email: {
      type: String,
      lowerCase: true,
    },
    accessGroups: [String],
    confirmationCode: String,
    isOver16: Boolean,
    capture: String,
  },

  { versionKey: false }
);

export const Users = mongoose.model("register", registerForm);

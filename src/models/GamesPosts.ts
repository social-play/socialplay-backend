import mongoose from "mongoose";

const gamesPosts = new mongoose.Schema(
  {
    title: String,
    description: String,
    numberOfPages: Number,
    language: String,
    imageUrl: String,
    buyUrl: String,
  },

  { versionKey: false }
);

export const GamesPosts = mongoose.model("gamespost", gamesPosts);

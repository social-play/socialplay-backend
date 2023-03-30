import mongoose from "mongoose";

const gamesPosts = new mongoose.Schema(
  {
    title: String,
    description: String,
    numberOfPages: Number,
    language: String,
    imageUrl: String,
    console: String,
    game: String,
  },

  { versionKey: false }
);

export const GamesPosts = mongoose.model("gamespost", gamesPosts);

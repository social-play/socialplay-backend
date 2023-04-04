import mongoose from "mongoose";

const gamesPosts = new mongoose.Schema(
  {
    title: String,
    WeSearch: String,
    weOffer: String,
    contact: String,
    numberOfPlayers: Number,
    language: String,
    imageUrl: String,
    console: String,
    game: String,
  },

  { versionKey: false }
);

export const GamesPosts = mongoose.model("gamespost", gamesPosts);

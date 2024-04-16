import mongoose from "mongoose";

const gamesPosts = new mongoose.Schema(
  {
    roomId: String,
    WeSearch: String,
    weOffer: String,
    contact: String,
    numberOfPlayers: Number,
    language: String,
    imageUrl: String,
    console: String,
    game: String,
    author: String,

  },

  { versionKey: false }
);

export const GamesPosts = mongoose.model("gamespost", gamesPosts);

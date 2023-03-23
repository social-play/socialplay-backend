import mongoose from "mongoose";
import { IGamePost, IUser } from "./interfaces";
import sgMail from "@sendgrid/mail";
import { Users } from "./models/Users";
import bcrypt from "bcrypt";
import * as tools from "./tools";
import express from "express";
import dotenv from "dotenv";
import { GamesPosts } from "./models/GamesPosts";
dotenv.config();

const MONGODB_CONNECTION =
  process.env.MONGODB_CONNECTION || "mongodb://localhost/final-project";
mongoose.set("strictQuery", false);
mongoose.connect(MONGODB_CONNECTION);

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

export const getRegisterForm = async () => {
  const registerForm = await Users.find();
  return registerForm;
};

export const sendRegisterForm = async (userForm: IUser) => {
  const errors = [];
  const confirmationCode = tools.getRandomConfirmationCode();

  // validation
  for (const validation of tools.validations.errors) {
    const value = userForm[validation.field];
    if (validation.validator) {
      const isValid = validation.validator(value);
      if (!isValid) {
        //console.log("email / password < 2 ", validation.message);
        errors.push(validation.message);
      }
    } else if (value.length < 2) {
      //console.log("length < 2 ", validation.message);

      errors.push(validation.message);
    }
  }
  // check if user is already registered
  const existingUserEmail = await Users.findOne({ email: userForm.email });

  if (existingUserEmail) {
    errors.push("User with this email already exists");
  }

  const existingUserName = await Users.findOne({ userName: userForm.userName });

  if (existingUserName) {
    errors.push("username already exists");
  }

  if (userForm.isOver16 === false) {
    errors.push("Please confirm that you are over 16 years");
  }
  if (userForm.captcha === false) {
    errors.push("Please enter the correct result of the captcha");
  }

  if (errors.length > 0) {
    return {
      status: tools.validations.status,
      errors,
    };
  } else {
    // generate bcrypt
    try {
      const salt = await bcrypt.genSalt(12);
      const hash = await bcrypt.hash(userForm.password, salt);
      const user = new Users({
        ...userForm,
        hash,
        confirmationCode,
        accessGroups: ["loggedInUsers", "unconfirmedMembers"],
      });

      // save user to db
      user.save();
      sendEmailToUser(userForm, confirmationCode);
      return { status: "success", errors: [] };
    } catch (error) {
      return { status: "error", errors: ["no access --"] };
    }
  }
};
const loginSecondsMax = 10;
export const logAnonymousUserIn = async (
  req: express.Request,
  res: express.Response
) => {
  const user = await Users.findOne({ userName: "anonymousUser" });
  if (user) {
    req.session.user = user;
    req.session.cookie.expires = new Date(Date.now() + loginSecondsMax * 1000);
    req.session.save();
    res.send({
      currentUser: user,
    });
  } else {
    res.status(500).send("bad login");
  }
};

export const logUserIn = async (
  userName: string,
  password: string,
  req: express.Request,
  res: express.Response
) => {
  const user = await Users.findOne({ userName });

  if (user) {
    const passwordIsCorrect = await bcrypt.compare(password, user.hash);

    if (passwordIsCorrect) {
      req.session.user = user;
      req.session.cookie.expires = new Date(
        Date.now() + loginSecondsMax * 1000
      );
      req.session.save();
      res.send({
        currentUser: user,
      });
    } else {
      logAnonymousUserIn(req, res);
    }
  } else {
    logAnonymousUserIn(req, res);
  }
};

// hacker
export const protectSiteFromHacking = async (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) => {
  try {
    const users = await Users.find();
    const numberOfUsersInData = users.length;
    if (numberOfUsersInData > 20) {
      res.status(500).send("hacker protection: too many users in database");
    } else {
      next();
    }
  } catch (e) {
    res.status(500).send("no access: something went wrong in ensureSafeOrigin");
  }
};

// send mail to user
export const sendEmailToUser = (userForm: IUser, confirmationCode: string) => {
  const confirmUrl = `${process.env.FRONTEND_BASE_URL}/confirm-registration/${confirmationCode}`;
  const msg = {
    to: `${userForm.email}`,
    from: {
      name: "<no-reply> SOCIALPLAY ",
      email: process.env.GOOGLE_MAIL_ACCOUNT_USER,
    },
    subject: `Please confirm your registration`,
    text: "<no-reply> Samman's Web Development Services",
    html: `
	<h1>Hello ${userForm.userName}!</h1>
	<h3>Thank you for your registration!</h3>
	<p>We appreciate your membership!</p>
	<p>Please click here to confirm your registration: <a href="${confirmUrl}">${confirmUrl}</a></p>
	`,
  };

  sgMail
    .send(msg)
    .then(() => {
      console.log("Email sent");
    })
    .catch((error) => {
      console.error(error);
    });
};

// GamesPosts

export const getAllGamePosts = async () => {
  const gamePosts = await GamesPosts.find();
  return gamePosts;
};

export const getGamesPost = async (id: string) => {
  try {
    const book = await GamesPosts.findOne({ _id: id });

    return book;
  } catch (error) {
    throw new Error(`${error.message}`);
  }
};

export const addGamesPost = async (gamesPost: IGamePost) => {
  try {
    const newGamesPost = await GamesPosts.create(gamesPost);
    return { newId: newGamesPost._id, newGamesPost };
  } catch (error) {
    throw new Error(`${error.message}`);
  }
};

export const editGamesPost = async (id: string, oldGamesPost: IGamePost) => {
  try {
    const oldPost = await GamesPosts.find({ _id: id });
    await GamesPosts.updateOne({ _id: id }, { $set: { ...oldGamesPost } });
    const newOne = await GamesPosts.find({ _id: id });
    return { oldPost, newOne };
  } catch (error) {
    throw new Error(`${error.message}`);
  }
};

export const deleteGamesPost = async (_id: string) => {
  try {
    const deleteGamesPost = await GamesPosts.deleteOne({ _id });

    return `${deleteGamesPost} with ${_id} has been deleted`;
  } catch (error) {
    throw new Error(`${error.message}`);
  }
};

export const authorizeUser = async (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) => {
  const user = await Users.findOne({ userName: "anonymousUser" });
  if (req.session.user === user) {
    next();
  } else {
    res.status(401).send({});
  }
};

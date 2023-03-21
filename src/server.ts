import express from "express";
import * as model from "./model";
import session from "express-session";
import cookieParser from "cookie-parser";
import cors from "cors";
import { IUser } from "./interfaces";
import dotenv from "dotenv";
import bcrypt from "bcrypt";
import { Users } from "./models/Users";
dotenv.config();

declare module "express-session" {
  export interface SessionData {
    user: { [key: string]: any };
  }
}

const port = process.env.PORT || 3823;

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: process.env.FRONTEND_BASE_URL,
    methods: ["POST", "GET", "PATCH", "DELETE"],
    credentials: true,
  })
);
app.use(
  session({
    resave: true,
    saveUninitialized: true,
    secret: process.env.SESSION_SECRET,
    cookie: {
      httpOnly: true,
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      secure: process.env.NODE_ENV === "production",
    },
  })
);
app.all("/", function (req, res, next) {
  res.header("Access-Control-Allow-Origin", `${process.env.FRONTEND_BASE_URL}`);
  res.header("Access-Control-Allow-Headers", "X-Requested-With");
  next();
});

app.get("/", (req: express.Request, res: express.Response) => {
  res.status(500).send("no access -- 222");
});

app.get("/registers", async (req: express.Request, res: express.Response) => {
  try {
    const result = await model.getRegisterForm();

    res.status(200).json(result);
  } catch (error) {
    res.status(500).send(error);
  }
});
const protectSiteFromHacking = async (
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

const loginSecondsMax = 10;

/* 
muss ein object in db mit anonymousUser definiert

{
  accessGroups
  "loggedInUsers"
  userName
  "anonymousUser"
}
*/

const logAnonymousUserIn = async (
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
    res.status(401).send("username or Password incorrect");
  }
};

const logUserIn = async (
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

app.post(
  "/login",

  async (req: express.Request, res: express.Response) => {
    try {
      const userName = req.body?.userName;
      const password = req.body?.password;
      logUserIn(userName, password, req, res);
    } catch (error) {
      res.status(500).send("no access: something went wrong");
    }
  }
);

app.post(
  "/register",
  protectSiteFromHacking,
  async (req: express.Request, res: express.Response) => {
    const userForm: IUser = req.body;

    res.status(200).json(await model.sendRegisterForm(userForm));
  }
);

app.get("/current-user", (req: express.Request, res: express.Response) => {
  setTimeout(() => {
    const user = req.session.user;

    if (user) {
      res.send({
        currentUser: user,
      });
    } else {
      logAnonymousUserIn(req, res);
    }
  }, 0); // increase to test initial backend delay
});

app.get("/logout", (req: express.Request, res: express.Response) => {
  logAnonymousUserIn(req, res);
});

app.post(
  "/confirm-registration-code",
  async (req: express.Request, res: express.Response) => {
    const confirmationCode = req.body.confirmationCode;
    const user = await Users.findOne({ confirmationCode });

    if (user) {
      user.accessGroups = ["loggedInUsers", "members"];
      user.save();
      req.session.user = user;
      req.session.cookie.expires = new Date(
        Date.now() + loginSecondsMax * 1000
      );
      req.session.save();
      res.send({ userWasConfirmed: true });
    } else {
      res.send({ userWasConfirmed: false });
    }
  }
);

app.listen(port, () => {
  console.log(`server is running on http://localhost:${port}`);
});

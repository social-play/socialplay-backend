import express from "express";
import * as model from "./model.js";
import session from "express-session";
import cookieParser from "cookie-parser";
import cors from "cors";
import { IGamePost, IUser } from "./interfaces.js";
import { Users } from "./models/Users.js";
import bcrypt from "bcrypt";
import multer from "multer";
import path from "path";
import dotenv from "dotenv";
dotenv.config();
//socket.io
import http from "http";
import { Server } from "socket.io";


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
// socket.io
const httpServer = http.createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
  console.log(`User Connected: ${socket.id}`);

  socket.on("join_room", (data) => {
    socket.join(data);
    console.log(`User with ID: ${socket.id} joined room: ${data}`);
  });

  socket.on("send_message", (data) => {
    socket.to(data.room).emit("receive_message", data);
  });

  socket.on("disconnect", () => {
    console.log("User Disconnected", socket.id);
  });
});

// cookies

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

/*
muss ein object in db mit anonymousUser definiert

{
  accessGroups
  "loggedInUsers"
  userName
  "anonymousUser"
}
*/

const loginSecondsMaxAnonymous = 100;
const loginSecondsMax = 1000;
export const logAnonymousUserIn = async (
  req: express.Request,
  res: express.Response
) => {
  const user = await Users.findOne({ userName: "anonymousUser" });
  if (user) {
    req.session.user = user;
    req.session.cookie.expires = new Date(Date.now() + loginSecondsMaxAnonymous * 1000);
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
//console.log("correct",passwordIsCorrect);

      req.session.cookie.expires = new Date(
        Date.now() + loginSecondsMax * 1000
      );
      req.session.save();
      res.send({
        currentUser: user,

        userId: user._id, // id for updateUserProfile id
      });
    } else {
      logAnonymousUserIn(req, res);
     // console.log("anonymous",passwordIsCorrect);
    }
  } else {
    logAnonymousUserIn(req, res);
   // console.log("false");
  }
};

app.post(
  "/login",

  async (req: express.Request, res: express.Response) => {
    try {
      const userName: string = req.body?.userName;
      const password: string = req.body?.password;
      logUserIn(userName, password, req, res);
    } catch (error) {
      res.status(500).send("no access: something went wrong");
    }
  }
);

app.post(
  "/register",
  model.protectSiteFromHacking,
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

// GamesPosts

app.get("/gamesPosts", async (req: express.Request, res: express.Response) => {
  try {
    const result = await model.getAllGamePosts();

    res.status(200).json(result);
  } catch (error) {
    res.status(500).send(error);
  }
});

app.get(
  "/gamesPost/:id",
  async (req: express.Request, res: express.Response) => {
    const id = req.params.id;
    try {
      const result = await model.getGamesPost(id);
      res
        .status(200)
        .json({ message: `fetched gamespost with id ${id}`, result });
    } catch (error) {
      res.status(401).send(error.message);
    }
  }
);

const authorizeUser = async (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) => {

  const userAnony = await Users.findOne({ userName: "anonymousUser" });
  const user = await Users.findOne({ userName: req.session.user.userName });
  if (user === userAnony) {
    return res.status(401).send({ message: "Unauthorized" });
  } else {
    next();
  }
};

// andere lösung
// const authorizeUser = async (
//   req: express.Request,
//   res: express.Response,
//   next: express.NextFunction
// ) => {

//   // Überprüfen, ob ein Benutzer in der Sitzung vorhanden ist

//   if (!req.session.user) {
//     return res.status(401).send({ message: "Unauthorized" });
//   }

//   // Überprüfe, ob der Benutzer in der Datenbank existiert

//   const user = await Users.findOne({ userName: req.session.user.userName });

//   // Überprüfen, ob der Benutzer in der Datenbank existiert
//   if (!user) {
//     // Wenn der Benutzer nicht in der Datenbank gefunden wurde, ist die Sitzung ungültig
//     req.session.destroy((err) => {
//       if (err) {
//         console.error("Error destroying session:", err);
//       }
//     });
//     return res.status(401).send({ message: "Unauthorized" });
//   }


//     if(req.session.user.userName == "anonymousUser"){


//     return res.status(401).send({ message: "Unauthorized" });
//     }

//   // Wenn alles in Ordnung, setze den Benutzer in der Anfrage fort

//   //req.session.user.userName === user;

//   next();
// };

app.post(
  "/gamesPost",
  authorizeUser,
  async (req: express.Request, res: express.Response) => {
    const gamesPost = req.body;
    try {
      res.status(200).json(await model.addGamesPost(gamesPost));
    } catch (error) {
      res.status(401).send(error.message);
    }
  }
);

app.delete(
  "/gamesPost/:id",
  authorizeUser,
  async (req: express.Request, res: express.Response) => {
    const _id = req.params.id;
    try {
      res.status(200).json(await model.deleteGamesPost(_id));
    } catch (error) {
      res.status(401).send(error.message);
    }
  }
);

app.patch(
  "/gamesPost/:id",
  authorizeUser,
  async (req: express.Request, res: express.Response) => {
    const id = req.params.id;
    const gamesPost: IGamePost = req.body;
    try {
      const result = await model.editGamesPost(id, gamesPost);
      res.status(200).json({
        oldGamesPost: result.oldPost,
        result: result.newOne,
      });
    } catch (error) {
      res.status(401).send(error.message);
    }
  }
);
// multer upload picture
const staticDirectory = path.join(__dirname, "../public");

app.use(express.static(staticDirectory));

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "public/images");
  },
  filename: (req, file, cb) => {
    //const userId = req.params.id;
    const userName = req.params.userName;
    const originalName = file.originalname;
    const fileExtension = originalName.split(".").pop();
    const fileName = `${userName}.${fileExtension}`;
    cb(null, fileName);
  },
});

const upload = multer({ storage });

app.post("/uploadFile/:userName", upload.single("file"), async (req, res) => {
  res.status(200).send("ok");
});

// userProfile
app.patch(
  "/userProfile/:id",

  async (req: express.Request, res: express.Response) => {
    const id = req.params.id;
    const currentUser: IUser = req.body;
    try {
      const result = await model.editUserProfile(id, currentUser);
      req.session.user.firstName = currentUser.firstName;
      req.session.user.lastName = currentUser.lastName;
      req.session.user.email = currentUser.email;
      res.status(200).json(result);
    } catch (error) {
      res.status(401).send(error.message);
    }
  }
);

app.get("*", (req: express.Request, res: express.Response) => {
  res.status(404).send("route not found");
});

httpServer.listen(port, () => {
  console.log(`server is running on http://localhost:${port}`);
});

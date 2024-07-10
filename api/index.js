const express = require("express");
const app = express();
const mongoose = require("mongoose");
require("dotenv").config();
const jwt = require("jsonwebtoken");
const ws = require("ws");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const bcrypt = require("bcryptjs");
const User = require("./models/User");
const Message = require("./models/Message");
const fs = require("fs");
const path = require("path");
const cloudinary = require("./utils/cloudinary");
//console.log(process.env.MONGO_URL);
app.use("/uploads", express.static(__dirname + "/uploads"));
console.log(__dirname);
app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    credentials: true,
    origin: "http://localhost:5173",
  })
);

mongoose.connect(process.env.MONGO_URL);
const bcryptSalt = bcrypt.genSaltSync(10);
async function getUserDataFromRequest(req) {
  return new Promise((resolve, reject) => {
    const token = req.cookies?.token;
    if (token) {
      jwt.verify(token, process.env.JWT_SECRET, {}, (err, userData) => {
        if (err) throw err;
        resolve(userData);
      });
    } else {
      reject("no token");
    }
  });
}
app.get("/test", (req, res) => {
  res.json("test ok");
});
app.get("/messages/:userId", async (req, res) => {
  const { userId } = req.params;
  const userData = await getUserDataFromRequest(req);
  const ourUserId = userData.userId;
  const messages = await Message.find({
    sender: { $in: [userId, ourUserId] },
    recipient: { $in: [userId, ourUserId] },
  }).sort({ createdAt: 1 });
  res.json(messages);
});

app.get("/people", async (req, res) => {
  const users = await User.find({}, { _id: 1, username: 1 });
  res.json(users);
});
app.get("/profile", (req, res) => {
  const token = req.cookies?.token;
  if (token) {
    jwt.verify(token, process.env.JWT_SECRET, {}, (err, userData) => {
      if (err) throw err;
      res.json(userData);
    });
  } else {
    res.status(401).json("no token");
  }
});
app.post("/register", async (req, res) => {
  const { username, password } = req.body;
  try {
    const hashedPassword = bcrypt.hashSync(password, bcryptSalt);
    const createdUser = await User.create({
      username: username,
      password: hashedPassword,
    });
    jwt.sign(
      { userId: createdUser._id, username },
      process.env.JWT_SECRET,
      {},
      (err, token) => {
        if (err) throw err;
        res
          .cookie("token", token, { sameSite: "none", secure: true })
          .status(201)
          .json({
            id: createdUser._id,
            username,
          });
      }
    );
  } catch (error) {
    if (error.code === 11000) {
      // MongoDB duplicate key error code
      res.status(400).json({ error: "Username already exists" });
    } else {
      res.status(500).json({ error: "Internal server error" });
    }
  }
});

app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  const foundUser = await User.findOne({ username });
  if (foundUser) {
    const passOk = bcrypt.compareSync(password, foundUser.password);
    if (passOk) {
      jwt.sign(
        { userId: foundUser._id, username },
        process.env.JWT_SECRET,
        {},
        (err, token) => {
          if (err) throw err;
          res
            .cookie("token", token, { sameSite: "none", secure: true })
            .status(201)
            .json({
              id: foundUser._id,
              username,
            });
        }
      );
    }
  }
});

app.post("/logout", (req, res) => {
  res
    .cookie("token", "", { sameSite: "none", secure: true })
    .json("logged out");
});
const server = app.listen(4040);
const wss = new ws.WebSocketServer({ server });
wss.on("connection", (connection, req) => {
  function notifyAboutOnlinePeople() {
    [...wss.clients].forEach((client) => {
      client.send(
        JSON.stringify({
          online: [...wss.clients].map((c) => ({
            userId: c.userId,
            username: c.username,
          })),
        })
      );
    });
  }
  connection.isAlive = true;
  connection.timer = setInterval(() => {
    connection.ping();
    connection.deathTimer = setTimeout(() => {
      connection.isAlive = false;
      clearInterval(connection.timer);
      connection.terminate();
      notifyAboutOnlinePeople();
      //console.log("dead");
    }, 1000);
  }, 5000);
  connection.on("pong", () => {
    clearTimeout(connection.deathTimer);
  });
  //read the username and id from the cookie for this connection
  const cookies = req.headers.cookie;
  if (cookies) {
    const tokenCookieString = cookies
      .split(";")
      .find((str) => str.startsWith("token="));
    if (tokenCookieString) {
      const token = tokenCookieString.split("=")[1];
      if (token) {
        jwt.verify(token, process.env.JWT_SECRET, {}, (err, userData) => {
          if (err) throw err;
          const { userId, username } = userData;
          connection.userId = userId;
          connection.username = username;
        });
      }
    }
  }
  connection.on("message", async (message, isBinary) => {
    const messageData = JSON.parse(message.toString());
    const { recipient, text, file } = messageData.message;
    let filename = null;
    if (file) {
      try {
        const result = await cloudinary.uploader.upload(file.data, {
          folder: "chat_uploads", // Adjust folder name as needed
          resource_type: "auto", // Automatically detect the type of resource
        });
        filename = result.secure_url;
        //console.log("File uploaded to Cloudinary:", result);
      } catch (error) {
        console.error("Error uploading file to Cloudinary:", error);
      }
    }
    if (recipient && (text || file)) {
      const messageDoc = await Message.create({
        sender: connection.userId,
        recipient,
        text,
        file: file ? filename : null,
      });

      [...wss.clients]
        .filter((c) => c.userId === recipient)
        .forEach((c) =>
          c.send(
            JSON.stringify({
              text,
              sender: connection.userId,
              recipient,
              file: file ? filename : null,
              _id: messageDoc._id,
            })
          )
        );
    }
  });
  //notify everyone about online people(when someone connects)
  notifyAboutOnlinePeople();
});

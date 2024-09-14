import express, { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import passport from "passport";
import session from "express-session";
import ErrorHandler from "./middlewares/ErrorHandler";
import dotenv from "dotenv";
import morgan from "morgan";
import cors from "cors";
import helmet from "helmet";
import Logger from "./middlewares/Logger";
import limiter from "./middlewares/Limiter";
import { initializePassportConfig } from "./configs/passport.config";

dotenv.config();

// Set up Prisma Client
// ! Do not create a new PrismaClient instance in each request handler
// ! we should create a new file to createa a prisma instance and export it
export const prisma = new PrismaClient();
const app = express();
app.use(express.json());
const port = process.env.PORT || 3000;

// ERROR HANDLER MIDDLEWARE (Last middleware to use)
app.use(ErrorHandler);

// logger middleware
app.use(Logger);

app.use(morgan("common")); //just for logs
app.use(helmet());
app.use(cors());
app.use(limiter);
app.use(express.json());

// Use session middleware
app.use(
  session({
    secret: "your-secret-key",
    resave: false,
    saveUninitialized: false,
  })
);
// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());
// initialize passport config called after dotenv.config() to access environment variables
initializePassportConfig();

app.get("/", (req: Request, res: Response) => {
  res.send("Welcome");
});

app.post(
  "/login",
  passport.authenticate("local", {
    successRedirect: "/profile",
    failureRedirect: "/login",
    failureFlash: true,
  })
);

app.get("/login", (req, res) => {
  return res.send('<a href="/auth/google">Login with Google</a>');
});

// auth with google

app.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);
app.get(
  "/auth/google/callback",
  passport.authenticate("google", {
    failureRedirect: "/login",
    successRedirect: "/profile",
  })
);

app.get("/profile", (req: any, res: any) => {
  if (req.isAuthenticated()) {
    const user = req.user;
    res.status(200).json({ message: "User profile", user });
  } else {
    res.redirect("/login");
  }
});
// Create a blog
app.post("/post", async (req: Request, res: Response) => {
  try {
    const { title, content } = req.body;
    if (!title || !content) {
      return res
        .status(400)
        .json({ message: "Please input Title and Content" });
    }

    function ensureAuthenticated(req: any, res: any, next: any) {
      if (req.isAuthenticated()) {
        return next();
      }
      res.redirect("/login");
    }
    app.get("/protected", ensureAuthenticated, (req, res) => {
      res.send("This is a protected route");
    });

    const blog = await prisma.post.create({
      data: { title, content },
    });

    return res
      .status(201)
      .json({ message: "Blog created successfully", data: blog });
  } catch (error) {
    return res.status(500).json({ message: "Error creating blog" });
  }
});

// Get all blogs
app.get("/posts", async (req: Request, res: Response) => {
  try {
    const blogs = await prisma.post.findMany();
    return res.status(201).json({ data: blogs.length, blogs });
  } catch (error) {
    return res.status(500).json({ message: "Error fetching blogs" });
  }
});

app.listen(port, () => {
  console.log(`Server listening on ${port}`);
});

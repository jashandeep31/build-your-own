import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { prisma } from "..";
const users = [{ id: 1, username: "user", password: "password" }];

export const initializePassportConfig = () => {
  passport.use(
    new LocalStrategy((username: string, password: string, done: any) => {
      const user = users.find((u) => u.username === username);
      if (!user) {
        return done(null, false, { message: "Incorrect username." });
      }
      if (user.password !== password) {
        return done(null, false, { message: "Incorrect password." });
      }
      return done(null, user);
    })
  );

  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID ?? "",
        clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
        callbackURL: "http://localhost:3000/auth/google/callback",
      },
      async (accessToken, refreshToken, profile, cb) => {
        if (!profile.emails![0]?.value) {
          return cb(null, false, { message: "No email found" });
        }
        const user = await prisma.user.upsert({
          where: { email: profile.emails![0].value },
          update: {},
          create: {
            email: profile.emails![0]?.value,
            name: profile.displayName,
            avatar: profile.photos![0]?.value,
          },
        });
        return cb(null, user);
      }
    )
  );
  passport.serializeUser((user: any, done: any) => {
    done(null, {
      id: user.id,
      email: user.email,
      name: user.name,
      avatar: user.avatar,
    });
  });
  passport.deserializeUser(async (rawUser: any, done: any) => {
    try {
      const user = await prisma.user.findUnique({
        where: {
          id: rawUser.id,
        },
      });
      done(null, user);
    } catch (err) {
      done(err, null);
    }
  });
};
//

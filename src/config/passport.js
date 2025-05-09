import 'dotenv/config';
import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { User } from '../models/User.js';

// Local username/password
passport.use(new LocalStrategy({
  usernameField: 'email',
  passwordField: 'password'
}, async (email, password, done) => {
  try {
    const user = await User.findOne({ email });
    if (!user) return done(null, false, { message: 'User not found' });
    const isMatch = await user.comparePassword(password);
    if (!isMatch) return done(null, false, { message: 'Incorrect password' });
    return done(null, user);
  } catch (err) {
    return done(err);
  }
}));

// Google OAuth2
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: '/auth/google/callback'
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      let user = await User.findOne({ googleId: profile.id });
      if (!user) {
        user = await User.create({
          googleId: profile.id,
          email: profile.emails[0].value,
          name: profile.displayName
        });
      }
      return done(null, user);
    } catch (err) {
      return done(err);
    }
  }
));

// session persistence
passport.serializeUser((user, done) => {
  if (!user || !user.id) {
    return done(new Error('Invalid user object'));
  }
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    if (!id) {
      return done(new Error('Invalid user ID'));
    }
    const user = await User.findById(id);
    if (!user) {
      return done(new Error('User not found'));
    }
    done(null, user);
  } catch (error) {
    done(error);
  }
});

export default passport;
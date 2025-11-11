import User from '../models/User.js';
import generateToken from '../utils/generateToken.js';

// Cookie options: when in production and frontend is on a different origin we must
// use sameSite: 'none' and secure: true so browsers send cookies for cross-site requests.
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
};

export const registerUser = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      res.status(400);
      throw new Error('Please provide name, email, and password');
    }
    const exists = await User.findOne({ email });
    if (exists) {
      res.status(400);
      throw new Error('User already exists');
    }
    const user = await User.create({ name, email, password });
    // create a token and set it as httpOnly cookie
    const token = generateToken(user._id);
    res.cookie('token', token, COOKIE_OPTIONS);
    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      currentStreak: user.currentStreak,
      lastActiveDate: user.lastActiveDate,
      progress: user.progress || {}
    });
  } catch (err) {
    next(err);
  }
};

export const authUser = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (user && (await user.matchPassword(password))) {
      // Streak logic on successful login
      const today = new Date();
      const lastActive = user.lastActiveDate ? new Date(user.lastActiveDate) : null;
      const yesterday = new Date(today);
      yesterday.setDate(today.getDate() - 1);

      if (lastActive) {
        const lastDateStr = lastActive.toDateString();
        const todayStr = today.toDateString();
        const yesterdayStr = yesterday.toDateString();
        if (lastDateStr === yesterdayStr) {
          user.currentStreak += 1;
        } else if (lastDateStr !== todayStr) {
          // Missed a day (or more) - reset streak
          user.currentStreak = 1;
        }
      } else {
        user.currentStreak = 1;
      }
      user.lastActiveDate = today;
      await user.save();
      const token = generateToken(user._id);
      res.cookie('token', token, COOKIE_OPTIONS);
      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        currentStreak: user.currentStreak,
        lastActiveDate: user.lastActiveDate,
        progress: user.progress || {}
      });
    } else {
      res.status(401);
      throw new Error('Invalid email or password');
    }
  } catch (err) {
    next(err);
  }
};

export const getUserProfile = async (req, res, next) => {
  try {
    const user = req.user;
    // Update streak passively on profile fetch (optional)
    const today = new Date();
    const lastActive = user.lastActiveDate ? new Date(user.lastActiveDate) : null;
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    if (!lastActive || lastActive.toDateString() !== today.toDateString()) {
      // If last active wasn't today, evaluate streak logic
      if (lastActive && lastActive.toDateString() === yesterday.toDateString()) {
        user.currentStreak += 1;
      } else if (!lastActive || lastActive.toDateString() !== today.toDateString()) {
        user.currentStreak = 1;
      }
      user.lastActiveDate = today;
      await user.save();
    }
    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      currentStreak: user.currentStreak,
      lastActiveDate: user.lastActiveDate,
      progress: user.progress || {}
    });
  } catch (err) {
    next(err);
  }
};

export const updateUserProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      res.status(404);
      throw new Error('User not found');
    }
    user.name = req.body.name || user.name;
    user.email = req.body.email || user.email;
    if (req.body.password) user.password = req.body.password;
    // allow updating progress from client (partial replace)
    if (req.body.progress) {
      user.progress = req.body.progress;
    }
    const updated = await user.save();
    // refresh cookie when profile updates (keeps session alive)
    const token = generateToken(updated._id);
    res.cookie('token', token, COOKIE_OPTIONS);
    res.json({
      _id: updated._id,
      name: updated.name,
      email: updated.email,
      role: updated.role,
      currentStreak: updated.currentStreak,
      lastActiveDate: updated.lastActiveDate,
      progress: updated.progress || {}
    });
  } catch (err) {
    next(err);
  }
};

export const logoutUser = async (req, res, next) => {
  try {
    res.clearCookie('token', { httpOnly: true, sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', secure: process.env.NODE_ENV === 'production' });
    res.json({ message: 'Logged out' });
  } catch (err) {
    next(err);
  }
};


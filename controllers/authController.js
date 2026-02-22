const User = require("../models/user");
const { generateToken } = require("../middleware/authMiddleware");
const { successResponse, errorResponse } = require("../utils/response");

// REGISTER USER
const registerUser = async (req, res, next) => {
  try {
    const { fullName, email, srn, password } = req.body;

    const normSrn = srn?.trim().toUpperCase();
    const normEmail = email?.trim().toLowerCase();

    const userExist = await User.findOne({ srn: normSrn });

    if (userExist) {
      return errorResponse(res, 409, "User Already Exists");
    }

    const data = {
      fullName,
      email: normEmail,
      srn: normSrn,
      password,
      role: "voter",
    };

    const newUser = new User(data);
    const response = await newUser.save();
    console.log("User registered");

    const payload = { id: response.id, role: response.role };
    const token = generateToken ? generateToken(payload) : null;

    return successResponse(res, 200, "Registration Successful", {
      user: response,
      token,
    });
  } catch (err) {
    return next(err);
  }
};

// User Login
const loginUser = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: email.trim().toLowerCase() });
    if (!user || !(await user.comparePassword(password))) {
      return errorResponse(res, 401, "Invalid credentials");
    }
    const token = generateToken({ id: user._id, role: user.role });

    return successResponse(res, 200, "Login Success", {
      token,
      user: { id: user._id, fullName: user.fullName, role: user.role },
    });
  } catch (err) {
    return next(err);
  }
};

// Get the user profile
const getProfile = async (req, res, next) => {
  try {
    const userData = req.user;
    const user = await User.findById(userData.id);

    return successResponse(res, 200, "Successfully Fetched", {
      name: user.fullName,
      email: user.email,
      SRN: user.srn,
    });
  } catch (err) {
    return next(err);
  }
};

// Reset password
const resetPassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    // find the id
    const userId = req.user.id;

    // find the user with the id
    const user = await User.findById(userId);

    // Check if current password is correct
    if (!user || !(await user.comparePassword(currentPassword))) {
      return errorResponse(res, 401, "Wrong current password!");
    }

    // Check if current and new password are same
    if(await user.comparePassword(newPassword)) {
      return errorResponse(res, 400, "New password must be different from the old one");
    }

    // Update password
    user.password = newPassword;
    await user.save();

    console.log("password updated");
    return successResponse(res, 200, "Password Updated", {});
  } catch (err) {
    return next(err);
  }
};

module.exports = {
  registerUser,
  loginUser,
  getProfile,
  resetPassword,
};

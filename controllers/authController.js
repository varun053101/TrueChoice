const User = require("../models/user");
const { generateToken } = require("../middleware/authMiddleware");

// REGISTER USER
const registerUser = async (req, res) => {
  try {
    const { fullName, email, srn, password } = req.body;

    const normSrn = srn?.trim().toUpperCase();
    const normEmail = email?.trim().toLowerCase();

    const userExist = await User.findOne({ srn: normSrn });

    if (userExist) {
      return res.status(409).json({
        error: "User Already Exists",
      });
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

    return res.status(200).json({ user: response, token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Registration failed" });
  }
};

// User Login
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: email.trim().toLowerCase() });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    const token = generateToken({ id: user._id, role: user.role });
    res.json({
      token,
      user: { id: user._id, fullName: user.fullName, role: user.role },
    });
  } catch (err) {
    res.status(500).json({ error: "Login failed" });
  }
};

// Get the user profile
const getProfile = async (req, res) => {
  try {
    const userData = req.user;

    const user = await User.findById(userData.id);
    res.status(200).json({
      name: user.fullName,
      email: user.email,
      SRN: user.srn,
    });
  } catch (err) {
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// Reset password
const resetPassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    // find the id
    const userId = req.user.id;

    // find the user with the id
    const user = await User.findById(userId);

    if (!user || !(await user.comparePassword(currentPassword))) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    console.log("password updated");
    res.status(200).json({ message: "Password Updated" });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = {
  registerUser,
  loginUser,
  getProfile,
  resetPassword,
};

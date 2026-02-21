const User = require("../models/user");

// Get the list of all the users
const getAllUsers = async (req, res) => {
  try {
    const users = await User.find()
      .select("_id fullName email srn role createdAt")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      total: users.length,
      users,
    });
  } catch (err) {
    console.error("Get users error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// Get the current admin details
const getCurrentAdmin = async (req, res) => {
  try {
    const admin = await User.findOne({ role: "admin" }).select(
      "_id fullName email srn role createdAt",
    );

    return res.status(200).json({ admin });
  } catch (err) {
    console.error("Get admin details error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// Make a user as admin
const makeAdmin = async (req, res) => {
  try {
    const userId = req.params.userId;

    // Find target user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // check if the user is already admin
    if (user.role === "admin") {
      return res.status(200).json({
        message: "User is already admin",
        admin: {
          id: user._id,
          fullName: user.fullName,
          email: user.email,
          srn: user.srn,
          role: user.role,
        },
      });
    }

    // Demote existing admin
    const existingAdmin = await User.findOne({ role: "admin" });
    if (existingAdmin && existingAdmin._id.toString() !== user._id.toString()) {
      existingAdmin.role = "voter";
      await existingAdmin.save();
    }

    // Promote this user to admin
    user.role = "admin";
    await user.save();

    return res.status(200).json({
      message: "Admin updated successfully",
      admin: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        srn: user.srn,
        role: user.role,
      },
    });
  } catch (err) {
    console.error("make-admin error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// Ownership Transfer
const transferSuperadmin = async (req, res) => {
  try {
    const userId = req.params.userId;

    // Find target user
    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return res.status(404).json({ error: "User not found" });
    }

    // If already superadmin, just return
    if (targetUser.role === "superadmin") {
      return res.status(200).json({
        message: "User is already superadmin",
        superadmin: {
          id: targetUser._id,
          fullName: targetUser.fullName,
          email: targetUser.email,
          srn: targetUser.srn,
          role: targetUser.role,
        },
      });
    }

    // cannot transfer ownership to current admin
    if (targetUser.role === "admin") {
      return res.status(400).json({
        error:
          "Cannot transfer superadmin to the current admin. " +
          "Please assign a different admin or change this user's role first.",
      });
    }

    //  Find existing superadmin (the caller, usually)
    const existingSuperadmin = await User.findOne({ role: "superadmin" });

    // Promote target to superadmin
    targetUser.role = "superadmin";
    await targetUser.save();

    // Demote old superadmin to voter (if different user)
    if (
      existingSuperadmin &&
      existingSuperadmin._id.toString() !== targetUser._id.toString()
    ) {
      existingSuperadmin.role = "voter";
      await existingSuperadmin.save();
    }

    return res.status(200).json({
      message: "Superadmin transferred successfully",
      superadmin: {
        id: targetUser._id,
        fullName: targetUser.fullName,
        email: targetUser.email,
        srn: targetUser.srn,
        role: targetUser.role,
      },
    });
  } catch (err) {
    console.error("make-superadmin error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = {
  getAllUsers,
  getCurrentAdmin,
  makeAdmin,
  transferSuperadmin,
};

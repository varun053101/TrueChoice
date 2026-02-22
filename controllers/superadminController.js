const User = require("../models/user");
const { successResponse, errorResponse } = require("../utils/response");

// Get the list of all the users
const getAllUsers = async (req, res, next) => {
  try {
    const users = await User.find()
      .select("_id fullName email srn role createdAt")
      .sort({ createdAt: -1 });

    return successResponse(res, 200, "Fetched Successfully", {
      total: users.length,
      users,
    });
  } catch (err) {
    return next(err);
  }
};

// Get the current admin details
const getCurrentAdmin = async (req, res, next) => {
  try {
    const admin = await User.findOne({ role: "admin" }).select(
      "_id fullName email srn role createdAt",
    );
    return successResponse(res, 200, "Fetched Successfully", { admin });
  } catch (err) {
    return next(err);
  }
};

// Make a user as admin
const makeAdmin = async (req, res, next) => {
  try {
    const userId = req.params.userId;

    // Find target user
    const user = await User.findById(userId);
    if (!user) {
      return errorResponse(res, 404, "User Not Found");
    }

    // check if the user is already admin
    if (user.role === "admin") {
      return errorResponse(res, 409, "Already an admin");
    }

    // Demote existing admin
    const existingAdmin = await User.findOne({ role: "admin" });
    if (existingAdmin && existingAdmin._id.toString() !== user._id.toString()) {
      existingAdmin.role = "voter";
      await existingAdmin.save();
    }

    // Promote this user to admin
    user.role = "admin";
    await user.s;

    const responseData = {
      id: user._id,
      fullName: user.fullName,
      email: user.email,
      srn: user.srn,
      role: user.role,
    };

    return successResponse(
      res,
      200,
      "Admin updated Successfully",
      responseData,
    );
  } catch (err) {
    return next(err);
  }
};

// Ownership Transfer
const transferSuperadmin = async (req, res, next) => {
  try {
    const userId = req.params.userId;

    // Find target user
    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return errorResponse(res, 404, "User Not Found");
    }

    // If already superadmin, just return
    if (targetUser.role === "superadmin") {
      return errorResponse(res, 409, "Already a superadmin");
    }

    // cannot transfer ownership to current admin
    if (targetUser.role === "admin") {
      return errorResponse(
        res,
        403,
        "Cannot transfer superadmin to the current admin. " +
          "Please assign a different admin or change this user's role first.",
      );
    }

    //  Find existing superadmin (the caller, usually)
    const existingSuperadmin = await User.findOne({ role: "superadmin" });

    // Demote old superadmin to voter (if different user)
    if (
      existingSuperadmin &&
      existingSuperadmin._id.toString() !== targetUser._id.toString()
    ) {
      existingSuperadmin.role = "voter";
      await existingSuperadmin.save();
    }

    // Promote target to superadmin
    targetUser.role = "superadmin";
    await targetUser.save();

    return successResponse(res, 200, "Superadmin Transferred Successfully", {
      id: targetUser._id,
      fullName: targetUser.fullName,
      email: targetUser.email,
      srn: targetUser.srn,
      role: targetUser.role,
    });
  } catch (err) {
    return next(err);
  }
};

module.exports = {
  getAllUsers,
  getCurrentAdmin,
  makeAdmin,
  transferSuperadmin,
};

const express = require('express');
const router = express.Router();
const User = require('./../models/user');
const {jwtAuthMiddleware, generateToken} = require('./../jwt');




//POST route to add a user
router.post('/signup', async (req,res) => {
  try{
    // Get the data
    const data = req.body;      // Because the bodyparser stores data in req.body

    // Create a New User document using the mongoose model
    const newUser = new User(data);

    // Save new User to the database
    const response = await newUser.save();
    console.log('data saved');

    const payload = {
      id : response.id
    }

    console.log(JSON.stringify(payload));

    //Generate the token here
    const token = generateToken(payload);
    console.log("Token is: ", token);

    res.status(200).json({response : response, token : token});      // 200 is the https code for successful response
  }catch(err){
    console.log(err);
    res.status(500).json({error : 'Internal server error'});
  }
} )


// Login Route
router.post('/login', async (req,res) => {
  try{
    // Extract the aadhar and password from req.body

    const {aadharCardNumber, password} = req.body;

    // find the user by username
    const user = await User.findOne({aadharCardNumber : aadharCardNumber});

    // If user does not exist or password does not match, return error
    if(!user || !(await user.comparePassword(password))){
      return res.status(401).json({error : 'Invalid Aadhar Card Number or password'});
    }

    // Generate token
    const payload = {
      id : user.id
    }

    const token = generateToken(payload);
    console.log(token)

    //Return token as response
    return res.json({token});

  }catch(err){
    console.log(err);
    res.status(500).json({error : 'Internal server error'});
  }
})


// Profile Route
router.get('/profile', jwtAuthMiddleware, async (req, res) => {
  try {
    const userData = req.user;

    // Find by id present in userdata
    const userId = userData.id;

    const user = await User.findById(userId);
    res.status(200).json({
      user : user.name,
      email : user.email,
      aadharCardNumber : user.aadharCardNumber,
      mobileNumber : user.mobileNumber,
      address : user.address,
    });
  }catch (err){
    console.log(err);
    res.status(500).json({error : 'Internal server error'});
  }
})



router.put('/profile/password', jwtAuthMiddleware, async (req,res) => {
  try {

    // Get the userId using token
    const userId = req.user.id;
    const {currentPassword, newPassword} = req.body;    // Extraxt the current and new password from req.body

    // Find the user by user id
    const user = await User.findById(userId);

    // If user does not exist or old password does not match, return error
    if(!user || !(await user.comparePassword(currentPassword))){
      return res.status(401).json({error : 'Invalid current password'});
    }

    // Update password
    user.password = newPassword;
    await user.save();

    console.log('password updated');
    res.status(200).json({message : 'Password Updated'})
  } catch(err) {
    console.log(err);
    res.status(404).json({error : 'Internal server error'});
  }
})


module.exports = router;
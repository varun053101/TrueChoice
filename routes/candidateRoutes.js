const express = require('express');
const router = express.Router();
const User = require('./../models/user');
const {jwtAuthMiddleware, generateToken} = require('../jwt');
const Candidate = require('./../models/candidate');

const isAdmin = async (userId) => {
  try {
    const user = await User.findById(userId)
    if(user && user.role === 'admin'){
      return true;
    }
    return false;
  } catch(err){
    return false;
  }
}

//POST route to add a candidate
router.post('/', jwtAuthMiddleware, async (req,res) => {
  try{
    if(! await isAdmin(req.user.id || req.user._id)){
      return res.status(403).json({message : 'Access Denied'});
    }

    // Get the data
    const data = req.body;      // Because the bodyparser stores data in req.body

    // Create a New candidate document using the mongoose model
    const newCandidate = new Candidate(data);

    // Save new candidate to the database
    const response = await newCandidate.save();
    console.log('data saved');

    res.status(200).json({response : response});      // 200 is the https code for successful response
  }catch(err){
    console.log(err);
    res.status(500).json({error : 'Internal server error'});
  }
} )


// update the candidate
router.put('/:candidateId', jwtAuthMiddleware, async (req,res) => {
  try {

    if(! await isAdmin(req.user.id)){
      return res.status(404).json({message : 'Access Denied'});
    }

    // Get the candidate id
    const candidateId = req.params.id;

    // get the updation data from the req.body
    const updatedCandidateData = req.body;

    //Update the Candidate data
    const response = await Candidate.findByIdAndUpdate(candidateId, updatedCandidateData, {
      new : true,             // Return the updated data
      runValidators : true    // Run Mongoose Validation like unique, required etc
    })

    // If the Candidate id is invalid
    if(!response){
      return res.status(403).json({error : 'Candidate not found'})
    }

    console.log('Candidate data updated');
    res.status(200).json(response)
  } catch(err) {
    console.log(err);
    res.status(500).json({error : 'Internal server error'});
  }
})


// Delete the candidate
router.delete('/:candidateId', jwtAuthMiddleware, async (req,res) => {
  try {

    if(! await isAdmin(req.user.id)){
      return res.status(403).json({message : 'Access Denied'});
    }

    // Get the candidate id
    const candidateId = req.params.candidateId;


    //Update the Candidate data
    const response = await Candidate.findByIdAndDelete(candidateId)

    // If the Candidate id is invalid
    if(!response){
      return res.status(404).json({error : 'Candidate not found'})
    }

    console.log('Candidate Deleted');
    res.status(200).json(response)
  } catch(err) {
    console.log(err);
    res.status(500).json({error : 'Internal server error'});
  }
})

// Voting Logic

router.post('/vote/:candidateId', jwtAuthMiddleware, async (req, res) =>{
  // Admin cannot Vote
  // User can only vote once

  const candidateId = req.params.candidateId;
  const userId = req.user.id;

  try {

    // find the candidate using candidateId
    const candidate = await Candidate.findById(candidateId);
    if(!candidate){
      return res.status(404).json({message : 'Candidate not found'})
    }

    const user = await User.findById(userId);
    if(!user){
      return res.status(404).json({message : 'User not found'})
    }

    if(user.isVoted){
      return res.status(400).json({message : 'You have already voted'})
    }

    if(user.role == 'admin'){
      return res.status(403).json({message : 'Admin cannot vote'})
    }

    //Update the Candidate document to record the vote
    candidate.votes.push({user : userId})
    candidate.voteCount++;

    await candidate.save();

    //Update the user document
    user.isVoted = true;
    await user.save();

    res.status(200).json({message : 'Vote recorded succesfully'})

  } catch(err){
    console.log(err)
    res.status(500).json({error : 'Internal Server Error'})
  }
})

router.get('/vote/count', async (req, res) =>{
  try{
    
    //Find all candidates and sort them by vote count is descending order
    const candidate = await Candidate.find().sort({voteCount : 'desc'});

    // Map the Candidates to only return their name and votecounts
    const voteRecord = candidate.map((data) => {
      return {
        party : data.party,
        count : data.voteCount
      }
    })

    return res.status(200).json(voteRecord);

  }catch(err){
    console.log(err)
    res.status(500).json({error : 'Internal Server Error'})
  }
})

module.exports = router;
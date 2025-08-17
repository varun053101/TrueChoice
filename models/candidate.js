const mongoose = require('mongoose');
const { type } = require('os');
// const bcrypt = require('bcrypt');

// Define candidate schema
const candidateSchema = new mongoose.Schema({
    name : {
        type : String,
        required : true
    },

    party : {
        type : String,
        required : true
    },

    age : {
        type : Number,
        required : true
    },

    votes : [
        {
            user : {
                type : mongoose.Schema.Types.ObjectId,
                ref : 'User',
                required : true
            },

            votedAt : {
                type : Date,
                default : Date.now()
            }
        }
    ],

    voteCount : {
        type : Number,
        default : 0
    }

});


// Create Candidate Model

const Candidate = mongoose.model('Candidate', candidateSchema);
module.exports = Candidate;
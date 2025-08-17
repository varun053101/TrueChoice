const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

// Define user schema
const userSchema = new mongoose.Schema({
    name : {
        type : String,
        required : true
    },

    age : {
        type : Number,
        required : true
    },

    email : {
        type : String,
    },

    mobile : {
        type : String,
    },

    address : {
        type : String,
        required : true
    },

    aadharCardNumber : {
        type : Number,
        required : true,
        unique : true
    },

    password : {
        type : String,
        required : true
    },

    role : {
        type : String,
        enum : ['voter', 'admin'],
        default : 'voter'
    },

    isVoted : {
        type : Boolean,
        default : false
    }

});


// PreMiddleware call
userSchema.pre('save', async function(next){
    const user = this;

    // Hash the password only if it has been modified or its new record
    if(!user.isModified('password'))   return next();
    try{
        //Generate hash password(salting)
        const salt = await bcrypt.genSalt(10);

        // Hash the password
        const hashedPassword = await bcrypt.hash(user.password, salt);    // Both password and salt is stored inside the hashedPassword

        // Override the plain password with the hashed one
        user.password = hashedPassword;

        next();
    }catch(err){
        return next(err);
    }
});

userSchema.methods.comparePassword = async function(candidatePassword){
    try {
        // use bcrypt.compare() to compare the provided password with the hashed password
        const isMatch = await bcrypt.compare(candidatePassword, this.password);
        return isMatch;
    } catch(err) {
        throw err;
    }
}



// Create User Model

const User = mongoose.model('User', userSchema);
module.exports = User;
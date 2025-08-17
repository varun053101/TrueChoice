const jwt = require('jsonwebtoken');

const jwtAuthMiddleware = (req,res,next) => {

    // Check the request headers has authorization or not
    const authorization = req.headers.authorization;
    if(!authorization) return res.status(401).json({error : 'Token not found'});

    // Extract the jwt token fron the request header
    const token = req.headers.authorization.split(' ')[1];

    if(!token) return res.status(401).json({error : 'Unauthorized'});

    try {
        // Verify the JWT Token
        const decoded = jwt.verify(token, process.env.JWT_SECRET, {
          expiresIn: "7d",
        });

        // Attach user info to the request object
        req.user = decoded;                 // Give any name of your choice like req.EncodedData
        next();
    } catch(err){
        console.log(err);
        res.status(401).json({error : 'Invalid Token'});
    }
}

// Function to Generate Token

const generateToken = (userData) => {
    // Generate a new JWT using user data
    return jwt.sign(userData, process.env.JWT_SECRET);        // Added Expire time
}


module.exports = {jwtAuthMiddleware, generateToken};
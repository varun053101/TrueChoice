const express = require('express')
const app = express()
const db = require('./db')

const PORT = process.env.PORT || 3000;
app.use(express.json());     // stored in req.body
app.use(express.urlencoded({ extended: true }));

const userRoutes = require('./routes/VoterRoutes');
const adminRoutes = require('./routes/AdminRoutes');
app.use('/user', userRoutes);
app.use('/admin', adminRoutes);


// Global Error Handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});


app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}`)
})
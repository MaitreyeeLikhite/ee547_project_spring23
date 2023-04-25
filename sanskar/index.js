const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.set('views', __dirname + '/views');

// Set up body-parser middleware
app.use(bodyParser.urlencoded({ extended: true }));

// Set up static directory to serve index.html
app.use(express.static(path.join(__dirname, 'public')));

// Set up mongoose connection
mongoose.connect('mongodb://localhost:27017/mydb', { useNewUrlParser: true, useUnifiedTopology: true });
const db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));

// Define user schema and model
const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  phone: String
});

const User = mongoose.model('User', userSchema);

// Display all users on the /userslist page
app.get('/userslist', (req, res) => {
    User.find().then(users => {
      res.render('userslist', { users });
    }).catch(err => {
      console.error(err);
      res.status(500).send('Error fetching users');
    });
  });
// Serve the index.html file on the root URL
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '/views/index.html'));
});

// Set up POST endpoint to handle form submissions
app.post('/submit-form', (req, res) => {
  const { name, email, phone } = req.body;

  // Create a new user object
  const user = new User({ name, email, phone });

  // Save the user to the database
  user.save()
    .then(() => {
      console.log('User saved successfully');
      //res.send('User saved successfully');
      res.redirect('/userslist');
    })
    .catch(err => {
      console.error(err);
      res.status(500).send('Error saving user');
    });
});

// Start the server
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
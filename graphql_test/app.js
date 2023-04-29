const express = require('express');
const { graphqlHTTP } = require('express-graphql');
const { buildSchema } = require('graphql');
const mongoose = require('mongoose');
const ejs = require('ejs');

// Connect to MongoDB
mongoose.connect('mongodb://localhost/mydatabase', { useNewUrlParser: true, useUnifiedTopology: true });
const db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));

// Define the user schema
const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  phone: String,
  password: String,
});

const User = mongoose.model('User', userSchema);

// Define the GraphQL schema
const schema = buildSchema(`
  type User {
    id: ID
    name: String
    email: String
    phone: String
    password: String
  }

  type Query {
    getUser(id: ID!): User
  }

  type Mutation {
    addUser(name: String, email: String, phone: String, password: String): User
  }
`);

// Define the root resolver
const root = {
  getUser: ({ id }) => {
    return User.findById(id);
  },
  addUser: ({ name, email, phone, password }) => {
    const user = new User({ name, email, phone, password });
    return user.save();
  },
};

// Create an Express server
const app = express();
app.set('view engine', 'ejs');
const bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
// Serve the welcome page
app.get('/', (req, res) => {
  res.render('welcome');
});

// Serve the admin login page
app.get('/admin', (req, res) => {
  res.render('adminLogin');
});

// Handle admin login form submission
app.post('/admin', (req, res) => {
  const password = req.body.password;
  if (password === 'p') {
    res.redirect('/add-users');
  } else {
    res.redirect('/admin');
  }
});

// Serve the add users page
app.get('/add-users', (req, res) => {
  res.render('addUsers');
});

// Handle add users form submission

app.post('/add-users', (req, res) => {
    const { name, email, phone, password } = req.body;
    const user = new User({ name, email, phone, password });
    user.save()
      .then(() => {
        // Redirect to the details page after saving the user
        res.redirect('/details');
      })
      .catch((error) => {
        console.error(error);
        res.redirect('/add-users');
      });
  });
  
  

// Serve the welcome page (after logging out)
app.get('/logout', (req, res) => {
    res.render('logout');
  });
  
  // Handle logout
  app.post('/logout', (req, res) => {
    // Perform any necessary logout actions
    // For example, clearing session data or user authentication
  
    res.redirect('/');
  });
// Serve static files from the "public" directory
app.use(express.static('public'));
// Handle GET request to view user details
app.get('/details', (req, res) => {
    // Retrieve user details from the database
    User.find()
      .then((users) => {
        res.render('details', { users });
      })
      .catch((error) => {
        console.error(error);
        res.redirect('/add-users');
      });
  });
  
// Serve GraphQL API
app.use('/graphql', graphqlHTTP({
  schema: schema,
  rootValue: root,
  graphiql: true,
}));

// Start the server
app.listen(3000, () => {
  console.log('Server is running on port 3000');
});
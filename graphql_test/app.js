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
  data: [String],
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
    data: [String]
  }

  type Query {
    getUser(id: ID!): User
  }

  type Mutation {
    addUser(name: String, email: String, phone: String, password: String): User
    addUserData(userId: ID!, data: String!): User
  }
`);
const session = require('express-session');

// ...


// Define the root resolver
const root = {
  getUser: ({ id }) => {
    return User.findById(id);
  },
  addUser: ({ name, email, phone, password }) => {
    const user = new User({ name, email, phone, password });
    return user.save();
  },
  addUserData: ({ userId, data }) => {
    // Find the user by ID and update the data field with the provided data
    return User.findByIdAndUpdate(
      userId,
      { $push: { data: data } },
      { new: true }
    );
  }
};

// Create an Express server
const app = express();
app.set('view engine', 'ejs');
const bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
// Configure session middleware
app.use(session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: false
  }))
  function checkUserAuthentication(req, res, next) {
    if (req.session.user) {
      // User is authenticated, proceed to the next middleware or route handler
      next();
    } else {
      // User is not authenticated, redirect to the welcome page
      res.redirect('/');
    }
  }
const checkAdminAuthentication = (req, res, next) => {
    // Check if admin is authenticated (using session-based authentication)
    const isLoggedIn = req.session.adminLoggedIn;
  
    if (isLoggedIn) {
      // Admin is authenticated, proceed to the next middleware or route handler
      next();
    } else {
      // Admin is not authenticated, redirect to the welcome page
      res.redirect('/');
    }
  };
// Serve the welcome page
app.get('/', (req, res) => {
  res.render('welcome');
});

// Serve the admin login page
app.get('/admin', (req, res) => {
  res.render('adminLogin');
});


app.get('/add-users', checkAdminAuthentication, (req, res) => {
    res.render('addUsers');
  });
// Handle add users form submission
app.post('/admin', (req, res) => {
    const { password } = req.body;
  
    if (password === 'password') {
      // Set adminLoggedIn property in the session
      req.session.adminLoggedIn = true;
  
      res.redirect('/add-users');
    } else {
      res.redirect('/');
    }
  });
  
  // Handle admin logout
  app.get('/admin-logout', (req, res) => {
    // Unset adminLoggedIn property in the session
    req.session.adminLoggedIn = false;
  
    res.redirect('/');
  });
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
    req.session.adminLoggedIn = false;
    res.render('logout');
  });
app.get('/user-logout', (req, res) => {
    // Unset adminLoggedIn property in the session
  
    res.render('user-logout');
  });
  app.post('/user-logout', (req, res) => {
    // Perform any necessary logout actions
    res.redirect('/');
  });
  // Handle logout
  app.post('/logout', (req, res) => {
    // Perform any necessary logout actions
    // For example, clearing session data or user authentication
    req.session.adminLoggedIn = false;
    res.redirect('/');
  });
  
// Serve static files from the "public" directory
app.use(express.static('public'));

app.get('/details', checkAdminAuthentication, (req, res) => {
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
  app.post('/user-login', (req, res) => {
    const { email, password } = req.body;
  
    // Find the user in the MongoDB database
    User.findOne({ email, password })
      .then((user) => {
        if (user) {
          // User found, render the welcome page with user details
          req.session.user = user;
          res.render('welcomeUser', { user });
        } else {
          // User not found, redirect to the welcome page
          res.redirect('/');
        }
      })
      .catch((error) => {
        console.error(error);
        res.redirect('/');
      });
  });
  app.get('/user-login', (req, res) => {
    res.render('userLogin');
  });
  app.post('/user-data', checkUserAuthentication, (req, res) => {
    const { data } = req.body;
  
    // Find the user in the MongoDB database
    User.findOne({ email: req.session.user.email })
      .then((user) => {
        if (user) {
          // Update the user's data list
          user.data.push(data);
          return user.save();
        } else {
          throw new Error('User not found');
        }
      })
      .then(() => {
        // Set confirmation message
        req.session.confirmationMessage = 'Data has been updated';
  
        res.redirect('/welcomeUser');
      })
      .catch((error) => {
        console.error(error);
        res.redirect('/');
      });
  });
  app.get('/welcomeUser', checkUserAuthentication, (req, res) => {
    const confirmationMessage = req.session.confirmationMessage;
    // Clear the confirmation message from session
    req.session.confirmationMessage = '';
  
    res.render('welcomeUser', { user: req.session.user, confirmationMessage });
  });

  app.post('/user-authentication', async (req, res) => {
    const { email, password } = req.body;
  
    try {
      const user = await User.findOne({ email, password }).exec();
  
      if (!user) {
        console.error('User authentication failed');
        res.redirect('/');
      } else {
        req.session.user = user;
        res.render('welcomeUser', { user, confirmationMessage: null });
      }
    } catch (error) {
      console.error(error);
      res.redirect('/');
    }
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
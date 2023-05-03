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
  paymentHistory: {
    type: Object,
    of: Number,
    default: { 'commencement': 0.0 },
  },
});
function calculateBalance(paymentHistory) {
    let sum = 0;
    for (const key in paymentHistory) {
      sum += paymentHistory[key];
    }
    return sum;
  }
const User = mongoose.model('User', userSchema);
const eventSchema = new mongoose.Schema({
    eventName: {
      type: String,
      required: true,
    },
    eventDate: {
      type: Date,
      required: true,
    },
    startTime: {
      type: String,
      required: true,
    },
    endTime: {
      type: String,
      required: true,
    },
    userName: {
      type: String,
      required: true,
    },
    userEmail: {
      type: String,
      required: true,
    },
  });
  
  const Event = mongoose.model('Event', eventSchema);
  
  module.exports = Event;
  const prospectiveCustomerSchema = new mongoose.Schema({
    name: String,
    email: String,
    age: Number,
    gender: String,
    phoneNumber: Number,
    lookingFor: [String],
    dietaryPreferences: [String],
    drinks: [String],
    smoke: Boolean,
    origin: String,
    fieldOfStudy: String
  });
  
  const ProspectiveCustomer = mongoose.model('ProspectiveCustomer', prospectiveCustomerSchema);
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
app.get('/enterdetails', (req, res) => {
    res.render('enterdetails');
  });
app.post('/enterdetails', (req, res) => {
    const {
      name,
      email,
      age,
      gender,
      phoneNumber,
      lookingFor,
      dietaryPreferences,
      drinks,
      smoke,
      origin,
      fieldOfStudy
    } = req.body;
  
    const prospectiveCustomer = new ProspectiveCustomer({
      name,
      email,
      age,
      gender,
      phoneNumber,
      lookingFor,
      dietaryPreferences,
      drinks,
      smoke,
      origin,
      fieldOfStudy
    });
  
    prospectiveCustomer.save()
      .then(() => {
        res.render('enterdetails', { confirmationMessage: 'Thank you for sharing your details, we will contact you soon!' });
      })
      .catch((error) => {
        console.error(error);
        res.redirect('/');
      });
  });
// Serve the admin login page
app.get('/admin', (req, res) => {
  res.render('adminLogin');
});

app.post('/book-event', checkUserAuthentication, (req, res) => {
    const { eventName, eventDate, startTime, endTime } = req.body;
    const userName = req.session.user.name;
    const userEmail = req.session.user.email;
  
    // Check for overlapping events
    Event.findOne({
      eventDate,
      $or: [
        { startTime: { $lt: endTime, $gte: startTime } },
        { endTime: { $gt: startTime, $lte: endTime } },
        { startTime: { $lte: startTime }, endTime: { $gte: endTime } },
      ],
    })
      .then((event) => {
        if (event) {
          throw new Error('Overlap, choose another datetime');
        } else {
          // Create a new event
          return Event.create({ eventName, eventDate, startTime, endTime, userName, userEmail });
        }
      })
      .then(() => {
        req.session.confirmationMessage = 'Event successfully booked';
        res.redirect('/welcomeUser');
      })
      .catch((error) => {
        console.error(error);
        req.session.confirmationMessage = error.message;
        res.redirect('/welcomeUser');
      });
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
  // app.js

// ... (previous code)

// Routes
app.get('/eventslist', (req, res) => {
    // Retrieve all events from the MongoDB database
    Event.find()
      .then((events) => {
        // Render the eventslist.ejs view with the event data
        res.render('eventslist', { events });
      })
      .catch((error) => {
        console.error('Error retrieving events:', error);
        res.redirect('/');
      });
  });
  app.get('/eventslist2', (req, res) => {
    // Retrieve all events from the MongoDB database
    Event.find()
      .then((events) => {
        // Render the eventslist.ejs view with the event data
        res.render('eventslist2', { events });
      })
      .catch((error) => {
        console.error('Error retrieving events:', error);
        res.redirect('/');
      });
  });
  
  // Handle admin logout
  app.get('/admin-logout', (req, res) => {
    // Unset adminLoggedIn property in the session
    req.session.adminLoggedIn = false;
  
    res.redirect('/');
  });
  // app.js

// ... (previous code)

// Delete Event
app.post('/delete-event/:id', (req, res) => {
    const eventId = req.params.id;
  
    Event.findByIdAndDelete(eventId)
      .then(() => {
        res.redirect('/eventslist2');
      })
      .catch((err) => {
        console.error('Error deleting event:', err);
        res.redirect('/eventslist2');
      });
  });
  
  // ... (remaining code)
  
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
  app.get('/viewprospective', checkAdminAuthentication, (req, res) => {
    ProspectiveCustomer.find()
      .then((prospectiveCustomers) => {
        res.render('viewprospective', { prospectiveCustomers });
      })
      .catch((error) => {
        console.error('Error retrieving prospective customers:', error);
        res.redirect('/add-user');
      });
  });
  
  app.post('/add-data/:id', (req, res) => {
    const userId = req.params.id;
    const newData = "Admin Response: " + req.body.data;
    const currentDate = new Date().toLocaleString();
    const newDataWithTimestamp = `${currentDate}: ${newData}`;
    User.findByIdAndUpdate(userId, { $push: { data: newDataWithTimestamp } })
      .then(() => {
        res.redirect(`/specdetails/${userId}`);
      })
      .catch((err) => {
        console.error('Error adding data:', err);
        res.redirect('/details');
      });
  });
  app.get('/viewprospective2', checkUserAuthentication, (req, res) => {
    ProspectiveCustomer.find()
      .then((prospectiveCustomers) => {
        res.render('viewprospective', { prospectiveCustomers });
      })
      .catch((error) => {
        console.error('Error retrieving prospective customers:', error);
        res.redirect('/');
      });
  });
  app.post('/user-data', checkUserAuthentication, (req, res) => {
    const { data } = req.body;
    
    const newData = `User Maintenance Request - ${data}`;
    const currentDate = new Date().toLocaleString();
   const newDataWithTimestamp = `${currentDate}: ${newData}`;
    // Find the user in the MongoDB database
    User.findOne({ email: req.session.user.email })
      .then((user) => {
        if (user) {
          // Update the user's data list
          user.data.push(newDataWithTimestamp);
          return user.save();
        } else {
          throw new Error('User not found');
        }
      })
      .then((updatedUser) => {
        // Set confirmation message
        req.session.user = updatedUser;
        req.session.confirmationMessage = 'Data has been updated';
  
        res.redirect('/welcomeUser');
      })
      .catch((error) => {
        console.error(error);
        res.redirect('/');
      });
  });
  app.get('/recuser', checkUserAuthentication, (req, res) => {
    const balance = calculateBalance(req.session.user.paymentHistory);
    console.log(req.session.user.paymentHistory)
    res.render('recuser', { user: req.session.user, balance });
  });
  
  // Endpoint for recording a payment
  app.post('/record-payment', checkUserAuthentication, (req, res) => {
    const { paymentType, amount} = req.body;
    const { user } = req.session;
  
    // Add the new payment to the paymentHistory dictionary
    user.paymentHistory[paymentType] = parseFloat(amount);
  
    // Save the updated user document in the database
    User.findByIdAndUpdate(user._id, { paymentHistory: user.paymentHistory })
    .then(() => {
        res.redirect('/welcomeUser');
      })
      .catch((error) => {
        console.error('Error recording payment:', error);
        res.redirect('/welcomeUser');
      });
  });
  
  app.get('/welcomeUser', checkUserAuthentication, (req, res) => {
    const confirmationMessage = req.session.confirmationMessage;
    // Clear the confirmation message from session
    req.session.confirmationMessage = '';
  
    res.render('welcomeUser', { user: req.session.user, confirmationMessage});
  });
  app.get('/specdetails/:id', (req, res) => {
    const userId = req.params.id;
    User.findById(userId)
      .then((user) => {
        if (!user) {
          console.error('User not found');
          res.redirect('/details');
        } else {
          res.render('specdetails', { user });
        }
      })
      .catch((err) => {
        console.error('Error retrieving user details:', err);
        res.redirect('/details');
      });
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
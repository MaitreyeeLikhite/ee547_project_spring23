const express = require('express');
const { graphqlHTTP } = require('express-graphql');
const { buildSchema } = require('graphql');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const User = require('./models/user');

mongoose.connect('mongodb://localhost:27017/users', { useNewUrlParser: true });
mongoose.connection.once('open', () => {
  console.log('Connected to database');
});
const schema = buildSchema(`
  type User {
    id: ID!
    name: String!
    email: String!
    age: Int!
  }

  input UserInput {
    name: String!
    email: String!
    age: Int!
  }

  type Query {
    user(id: ID!): User
    users: [User!]!
  }

  type Mutation {
    createUser(input: UserInput!): User
    updateUser(id: ID!, input: UserInput!): User
    deleteUser(id: ID!): Boolean
  }
`);

const rootValue = {
  user: async ({ id }) => {
    const user = await User.findById(id);
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      age: user.age
    };
  },
  users: async () => {
    const users = await User.find({});
    return users.map(user => ({
      id: user.id,
      name: user.name,
      email: user.email,
      age: user.age
    }));
  },
  createUser: async ({ input }) => {
    const user = new User(input);
    await user.save();
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      age: user.age
    };
  },
  updateUser: async ({ id, input }) => {
    await User.findByIdAndUpdate(id, input);
    const user = await User.findById(id);
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      age: user.age
    };
  },
  deleteUser: async ({ id }) => {
    await User.findByIdAndRemove(id);
    return true;
  }
};

const app = express();

app.use(cors());
app.use(bodyParser.json());

app.use('/graphql', graphqlHTTP({
  schema,
  rootValue,
  graphiql: true
}));
app.set('view engine', 'ejs');

app.get('/userslist', async (req, res) => {
  const users = await User.find({});
  res.render('userslist', { users });
});

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html');
});

app.post('/', async (req, res) => {
  const user = new User(req.body);
  await user.save();
  res.redirect('/views/userslist');
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
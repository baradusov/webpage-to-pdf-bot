const url = require('url');
const MongoClient = require('mongodb').MongoClient;

// Create cached connection variable
let cachedDb = null;

// A function for connecting to MongoDB,
// taking a single parameter of the connection string
const connectToDatabase = async (uri) => {
  // If the database connection is cached,
  // use it instead of creating a new connection
  if (cachedDb) {
    return cachedDb;
  }

  // If no connection is cached, create a new one
  const client = await MongoClient.connect(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  // Select the database through the connection,
  // using the database path of the connection string
  const db = await client.db(url.parse(uri).pathname.substr(1));

  // Cache the database connection and return the connection
  cachedDb = db;
  return db;
};

const setupUser = async (id) => {
  const db = await connectToDatabase(process.env.MONGO_URL);
  const usersCollection = db.collection('users');
  const user = await usersCollection.findOne({ id: Number(id) });

  if (!user) {
    const result = await usersCollection.insertOne({
      id: Number(id),
      status: 'active',
      metrics: {
        total: 0,
      },
      createdAt: Date.now(),
      lastActivityAt: Date.now(),
    });

    return result.ops[0];
  }

  return user;
};

const updateUser = async (id) => {
  const db = await connectToDatabase(process.env.MONGO_URL);
  const usersCollection = db.collection('users');
  await setupUser(id);

  const update = {
    $inc: {
      'metrics.total': 1,
    },
    $set: {
      lastActivityAt: Date.now(),
    },
  };

  const result = await usersCollection.findOneAndUpdate(
    {
      id: Number(id),
    },
    update,
    { returnOriginal: false }
  );

  return result.value;
};

const canUseBot = async (id) => {
  return true;
};

const saveOrder = async (order) => {
  const db = await connectToDatabase(process.env.MONGO_URL);
  const ordersCollection = db.collection('orders');
  const userId = order['url_params[your_telegram_id]'];
  const result = await ordersCollection.insertOne({ userId, ...order });

  return result.ops[0];
};

module.exports = {
  setupUser,
  updateUser,
  canUseBot,
  saveOrder,
};

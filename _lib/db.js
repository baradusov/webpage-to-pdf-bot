import url from 'url';
import mongodb from 'mongodb';
const MongoClient = mongodb.MongoClient;

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

export const setupUser = async (id) => {
  const db = await connectToDatabase(process.env.MONGO_URL);
  const usersCollection = db.collection('users');
  const user = await usersCollection.findOne({ id: Number(id) });

  if (!user) {
    await usersCollection.insertOne({
      id: Number(id),
      status: 'active',
      metrics: {
        total: 0,
      },
      createdAt: Date.now(),
      lastActivityAt: Date.now(),
    });

    return;
  }

  return user;
};

export const updateUser = async (id) => {
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
    { returnDocument: false }
  );

  return result.value;
};

export const canUseBot = async (id) => {
  if (process.env.BOT_STATUS === 'disabled') {
    return false;
  }

  return true;
};

export const saveOrder = async (order) => {
  const db = await connectToDatabase(process.env.MONGO_URL);
  const ordersCollection = db.collection('orders');
  const userId = order['url_params[your_telegram_id]'];
  const result = await ordersCollection.insertOne({ userId, ...order });

  return result.ops[0];
};

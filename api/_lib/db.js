const url = require('url');
const { nanoid } = require('nanoid');
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
      dashboard: {
        active: false,
        url: nanoid(),
      },
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

const saveFile = async (message) => {
  const document = message.reply.document;
  const db = await connectToDatabase(process.env.MONGO_URL);
  const filesCollection = db.collection('files');

  const result = await filesCollection.insertOne({
    fileName: document.file_name,
    shortFilename: message.name,
    url: message.url,
    fileId: document.file_id,
    fileUniqueId: document.file_unique_id,
    fileSize: document.file_size,
    userId: message.reply.chat.id,
    createdAt: Date.now(),
  });

  return result.ops[0];
};

const hasDashboard = async (id) => {
  const user = await setupUser(id);
  return user.dashboard.active;
};

module.exports = {
  setupUser,
  updateUser,
  canUseBot,
  saveFile,
  saveOrder,
  hasDashboard,
};

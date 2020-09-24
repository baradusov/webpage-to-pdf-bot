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
  const client = await MongoClient.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });

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
  const user = await usersCollection.findOne({ Number(id) });

  if (!user) {
    const result = await usersCollection.insertOne({
      id: Number(id),
      pdf: { free: 50, paid: 0 },
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
  const user = await setupUser(id);
  const total = user.pdf.free + user.pdf.paid;

  if (total > 0) {
    const update = {
      $inc: {
        'pdf.free': user.pdf.paid > 0 ? 0 : -1,
        'pdf.paid': user.pdf.paid > 0 ? -1 : 0,
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
  }

  return false;
};

const canUseBot = async (id) => {
  const user = await setupUser(id);
  const total = user.pdf.free + user.pdf.paid;

  if (total <= 0) {
    return false;
  }

  return true;
};

const getLimits = async (id) => {
  const user = await setupUser(id);
  const total = user.pdf.free + user.pdf.paid;

  return {
    total,
    free: user.pdf.free,
    paid: user.pdf.paid,
  };
};

const addPaidPdfs = async (id) => {
  const db = await connectToDatabase(process.env.MONGO_URL);
  const usersCollection = db.collection('users');
  await setupUser(id);

  const result = await usersCollection.findOneAndUpdate(
    {
      id: Number(id),
    },
    {
      $inc: {
        'pdf.paid': 50,
      },
    },
    { returnOriginal: false }
  );

  return result;
};

module.exports = {
  setupUser,
  updateUser,
  canUseBot,
  getLimits,
  addPaidPdfs,
};

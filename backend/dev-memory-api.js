require('dotenv').config();

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const { connectToDatabase } = require('./db');
const { createApp } = require('./server');

const port = Number(process.env.AUTH_API_PORT || 4000);

let memoryServer;

async function main() {
  console.log('Starting in-memory MongoDB...');
  memoryServer = await MongoMemoryServer.create({
    instance: {
      dbName: 'vigilfit',
    },
  });

  process.env.MONGODB_URI = memoryServer.getUri('vigilfit');
  console.log(`Using in-memory URI: ${process.env.MONGODB_URI}`);

  const app = createApp();
  console.log('Connecting API to in-memory MongoDB...');
  await connectToDatabase();
  console.log('MongoDB connection established.');

  app.listen(port, () => {
    console.log(`VigilFit auth API (in-memory DB) listening on http://localhost:${port}`);
  });
}

async function shutdown() {
  await mongoose.disconnect().catch(() => {});
  if (memoryServer) {
    await memoryServer.stop().catch(() => {});
  }
}

process.on('SIGINT', async () => {
  await shutdown();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await shutdown();
  process.exit(0);
});

main().catch(async (error) => {
  console.error(error.message);
  await shutdown();
  process.exit(1);
});

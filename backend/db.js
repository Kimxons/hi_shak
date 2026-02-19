const mongoose = require('mongoose');

function redactMongoUri(uri) {
  if (!uri) {
    return '';
  }

  return uri.replace(/(mongodb(?:\+srv)?:\/\/[^:]+:)[^@]+@/i, '$1***@');
}

function validateMongoUri(rawUri) {
  const mongoUri = typeof rawUri === 'string' ? rawUri.trim() : '';

  if (!mongoUri) {
    throw new Error('MONGODB_URI is not set. Add it to your environment before starting the API.');
  }

  if (!mongoUri.startsWith('mongodb://') && !mongoUri.startsWith('mongodb+srv://')) {
    throw new Error('MONGODB_URI must start with "mongodb://" or "mongodb+srv://".');
  }

  if (mongoUri.includes('<db_password>')) {
    throw new Error(
      'MONGODB_URI still contains "<db_password>". Replace it with your real Atlas DB user password.'
    );
  }

  let parsed;
  try {
    parsed = new URL(mongoUri);
  } catch {
    throw new Error('MONGODB_URI is invalid. Verify URI format and URL-encode special password characters.');
  }

  const dbPath = parsed.pathname.replace(/^\/+/, '');
  if (!dbPath) {
    throw new Error(
      'MONGODB_URI is missing a database name. Add one after the host, for example "...mongodb.net/vigilfit?...".'
    );
  }

  return mongoUri;
}

function buildConnectionHelp(error) {
  if (error && error.name === 'MongooseServerSelectionError') {
    return 'Atlas server selection failed. Most often this is Network Access: whitelist your public IP (or temporarily allow 0.0.0.0/0), then verify cluster availability.';
  }

  const message = (error && error.message ? error.message : '').toLowerCase();

  if (message.includes('whitelist') || message.includes("isn't whitelisted") || message.includes('ip')) {
    return 'Atlas rejected your current IP. Add your public IP in Atlas Network Access (or temporarily allow 0.0.0.0/0 for development).';
  }

  if (message.includes('auth') || message.includes('authentication')) {
    return 'Authentication failed. Check DB username/password and URL-encode special characters in password.';
  }

  if (message.includes('timed out') || message.includes('server selection')) {
    return 'Server selection timed out. Check internet/VPN, Atlas IP access list, and cluster availability.';
  }

  if (message.includes('enotfound') || message.includes('querysrv')) {
    return 'DNS lookup failed for MongoDB Atlas host. Verify URI host and local DNS/network settings.';
  }

  if (message.includes('ssl') || message.includes('tls')) {
    return 'TLS/SSL connection failed. Verify system time and network middleware/firewall policies.';
  }

  return 'Verify MONGODB_URI, Atlas network access, and database user privileges.';
}

async function connectToDatabase() {
  const mongoUri = validateMongoUri(process.env.MONGODB_URI);

  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  try {
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 15000,
      maxPoolSize: 10,
    });
    return mongoose.connection;
  } catch (error) {
    const safeUri = redactMongoUri(mongoUri);
    const hint = buildConnectionHelp(error);
    throw new Error(`MongoDB connection failed for ${safeUri}. ${hint}`);
  }
}

module.exports = {
  connectToDatabase,
};

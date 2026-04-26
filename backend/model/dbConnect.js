const mongoose= require('mongoose')
const dotenv=require('dotenv')
dotenv.config();

let isDatabaseConnected = false;

const connectDB = async () => {
  if (!process.env.MONGODB_URL) {
    console.warn("MongoDB URL missing. Using local store fallback.");
    isDatabaseConnected = false;
    return;
  }

  try {
    await mongoose.connect(process.env.MONGODB_URL, {});
    isDatabaseConnected = true;
    console.log(`MongoDB Connected`);
  } catch (error) {
    isDatabaseConnected = false;
    console.warn(`MongoDB unavailable. Using local store fallback. ${error.message}`);
  }
}

const getDbStatus = () => isDatabaseConnected;

module.exports= connectDB;
module.exports.getDbStatus = getDbStatus;

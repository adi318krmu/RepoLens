const mongoose = require("mongoose");
const dotenv = require("dotenv");
dotenv.config();

const userControl = require("./controller/userControl");
const User = require("./model/userSchema");
const connectDB = require("./model/dbConnect");

async function verify() {
  await connectDB();

  const testEmail = "speedtest_" + Date.now() + "@example.com";

  const req1 = {
    body: {
      name: "Speed Test User",
      email: testEmail,
      password: "password123"
    }
  };

  let status1, data1;
  const res1 = {
    status: (code) => { status1 = code; return res1; },
    json: (data) => { data1 = data; return res1; }
  };

  console.log("1. Testing initial signup speed...");
  const t0 = Date.now();
  await userControl.signupUser(req1, res1);
  const elapsed1 = Date.now() - t0;

  console.log(`Initial signup completed in ${elapsed1} ms`);
  console.log("Status:", status1, "Data:", data1);

  if (status1 !== 201 || !data1.success) {
    console.error("FAIL: Initial signup failed!");
    process.exit(1);
  }

  // 2. Test re-signup for unverified email
  console.log("\n2. Testing re-signup with same unverified email...");
  const req2 = {
    body: {
      name: "Speed Test User Updated",
      email: testEmail,
      password: "newpassword123"
    }
  };

  let status2, data2;
  const res2 = {
    status: (code) => { status2 = code; return res2; },
    json: (data) => { data2 = data; return res2; }
  };

  const t1 = Date.now();
  await userControl.signupUser(req2, res2);
  const elapsed2 = Date.now() - t1;

  console.log(`Re-signup completed in ${elapsed2} ms`);
  console.log("Status:", status2, "Data:", data2);

  if (status2 !== 200 || !data2.success) {
    console.error("FAIL: Re-signup for unverified user failed!");
    process.exit(1);
  }

  // Clean up
  await User.deleteOne({ email: testEmail });
  console.log("\nSUCCESS: All speed and unverified re-signup tests passed!");
  await mongoose.disconnect();
  process.exit(0);
}

verify();

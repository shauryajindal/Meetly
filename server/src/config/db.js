import mongoose from "mongoose"

const connectDb = async () => {
  try {
    await mongoose.connect(process.env.MONGO_DB_URI)
    console.log("✅MONGODB CONNECTED!!!!!!!")
  } catch (err) {
    console.error(err)
    console.log("mongoDb Failed top connect")
    process.exit(1)
  }
}

export {connectDb}
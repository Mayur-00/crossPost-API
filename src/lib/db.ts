import prisma from "../config/prisma"


const connectDb = async () => {
  try {
    await prisma.$connect();
    console.log('✅ Database connected successfully');
  } catch (error) {
    console.error('❌ Database connection error:', error);
    process.exit(1);
  }
};

export default connectDb;

// Graceful shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});
import { app } from './app';
import connectDb from './lib/db';

connectDb()
  .then(() => {
    app.listen(process.env.PORT, () => {
      console.log(`✅ Server running on port ${process.env.PORT}`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  })
  .catch((err) => {
    console.error("❌ Couldn't start server:", err);
    process.exit(1);
  });

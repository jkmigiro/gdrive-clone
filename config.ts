import dotenv from "dotenv";

dotenv.config();

interface IConfig {
  port: number;
  nodeEnv: string;
  mongodbUri: string;
  // nextAuthUrl: string;
}

const config: IConfig = {
  port: Number(process.env.PORT) || 3000,
  nodeEnv: process.env.NODE_ENV || "dev",
  mongodbUri: process.env.MONGODB_URI as string,
  // nextAuthUrl: process.env.NEXTAUTH_URL as string,
};

export default config;

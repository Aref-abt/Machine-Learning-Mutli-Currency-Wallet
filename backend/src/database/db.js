import { Sequelize } from 'sequelize';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: join(__dirname, '../../ml_wallet.sqlite'),
  logging: false
});



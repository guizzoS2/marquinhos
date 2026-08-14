require('dotenv').config();

const express = require('express');
const cors = require('cors');
const routes = require('./routes');

const app = express();
const port = process.env.PORT || 3333;

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use('/api', routes);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.listen(port, () => {
  console.log(`Speakeasy API on http://localhost:${port}`);
});

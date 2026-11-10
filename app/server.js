const express = require('express');
const cors = require('cors');
const path = require('path');
const config = require('./config');

const app = express();
app.use(cors());                 // VULN-6 : CORS ouvert à toutes les origines
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/health', (req, res) => res.json({ status: 'ok' }));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/jobs', require('./routes/jobs'));
app.use('/api/applications', require('./routes/applications'));
app.use('/api/cv', require('./routes/cv'));
app.use('/api/admin', require('./routes/admin'));

// VULN-6 : mauvaise configuration. Les erreurs renvoient le message et la pile d'appels.
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: err.message, stack: err.stack });
});

app.listen(config.PORT, () => console.log(`JobBoard sur http://localhost:${config.PORT}`));

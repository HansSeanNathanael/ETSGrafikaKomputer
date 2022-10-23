const express = require('express');
const app = express();
const path = require('path');

app.use(express.static(__dirname));
app.use('/three/', express.static(path.join(__dirname, 'node_modules/three')));
app.use('/cannon-es/', express.static(path.join(__dirname, 'node_modules/cannon-es')));
app.use('/cannon-es-debugger/', express.static(path.join(__dirname, 'node_modules/cannon-es-debugger')));

const port = 3000;
const host = 'localhost';

app.listen(port, host, () => {
    console.log(`App berjalan pada http://${host}:${port}`);
});
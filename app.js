const express = require('express');
const app = express();
const path = require('path');

app.use(express.static(__dirname));
app.use('/three/', express.static(path.join(__dirname, 'node_modules/three')));
app.use('/cannon-es/', express.static(path.join(__dirname, 'node_modules/cannon-es')));
app.use('/cannon-es-debugger/', express.static(path.join(__dirname, 'node_modules/cannon-es-debugger')));

app.listen(3000);
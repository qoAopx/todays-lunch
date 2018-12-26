var express = require('express');
var morgan = require('morgan');
var compression = require('compression')
var app = express();

var user = process.env.USER;
var pass = process.env.PASS;

if (user && pass) {
    app.use(express.basicAuth(user, pass));
}

app.use(morgan(
    'combined', {
        immediate: true
    }));
app.use(compression({
    threshold: 0,
    level: 9,
    memLevel: 9
}));
app.use(express.static(__dirname + '/public'));
app.listen(process.env.PORT || 3000, function() {
    console.log('Server listening on port  %s', this.address().port);
});
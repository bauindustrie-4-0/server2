var http = require('http'),
    express = require('express'),
    sse = require('sse'),
    bodyParser = require('body-parser'),
    process = require("process"),
    app = express(),

    port = process.env.PORT ? process.env.PORT : 8000,
    docRoot = './public';

app.use(express.static('public'));
app.use(bodyParser.json());

let mappings = {
    "CA:90:6C:4D:1D:2D": [
        {
            "type": "warning",
            "content": "Kritisch: 47 °C"
        },
        {
            "type": "info",
            "content": "Spannung: 15V"
        },
        {
            "type": "driller",
            "content": "Reparatur notwendig"
        }
    ]/*,
    "zwei": [
        {
            "type": "info",
            "content": "Dies ist ein Haus."
        }
    ]*/
};

let visibleBeacons = [];
const clients = new Set();


const httpServer = http.createServer(app);

const sseServer = new sse(httpServer, {path: "/beaconinfo_stream"});

sseServer.on('connection', function (client) {
    clients.add(client);
    sendCurrentData(client);

    client.on('close', function () {
        clients.delete(client);
    })
});


// POST method route
app.post('/visible_beacons', function (req, res) {
    visibleBeacons = req.body;
    updateClients()

    res.json({"success": true})
})




function updateClients() {
    clients.forEach(client => {
        sendCurrentData(client)
    })
}

function sendCurrentData(client) {

    let data = visibleBeacons.filter(b => {
        return b.rssi > -50 && mappings[b.id] !== undefined
    }).map(b => {
        return {
            "beacon": b,
            "content": mappings[b.id]
        };
    })

    client.send(JSON.stringify(data))
}




app.get("/visible_beacons", (req, res) => {
    res.json(visibleBeacons);
})


// Für die Webseite
app.get("/beacons", (req, res) => {
    res.json(Object.keys(mappings));
})

app.get("/beacons/:id", (req, res, id) => {
    res.json(mappings[id]);
})


httpServer.listen(port);
console.log("Server is running!")

/*setInterval(() => {
    visibleBeacons = [{"id": "eins"}, {"id": "zwei"}]
    updateClients()
},8000)

setTimeout(() => {
    setInterval(() => {
        visibleBeacons = []
        updateClients();
    },8000)
}, 4000)*/
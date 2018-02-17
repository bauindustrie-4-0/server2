var http = require('http'),
    express = require('express'),
    sse = require('sse'),
    bodyParser = require('body-parser'),
    app = express(),

    port = process.argv[2] ? process.argv[2] : 8000,
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

    client.on('close', function () {
        clients.delete(client);
    })
});


// POST method route
app.post('/visible_beacons', function (req, res) {
    visibleBeacons = req.body;
    updateClients()

    res.send({"success": true})
})

function updateClients() {
    clients.forEach(c => {
        let data = visibleBeacons.filter(b => {
            return b.rssi > -50 && mappings[b.id] !== undefined
        }).map(b => {
            return {
                "beacon": b,
                "content": mappings[b.id]
            };
        })

        c.send(JSON.stringify(data))
    })
}


app.get("/visible_beacons", (req, res) => {
    return visibleBeacons;
})


// Für die Webseite
app.get("/beacons", (req, res) => {
    return Object.keys(mappings);
})

app.get("/beacons/:id", (req, res, id) => {
    return mappings[id];
})

httpServer.listen(port);


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
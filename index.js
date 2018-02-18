var http = require('http'),
    express = require('express'),
    sse = require('sse'),
    bodyParser = require('body-parser'),
    process = require("process"),
    cors = require('cors'),
    app = express(),

    port = process.env.PORT ? process.env.PORT : 8000,
    docRoot = './public';

app.use(cors());
app.use(express.static('public'));
app.use(bodyParser.json());

let mappings = {
    "CA:90:6C:4D:1D:2D": [
        /*{
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
        }*/
        {
            "type": "info",
            "content": "Der Dicke"
        }
    ],

    "EC:9E:89:92:3B:EC": [
        {
            "type": "info",
            "content": "Der Stein"
        }
    ],

    "EC:72:F8:E2:F9:87": [
        {
            "type": "info",
            "content": "Der Unbekannte"
        }
    ],

    "C9:43:D8:4E:15:23": [
        {
            "type": "info",
            "content": "Der Genervte"
        }
    ],
    "C5:55:49:46:AF:9B": [
        {
            "type": "info",
            "content": "Homer Simpson"
        }
    ]



    /*,
    "zwei": [
        {
            "type": "info",
            "content": "Dies ist ein Haus."
        }
    ]*/
};

let activeBeacons = new Map();
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

// Vergleicht zwei Sets anhand der ID-keys ihrer werte
function eqSet(as, bs) {
    if (as.size !== bs.size) return false;
    for (var a of as) {
        if (![...bs].some(el => el.id === a.id)) return false;
    }
    return true;
}

var min_rssi = -55;
var maxCounter = 3;


// POST method route
app.post('/visible_beacons', function (req, res) {

    let mapChanged = false;

    let visibleBeacons = new Map();
    for (let beacon of req.body) {
        if (beacon.rssi > min_rssi)
            visibleBeacons.set(beacon.id, beacon); //visibleBeacons.set("hahala", "uiuip"); //

    }

    for (const [key, value] of activeBeacons.entries()) {
        //check if beacon is still active
        if (!visibleBeacons.has(key)) {
            //beacon not active -> check and update counter
            if (value.counter === undefined)
                value.counter = 0;
            value.counter++;
            if (value.counter > maxCounter) {
                activeBeacons.delete(key);
                mapChanged = true;
            }
        }
    }

    for (const [key, value] of visibleBeacons.entries()) {
        if (mappings[key] !== undefined) {
            //this is a relevant Beacon -> update value
            value.counter = 0;
            if(!activeBeacons.has(key)) {
                mapChanged = true;
            }
            activeBeacons.set(key, value);
        }
    }

    if (mapChanged) {
        updateClients()
    }

    res.json({"success": true})
})


app.post('/maxCounter', function (req, res) {
    maxCounter = req.body;
    res.json({"success": true})
})

app.post('/minRssi', function (req, res) {
    min_rssi = req.body;
    res.json({"success": true})
})


function updateClients() {
    clients.forEach(client => {
        sendCurrentData(client)
    })
}

function sendCurrentData(client) {

    let data = Array.from(activeBeacons.values()).map(b => {
        return {
            "beacon": b,
            "content": mappings[b.id]
        };
    })

    client.send(JSON.stringify(data))
}


app.get("/visible_beacons", (req, res) => {
    res.json([...activeBeacons]);
})


// Für die Webseite
app.get("/beacons", (req, res) => {
    res.json(Object.keys(mappings));
})

app.get("/beacons/:id", (req, res, id) => {
    res.json(mappings[id]);
})

app.post("/warnings/new", (req, res, id) => {
    visibleBeacons.forEach(beacon => {
        if(mappings[beacon.id] === undefined) {
            mappings[beacon.id] = req.body;
        }
        else {
            if(mappings[beacon.id].filter(contentdata => contentdata === req.body) === undefined)
                mappings[beacon.id] = [...mappings[beacon.id], req.body];
        }
    })
})

app.get("/warnings", (req, res) => {
    res.json(mappings)
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

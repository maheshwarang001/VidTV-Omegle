import express from "express";
import http from "http";
import { WebSocketServer } from "ws";
import {v4 as uuidv4} from 'uuid';
import crypto from 'crypto';
import mongodbUpdate from "./db.mjs";
import cors from 'cors';

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const port = 5500;

app.use(cors());

app.get('/',(req,res)=>{
    res.send('successfull');
})


app.set('trust proxy', true);

// HTTP REQUEST FOR IP 

app.get('/get/ip', async (req, res) => {
    const remoteAddress = req.socket.remoteAddress;

    // Push to DB
    await mongodbUpdate(remoteAddress);

    const date = Date.now().toString();
    const unique = remoteAddress + date;

    const hashed = crypto.createHash('sha1').update(unique).digest('hex');
    res.send({ "remoteAddress": hashed });
});

// WEBSOCKET

//Map to store the connections (TAG -> HASHIP , CONNECTION ID)

let map = new Map();
let sockets = new Map();
let Room = new Map();



wss.on('connection', (ws, req) => {
    const urlParams = new URLSearchParams(req.url.split('?')[1]); // Extracting query parameter
    const ip = urlParams.get('ip'); 
    const topic = urlParams.get('topic'); 

    console.log(topic);


    if (ip === null || ip === "undefined" || topic === null || topic === "undefined") {
        console.log("ERROR" , "MISSING INPUTS");
        ws.close();
        return;
    }

   

    try {
        // TAG -> IP
        if (map.has(topic)) {
            const ipSet = map.get(topic);
            if (!ipSet.has(ip)) {
                console.log("set added", ip);
                ipSet.add(ip);
            } else {
                ws.close();
            }
        } else {
            // Handle the case where the topic is not in the map
            // You might want to create a new Set for the topic and add the IP
            const ipSet = new Set();
            ipSet.add(ip);
            map.set(topic, ipSet);
        }
        console.log(map.get(topic).size);

        // IP -> Websocket session
        if (sockets.has(ip)) {
            console.log("removed");
            sockets.delete(ip);
        }

        console.log("added socket");
        sockets.set(ip, ws);

        // Make the user wait until another user joins
        if (map.get(topic).size < 2) {
            console.log("size", map.get(topic).size)
            console.log("Waiting for another user to join...");
            
        }else{

        // Convert set into list without user IP
        let list = Array.from(map.get(topic)).filter(item => item !== ip);

        // Randomly pick any one user from the list and add it to the ROOM -> IP, IP
        let randomIndex = Math.floor(Math.random() * list.length);
        let randomElement = list[randomIndex];

        // Delete both from the MAP
        map.get(topic).delete(ip);
        map.get(topic).delete(randomElement);

        console.log(map.get(topic).size);
        if (map.get(topic).size === 0) map.delete(topic);

        // Add to the ROOM -> IP, IP
        let roomID = uuidv4();
        Room.set(roomID, new Set([ip, randomElement]));

        console.log(Room.get(roomID));

        let user = 0;
        // Notify users in the room
        for (let r of Room.get(roomID).values()) {
           
                let w = sockets.get(r);
                if (w) {

                    if(user == 0){
                        const data = {
                            "roomID" : roomID , 
                            "type" : "receiver",
                            "message": ""
                        }
                        w.send(JSON.stringify(data));
                        user++;

                    }else{
                        const data = {
                            "roomID" : roomID , 
                            "type" : "caller",
                            "message": ""
                        }
                        w.send(JSON.stringify(data));

                        user = 0;
                        break;
                        
                    }
                   
                }
            
        }
    }

    } catch (err) {
        console.log("error", err);
        ws.send(err); // Send error message to the WebSocket
    }

    console.log(`WebSocket connection from IP: ${ip}`);

    ws.on('message', (message) => {
        try {
            // Parse the message from JSON format
            const data = JSON.parse(message);
            
            // Retrieve the users in the room using the roomID
            const usersInRoom = Room.get(data.roomID);
    
                usersInRoom.forEach((user) => {
                    // Get the WebSocket connection for the user
                    const w = sockets.get(user);
    
                    // Check if the WebSocket connection exists
                    if (user !== ip && w) {
                        // Send the message to the user
                        w.send(JSON.stringify(data));
                    }
                });
            
        } catch (error) {
            console.error('Error parsing JSON message:', error);
            // Handle the error gracefully, such as disconnecting the user
            // For example, you could close the WebSocket connection for the user
            ws.close();
        }
    });
    

    ws.on('close', () => {
        console.log('WebSocket connection closed', ip);
       

       if(map.has(topic)){
        if (map.get(topic).size === 0) map.delete(topic);
       }

        sockets.delete(ip);
    });
});


server.listen(port, () => {
    console.log('Listening on port: ' + port);
});
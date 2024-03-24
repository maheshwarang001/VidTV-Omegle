
import { MongoClient } from "mongodb";

const DATABASE_URL = ''

export default async function mongodbUpdate(ipAddress) {
    console.log('DATABASE_URL:', DATABASE_URL); // Log the DATABASE_URL
    const client = new MongoClient(DATABASE_URL, { useNewUrlParser: true, useUnifiedTopology: true });
    
    try {
        await client.connect();
        const database = client.db('vidtv');

        const collection = database.collection('track');

        if (ipAddress === "::1") {
            ipAddress = "127.0.0.1";
        }
        
        const currentDate = new Date();
        const filter = { ip: ipAddress };
        const updateDoc = {
            $inc: { count: 1 },
            $set: { lastVisit: currentDate }
        };
        const options = { upsert: true, returnOriginal: false };

        const result = await collection.findOneAndUpdate(filter, updateDoc, options);

        if (result === null) {
            // If result is null, no matching document was found
            // Insert a new document only if it hasn't been inserted already
            if (!insertedOnce) {
                console.log('No matching document found, inserting new document');
                const newTrack = await collection.insertOne({ ip: ipAddress, count: 1, created: currentDate, lastVisit: currentDate });
                console.log('New document inserted:', newTrack.ops[0]);
                insertedOnce = true; // Set flag to true after insertion
            }
        } else {
            // If result is not null, a document was found and updated
            const track = result.value;
            console.log('Track updated:', track);
        }
    } catch (error) {
        console.error('Error updating track:', error);
    } finally {
        await client.close();
    }
}

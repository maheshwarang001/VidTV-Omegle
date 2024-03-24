class Peer {
    static callbackCalled = false;

    constructor() {
        this.peer = new RTCPeerConnection({
            iceServers: [{
                urls: [
                    "stun:stun.l.google.com:19302",
                    "stun:global.stun.twilio.com:3478"
                ]
            }]
        });

        this.remoteStream = new MediaStream();

        // Create a data channel for text communication
        this.dataChannel = this.peer.createDataChannel("dataChannel");
        this.dataChannel.onopen = this.handleDataChannelOpen.bind(this);
        this.dataChannel.onmessage = this.handleDataChannelMessage.bind(this);

        this.peer.ontrack = (event) => {
            event.streams.forEach((stream) => {
                stream.getTracks().forEach((track) => {
                    this.remoteStream.addTrack(track);
                });
            });
        };

        this.peer.ondatachannel = this.handleDataChannel.bind(this);
        this.peer.onicecandidate = this.handleIceCandidate.bind(this);
       
        this.iceCandidateQueue = [];
    }

    handleDataChannelOpen(event) {
        console.log("Data channel opened.");
    }

    handleDataChannelMessage(event) {
        console.log("Data channel message received:", event.data);
        // Handle the received message
    }

    async getRemoteStream() {
        try {
            if (!this.peer) {
                throw new Error("Peer connection is not available.");
            }

            return this.remoteStream;
        } catch (error) {
            console.error("Error getting remote stream:", error);
            return null;
        }
    }

    async addIceCandidate(candidate) {
        try {
            if (!this.peer) {
                throw new Error("Peer connection is not available.");
            }

            await this.peer.addIceCandidate(candidate);
            console.log("ICE candidate added:", candidate);
        } catch (error) {
            console.error("Error adding ICE candidate:", error);
        }
    }

    async getAnswer(offer, stream) {
        try {
            if (!this.peer) {
                throw new Error("Peer connection is not available.");
            }

            // Set remote description
            await this.peer.setRemoteDescription(new RTCSessionDescription(offer));

            // Add the stream to the peer connection
            stream.getTracks().forEach(track => {
                this.peer.addTrack(track, stream);
            });

            // Create answer
            const answer = await this.peer.createAnswer();

            // Set local description
            await this.peer.setLocalDescription(answer);

            // Call the callback if it hasn't been called yet
            if (!Peer.callbackCalled) {
                Peer.callbackCalled = true;
                // Call your callback function here
            }

            return answer;
        } catch (error) {
            console.error("Error getting answer:", error);
            return null;
        }
    }

    async setLocalDescription(ans) {
        try {
            if (!this.peer) {
                throw new Error("Peer connection is not available.");
            }

            // Set local description
            await this.peer.setLocalDescription(new RTCSessionDescription(ans));

            // Call the callback if it hasn't been called yet
            if (!Peer.callbackCalled) {
                Peer.callbackCalled = true;
                // Call your callback function here
            }
        } catch (error) {
            console.error("Error setting local description:", error);
        }
    }

    async setRemoteDescription(peer) {
        try {
            console.log("setRemoteDescription...");
            await this.peer.setRemoteDescription(peer);

            console.log("info", this.peer.remoteDescription);
        } catch (error) {
            console.error("Error setting remote description:", error);
        }
    }

    async createOffer(stream) {
        try {
            console.log("here");

            if (this.offer) {
                console.log(this.offer);
                return this.offer;
            }

            // Add the stream's tracks to the peer connection
            stream.getTracks().forEach(track => {
                this.peer.addTrack(track, stream);
            });

            const offer = await this.peer.createOffer();
            await this.peer.setLocalDescription(new RTCSessionDescription(offer));
            console.log(offer);
            return offer;
        } catch (error) {
            console.error("Error creating offer:", error);
            return null;
        }
    }

    handleIceConnectionStateChange(event) {
        console.log("ICE connection state change:", this.peer.iceConnectionState);
        if (this.peer.iceConnectionState === "disconnected" || this.peer.iceConnectionState === "closed") {
            // Peer has exited or disconnected
            console.log("Peer has exited or disconnected.");
            // Trigger appropriate actions here
        }
    }

    close() {
        try {
            // Close the peer connection
            if (this.peer) {
                this.peer.close();
                console.log("Peer connection closed.");
            }

            // Close the data channel
            if (this.dataChannel) {
                this.dataChannel.close();
                console.log("Data channel closed.");
            }

            // Clean up any associated resources
            this.remoteStream = null;
            this.peer = null;
            this.dataChannel = null;
            this.iceCandidateQueue = [];

            console.log("Peer and associated resources cleaned up.");
        } catch (error) {
            console.error("Error closing peer:", error);
        }
    }
    sendData(data) {
        try {
            if (!this.dataChannel) {
                throw new Error("Data channel is not available.");
            }

            this.dataChannel.send(data);
            console.log("Data sent:", data);
        } catch (error) {
            console.error("Error sending data:", error);
        }
    }

    handleDataChannel(event) {
        console.log('Received data channel:', event.channel);
        // Handle the received data channel for text communication
        this.dataChannel = event.channel;
        this.dataChannel.onmessage = this.handleDataChannelMessage.bind(this);
    }

    handleIceCandidate(event) {
        if (event.candidate) {
            console.log("ICE candidate:", event.candidate);
            this.iceCandidateQueue.push(event.candidate);
            // Add the ICE candidate to the queue
        }
    }

    getIceCandidates() {
        console.log(this.iceCandidateQueue.length);
        return this.iceCandidateQueue;
    }
}

export default new Peer();
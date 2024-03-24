import React, { useEffect, useState, useRef, useCallback } from "react";
import ReactPlayer from "react-player";
import { useSocket } from "../socket/SocketContext";
import Peer from "../service/Peer";

const Room = () => {
    const [localStream, setLocalStream] = useState(null);
    const [remoteStream, setRemoteStream] = useState(null);
    const [hasVideoAccess, setHasVideoAccess] = useState(false);
    const containerRef = useRef(null);
    const [containerWidth, setContainerWidth] = useState(0);
    const [containerHeight, setContainerHeight] = useState(0);
    const socket = useSocket();

//    useEffect (()=> {
//         if (remoteStream != null && localStream != null) {
//             if (socket) {
//                 socket.close();
//                 console.log("close ws");
//             }
//         }
//     });

    const getMediaStream = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: true,
                video: true
            });
            setLocalStream(stream);
            setHasVideoAccess(true);
        } catch (error) {
            console.error("Error accessing video:", error);
        }
    }, []);

    useEffect(() => {
        getMediaStream();
        document.documentElement.style.overflow = 'hidden';
        return () => {
            document.documentElement.style.overflow = 'unset';
        };
    }, []);

    useEffect(() => {
        const updateContainerSize = () => {
            if (containerRef.current) {
                setContainerWidth(containerRef.current.offsetWidth);
                setContainerHeight(containerRef.current.offsetHeight);
            }
        };
        updateContainerSize();
        window.addEventListener("resize", updateContainerSize);
        return () => window.removeEventListener("resize", updateContainerSize);
    }, [containerRef]);

    const handleSocketMessage = useCallback(async(data) => {
        if (localStream === null) {
            console.log(false);
        }

        switch (data.type) {
            case "caller":
                console.log("caller", data);
                const stream = await navigator.mediaDevices.getUserMedia({
                    audio: true,
                    video: true
                });
                const offer = await Peer.createOffer(stream);
                const offerMessage = JSON.stringify(offer);
                const offerOutput = {
                    roomID: data.roomID,
                    type: "offer",
                    message: offerMessage
                };
                socket.send(JSON.stringify(offerOutput));
                console.log(stream);
                break;
            case "receiver":
                console.log("receiver", data);
                // Handle receiver logic
                break;
            case "offer":
                console.log("Offer Received", data);
                if (!data.message) {
                    return socket.close();
                }
                const offerParse = JSON.parse(data.message);
                const streamedia = await navigator.mediaDevices.getUserMedia({
                    audio: true,
                    video: true
                });
                const answer = await Peer.getAnswer(offerParse, streamedia);
                const answerMessage = JSON.stringify(answer);
                const answerOutput = {
                    roomID: data.roomID,
                    type: "answer",
                    message: answerMessage
                };
                console.log("offer",answerOutput);
                socket.send(JSON.stringify(answerOutput));


                //After Answer Send ICE

                await new Promise((resolve, reject) => {
                    const timeout = setTimeout(() => {
                        reject(new Error("ICE candidates not available after timeout"));
                    }, 8000);
                    const checkIceCandidates = setInterval(() => {
                        const ice = Peer.getIceCandidates();
                        console.log("PEER ICEEEE", ice);
                        const iceData = {
                            "roomID" : data.roomID,
                            "type": "candidate",
                            "message": ice
                        };
                        socket.send(JSON.stringify(iceData));
                        if (ice.length > 0) {
                            clearInterval(checkIceCandidates);
                            clearTimeout(timeout);
                            resolve();
                        }
                    }, 100);
                });

                break;
                case "answer":
                    console.log("Answer Received", data);
                    
                    try {
                        const answerParse = JSON.parse(data.message);
                        // Handle answer logic
                        await Peer.setRemoteDescription(answerParse);
                
                        await new Promise((resolve, reject) => {
                            const timeout = setTimeout(() => {
                                reject(new Error("ICE candidates not available after timeout"));
                                clearInterval(checkIceCandidates);
                            }, 20000);
                            const checkIceCandidates = setInterval(() => {
                                const ice = Peer.getIceCandidates();
                                console.log("PEER ICEEEE", ice);
                                const iceData = {
                                    "roomID": data.roomID,
                                    "type": "candidate",
                                    "message": ice
                                };
                                socket.send(JSON.stringify(iceData));
                                if (ice.length > 0) {
                                    clearInterval(checkIceCandidates);
                                    clearTimeout(timeout);
                                    resolve();
                                }
                            }, 100);
                        });
                    } catch (error) {
                        console.error("Error processing answer:", error);
                        socket.close();
                    }
                    break;
                

            case "candidate":
                console.log("Received ICE candidate:", data.message);

                if(data.message === null){
                    socket.close();
                }

                if (data.message) {

                    data.message.forEach(candidate => {
                        Peer.addIceCandidate(candidate);
                    });

                    const subscribeToRemoteStream = async () => {
                        try {
                           
                            const remoteStream = await Peer.getRemoteStream();
                            console.log(remoteStream);
                            setRemoteStream(remoteStream);
                        } catch (error) {
                            console.error('Error subscribing to remote stream:', error);
                        }
                    };
            
                    subscribeToRemoteStream();
                    
                } else {
                    console.log("No ICE candidates found in the message.");
                }
                break;
                break
            default:
                console.log("Unhandled message type:", data);
        }
        
    }, [localStream]);

    useEffect(() => {

        getMediaStream();
    
        const handleMessage = (event) => {
            const data = JSON.parse(event.data);
            console.log("handleSocketMessage", data);
            handleSocketMessage(data);
        };
        if (socket) {
            socket.onmessage = handleMessage;
        } else {
            console.log("Socket missing.");
        }
        return () => {
            if (socket) {
                socket.onmessage = null;
                socket.onerror = null;
            }
        };
    }, [socket]);

    useEffect(() => {
        // Add event listener for ICE connection state change
        if (Peer.peer) {
            Peer.peer.oniceconnectionstatechange = handleIceConnectionStateChange;
        }

        // Cleanup function
        return () => {
            if (Peer.peer) {
                Peer.peer.oniceconnectionstatechange = null;
            }
        };
    }, []);

    const handleIceConnectionStateChange = () => {
        if (Peer.peer) {
            console.log("ICE connection state:", Peer.peer.iceConnectionState);
            if (Peer.peer.iceConnectionState === "disconnected" || Peer.peer.iceConnectionState === "failed") {
                // Peer has exited or disconnected
                console.log("Peer has exited or disconnected.");
                setRemoteStream(null); // Update remoteStream state to reflect disconnection
            }
        }
    };


    
    // useEffect(() => {
    //     handleCloseSocket();
    // }, [remoteStream]);

    const handleStartButtonClick = () => {
        // Implement start button action
        window.location.reload();
    };

    const handleStopButtonClick = () => {
        // Disconnect from WebRTC
        Peer.close();
    
        // Close the socket connection
        if (socket) {
            socket.close();
        }
     };


    return (
        <div className="w-screen h-screen bg-black">
            <div className="h-full w-full" ref={containerRef}>
                <div className="h-full w-full flex justify-center items-center">
                    <div className="w-full lg:w-1/2 h-full">
                        <ReactPlayer
                            className='rounded-lg w-full h-full'
                            playing
                            height={containerHeight * 0.75}
                            width="100%"
                            muted
                            style={{ objectFit: 'cover' }}
                            url={localStream}
                        />
                        <div className="h-[200px] w-full flex flex-row justify-start items-start gap-5 mt-2">
                            <button className="h-[200px] w-[200px] bg-[#b91c1c] shadow-xl rounded-3xl" onClick={handleStartButtonClick}>
                                <span className="text-5xl font-serif text-white">Next</span>
                            </button>
                            <button className="h-[200px] w-[200px] bg-white shadow-xl rounded-3xl" onClick={handleStopButtonClick}>
                                <span className="text-5xl font-serif text-black">Stop</span>
                            </button>
                        </div>
                    </div>
                    <div className="w-full lg:w-1/2 h-full">
                        <ReactPlayer
                            className='rounded-lg w-full h-full'
                            playing
                            height={containerHeight * 0.75}
                            width="100%"
                            style={{ objectFit: 'cover' }}
                            url={remoteStream}
                        />
                        <div className="h-[200px] w-full flex flex-col justify-center items-center  mt-5 lg:mt-2">
                            <div className="rounded-xl h-[80%] w-full bg-white mb-2 lg:mb-0"></div>
                            <input className="mt-5 rounded-xl w-full h-full p-5 border border-blue" placeholder="type.." />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Room;

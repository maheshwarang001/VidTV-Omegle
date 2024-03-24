import React, { useState, useEffect } from 'react';
import ReactPlayer from "react-player";
import { Checkbox, Input } from "@material-tailwind/react";
import getIP from '../service/api';
import Cookies from 'js-cookie';
import { useNavigate } from "react-router-dom";

const Home = () => {
    const [localStream, setLocalStream] = useState(null);
    const [isChecked, setIsChecked] = useState(false);
    const [tag, setTag] = useState("");
    const navigate = useNavigate();

    useEffect(() => {
        const ip = async () => {
            try {
                let ipKeyVal = Cookies.get('cookie-ip');
                if (!ipKeyVal) {
                    const ipKeyResponse = await getIP();
                    ipKeyVal = ipKeyResponse.remoteAddress;
                    Cookies.set('cookie-ip', ipKeyVal, { expires: 2 });
                }
            } catch (err) {
                alert('Something went wrong. Please try again later.');
            }
        };

        ip();

        const getMediaStream = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    audio: true,
                    video: true
                });
                setLocalStream(stream);
            } catch (error) {
                console.error('Error accessing media devices:', error);
            }
        };

        getMediaStream();

        document.documentElement.style.overflow = 'hidden';

        return () => {
          document.documentElement.style.overflow = 'unset';
        };
    }, []);

    const handleCheckboxChange = () => {
        setIsChecked(!isChecked);
    };

    const handleTagChange = (e) => {
        let str = e.target.value.trim().toLowerCase();
        setTag(str);
    };

    const handleClick = () => {
        if (isChecked && tag !== '') {
            Cookies.set('cookie-topic', tag);
            navigate("/room");
        }
    }

    return (
        <div className='w-screen h-screen flex flex-col'>
            <div className='w-full h-[100px] bg-black flex justify-center items-center mx-auto px-10 shadow-lg'>
                <div className='h-auto w-auto text-6xl font-serif font-bold font-italic text-[#dc2626]'>
                    VidTV
                </div>
            </div>

            <div className='flex-1 flex flex-row bg-black'>
                <ReactPlayer
                    className='rounded-lg flex-1 mx-auto my-auto'
                    playing
                    muted
                    height={550}
                    width={1900}
                    style={{ objectFit: 'cover'}}
                    url={localStream}
                />

                <div className="max-w-[750px] mx-auto flex flex-col justify-center items-center">
                    <div className='w-full flex flex-col justify-between my-auto rounded-xl shadow-lg bg-[#f5f5f5] p-10'>
                        <div className='flex flex-col'>
                            <ul className="list-none">
                                <li className='flex items-center'>
                                    <Checkbox
                                        className='mr-2 w-[20px] h-[20px]'
                                        checked={isChecked}
                                        onChange={handleCheckboxChange}
                                    />
                                    <span className='font-serif text-3xl'>As a user, I want to...</span>
                                </li>
                                
                                <li className='font-serif mt-2 ms-10 text-sm'>- Meet new friends on the internet.</li>
                                <li className='font-serif ms-10 text-sm'>- Share my webcam footage.</li>
                                <li className='font-serif ms-10 text-sm'>- Report users that are behaving inappropriately.</li>
                                <li className='font-serif ms-10 text-sm'>- Be polite, and do not insult your interlocutors.</li>
                                <li className='font-serif ms-10 text-sm'>- Do not perform any actions, which may be considered obscene.</li>
                            </ul>
                        </div>

                        <div className='flex flex-col justify-top items-start mt-10'>
                            <Input
                                placeholder="tag"
                                className='border border-black rounded-md p-2 h-10'
                                value={tag}
                                onChange={handleTagChange}
                            />
                            <button
                                className={`w-full md:w-[200px] h-20 text-lg bg-[#b91c1c] text-white text-lg px-6 py-3 rounded-lg shadow-lg mt-5 ${(isChecked && tag !== '') ? 'hover:bg-gray-900' : ''}`}
                                disabled={!isChecked || tag === ''}
                                onClick={handleClick}
                            >
                                Start
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Home;

import React from 'react';
import { Routes, Route, BrowserRouter } from 'react-router-dom';
import Home from './pages/Home';
import Room from './pages/Room';
import { SocketProvider } from './socket/SocketContext';
import Cookies from 'js-cookie';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/room" element={<LobbyWithSocket />} />
      </Routes>
    </BrowserRouter>
  );
}

function LobbyWithSocket() {
  let ipKeyval = Cookies.get('cookie-ip');
  let topic = Cookies.get('cookie-topic');

  console.log("Route-key", ipKeyval);
  console.log("Route-Topic", topic);

  if (ipKeyval == "undefined" || ipKeyval == null || topic == "undefined" || topic == null || topic == '') {
    return <Home />;
  }

  return (
    <SocketProvider ipKey={ipKeyval} topic_talk ={topic}>
      <Room />
    </SocketProvider>
  );
}

export default App;

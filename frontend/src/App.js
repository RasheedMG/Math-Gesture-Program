import logo from './logo.svg';
import './App.css';
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import Thumbs from "./pages/Thumbs";
import Numbers from "./pages/Numbers"; // If you have a Numbers page

const btnStyle = {
  display:"block", margin:"10px 0", padding:"12px 16px",
  borderRadius:10, background:"#242424", color:"#fff",
  textDecoration:"none", textAlign:"center"
};

function App() {
  return (
   <BrowserRouter>
      <div style={{minHeight:"100vh",display:"grid",placeItems:"center",background:"#0b0b0b",color:"#fff"}}>
        <Routes>
          <Route
            path="/"
            element={
              <div style={{background:"#161616",padding:24,borderRadius:14,boxShadow:"0 10px 30px rgba(0,0,0,.35)",width:320}}>
                <h1 style={{marginTop:0}}>MediaPipe Demo</h1>
                <Link to="/thumbs" style={btnStyle}>Thumbs Up/Down</Link>
                <Link to="/numbers" style={btnStyle}>Numbers (0–10)</Link>
              </div>
            }
          />
          <Route path="/thumbs" element={<Thumbs />} />
          <Route path="/numbers" element={<Numbers />} /> {/* If exists */}
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;

import { Link } from "react-router-dom";
import '../css/Login.css';

function About() {
  return (
    <div className="about-container">
      <h1>About Page</h1>
      <p>This is another page in the Electron + React app.</p>
      <Link to="/" className="link">
        Go Back Home
      </Link>
    </div>
  );
}

export default About;

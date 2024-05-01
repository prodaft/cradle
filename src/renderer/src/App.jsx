import { useState , useEffect } from 'react'
import axios from 'axios';


function App() {
  const [count, setCount] = useState(null)

  const fetchNumber = async () => {
    try {
      const response = await axios.get('http://localhost:3010/counter');
      setCount(response.data.count);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const updateNumber = async () => {
    try {
      const response = await axios.post('http://localhost:3010/increment',  count + 1);
      setCount(response.data.count);
    } catch (error) {
      console.error('Error creating data:', error);
    }
  }

  useEffect(() => {
    fetchNumber();
  }, []);

  return (
    <>
      <h1>Counter</h1>
      <div className="card">
        <button onClick={updateNumber}>
          count is {count}
        </button>
      </div>
    </>
  )
}

export default App

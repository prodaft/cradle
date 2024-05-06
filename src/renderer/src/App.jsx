import { useState , useEffect } from 'react'
import { fetchNumber, updateNumber } from './services/apiService.js'


function App() {
  const [count, setCount] = useState(null)

  const fetchCount = async () => {
      try {
          const response = await fetchNumber();
          setCount(response)
      } catch (error) {
          console.error('Error fetching data: ', error.request);
      }
  };


const increaseCount = async () => {
    try {
        await updateNumber()
        fetchCount();
    } catch (error) {
        console.error('Error creating data: ', error);
    }
}; 
  
  useEffect(() => {
    fetchCount();
  }, []);

  return (
    <>
      <h1>Counter</h1>
      <div>
        <button onClick={increaseCount}>
          count is {count}
        </button>
      </div>
    </>
  )
}

export default App

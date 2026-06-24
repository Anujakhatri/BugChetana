import { useState } from 'react'
import reactLogo from './assets/react.svg'

import './App.css'
import Homepage from './components/HomePage'

function App() {
  const [count, setCount] = useState(0)

  return (
    <>
      <Homepage />
    </>
  )
}

export default App
